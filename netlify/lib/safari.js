// Shared helpers for the booking functions.
// Lives outside netlify/functions so Netlify doesn't deploy it as an endpoint.
// Prices live in the database (safari_zones, transfer_rates) and are always
// recalculated here — totals sent by the browser are display-only.
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { toWhatsAppNumber } = require('./whatsapp');
const { notifySafari } = require('./notify');

// 'request' (default): guests submit a booking request and pay later through a payment link the admin
// sends. 'instant': guests pay online at booking time and are confirmed automatically.
// Switch with the BOOKING_MODE environment variable in Netlify.
function bookingMode() {
  return process.env.BOOKING_MODE === 'instant' ? 'instant' : 'request';
}

function supabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
}

async function razorpay(path, body) {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const res = await fetch('https://api.razorpay.com/v1' + path, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: 'Basic ' + auth, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data.error && data.error.description) || 'Razorpay request failed');
  return data;
}

function hmacMatches(payload, secret, signature) {
  if (typeof signature !== 'string' || typeof secret !== 'string' || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    body: JSON.stringify(body)
  };
}

// Thrown for bad input; handlers turn it into a 400 with this message.
class InputError extends Error {}

function parseBody(event) {
  if ((event.body || '').length > 200000) throw new InputError('Request too large');
  try {
    return JSON.parse(event.body || '{}');
  } catch {
    throw new InputError('Invalid JSON body');
  }
}

function text(v, max) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function int(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : NaN;
}

const todayIST = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

// A booking date: YYYY-MM-DD, from tomorrow (IST) up to a year ahead.
function futureDate(v, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v || '') || isNaN(new Date(v + 'T12:00:00Z'))) throw new InputError(`Invalid ${label}`);
  if (v <= todayIST()) throw new InputError(`Please choose a ${label} from tomorrow onwards`);
  const maxDate = new Date(Date.now() + 366 * 86400 * 1000).toISOString().slice(0, 10);
  if (v > maxDate) throw new InputError(`${label[0].toUpperCase() + label.slice(1)} must be within the next year`);
  return v;
}

// { name, phone } from the booking form, validated and normalised.
function parseContact(c) {
  c = c || {};
  const name = text(c.name, 100);
  const phone = toWhatsAppNumber(c.phone);
  if (!name) throw new InputError('Please enter your name');
  if (!phone) throw new InputError('Please enter a valid mobile number');
  // Optional business details (B2B guests who want a GST invoice).
  const business_name = text(c.business, 150) || null;
  const gst_number = text(c.gst, 20).replace(/\s+/g, '').toUpperCase() || null;
  if (gst_number && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gst_number)) throw new InputError('Please enter a valid 15-character GST number, or leave it empty');
  if (gst_number && !business_name) throw new InputError('Please enter the business name for the GST number');
  return { name, phone, business_name, gst_number };
}

// Creates or updates the customer for this phone number and returns its id.
async function upsertCustomer(db, contact) {
  const row = { name: contact.name, phone: contact.phone, updated_at: new Date().toISOString() };
  const { data, error } = await db.from('customers')
    .upsert(row, { onConflict: 'phone' })
    .select('id').single();
  if (error) throw new Error('DB error: ' + error.message);
  return data.id;
}

// Everything the booking pages need to show and price a booking.
async function loadCatalog(db) {
  const [parks, slots, zones, routes, rates] = await Promise.all([
    db.from('parks').select('id, name, logo_path, children_need_seat, id_docs_for_all, closed_weekday, shared_price_per_person, shared_price_foreigner, shared_zone_id, camera_still_indian, camera_still_foreigner, camera_video_indian, camera_video_foreigner, sort_order').eq('active', true).order('sort_order'),
    db.from('safari_slots').select('id, park_id, name, time_range, for_type, sort_order').eq('active', true).order('sort_order'),
    db.from('safari_zones').select('id, park_id, name, price_indian, price_foreigner, max_per_jeep, full_day, note, sort_order').eq('active', true).order('sort_order'),
    db.from('transfer_routes').select('id, park_id, city, park_place, sort_order').eq('active', true).order('sort_order'),
    db.from('transfer_rates').select('id, route_id, vehicle_name, seats, price, sort_order').eq('active', true).order('sort_order')
  ]);
  for (const r of [parks, slots, zones, routes, rates]) {
    if (r.error) throw new Error('DB error: ' + r.error.message);
  }
  return { mode: bookingMode(), parks: parks.data, slots: slots.data, zones: zones.data, routes: routes.data, rates: rates.data };
}

// Validates a pickup/drop request against the catalog and prices it.
// parkId limits it to routes for that park (safari add-on); null allows any route.
function priceTransfer(catalog, t, parkId) {
  const rate = catalog.rates.find(r => r.id === int(t.rateId));
  const route = rate && catalog.routes.find(r => r.id === rate.route_id);
  if (!rate || !route || (parkId && route.park_id !== parkId)) throw new InputError('Please choose a pickup/drop vehicle');
  if (!['pickup', 'drop', 'both'].includes(t.direction)) throw new InputError('Please choose pickup, drop or both');
  const vehicles = int(t.vehicles || 1);
  if (!(vehicles >= 1 && vehicles <= 5)) throw new InputError('Invalid number of vehicles');
  const startDate = futureDate(t.date, t.direction === 'drop' ? 'drop date' : 'pickup date');
  let returnDate = null;
  if (t.direction === 'both') {
    returnDate = futureDate(t.returnDate, 'drop date');
    if (returnDate < startDate) throw new InputError('Drop date cannot be before the pickup date');
  }
  const pickupLocation = text(t.pickupLocation, 200) || null;   // optional: where exactly in town, if not the airport / station itself
  const legs = t.direction === 'both' ? 2 : 1;
  return {
    rate, route, vehicles, startDate, returnDate, pickupLocation,
    direction: t.direction,
    routeLabel: `${route.city} ⇄ ${route.park_place}`,
    vehicleName: rate.vehicle_name + (rate.seats ? ` (${rate.seats} seater)` : ''),
    amount: rate.price * vehicles * legs
  };
}

// Raised when a payment does not match the order it claims to pay for.
class PaymentError extends Error {}

// The amount (in paise) this order must be paid, from our own database — never from the browser.
async function expectedPaise(orderId) {
  const db = supabase();
  const { data: s, error } = await db.from('safari_bookings').select('total_amount').eq('razorpay_order_id', orderId).maybeSingle();
  if (error) throw new Error('DB error: ' + error.message);
  return s ? s.total_amount * 100 : null;
}

// A payment only counts if it is for this order, in INR, for exactly the amount we priced, and captured.
function assertPaid(payment, orderId, expected) {
  if (!payment || payment.order_id !== orderId) throw new PaymentError('payment belongs to a different order');
  if (expected == null) throw new PaymentError('unknown order');
  if (payment.currency !== 'INR' || payment.amount !== expected) throw new PaymentError(`amount mismatch: paid ${payment.amount} ${payment.currency}, expected ${expected} INR paise`);
  if (payment.status !== 'captured') throw new PaymentError('payment status is ' + payment.status);
}

// Used when the browser reports a payment: asks Razorpay directly instead of trusting the browser.
async function verifyWithRazorpay(orderId, paymentId) {
  const expected = await expectedPaise(orderId);
  let payment = await razorpay('/payments/' + encodeURIComponent(paymentId));
  if (payment.status === 'authorized') {
    // Accounts set to manual capture only authorise the card; capture it now.
    payment = await razorpay(`/payments/${encodeURIComponent(paymentId)}/capture`, { amount: payment.amount, currency: payment.currency });
  }
  assertPaid(payment, orderId, expected);
}

// Used for webhook events (already signed by Razorpay): checks the payment inside the event.
async function verifyWebhookPayment(payment) {
  assertPaid(payment, payment && payment.order_id, await expectedPaise(payment && payment.order_id));
}

// True when this Razorpay order belongs to a booking made through the website checkout.
async function knownOrder(orderId) {
  return (await expectedPaise(orderId)) != null;
}

// A payment made through the payment link the admin sent. Marks that booking (and any pickup/drop added
// to it) paid and confirmed, once. Returns false if no booking has this payment link.
async function confirmByPaymentLink(linkId, payment) {
  const db = supabase();
  const { data: b, error } = await db.from('safari_bookings')
    .select('id, total_amount, payment_link_amount').eq('razorpay_payment_link_id', linkId).maybeSingle();
  if (error) throw new Error('DB error: ' + error.message);
  if (!b) return false;
  const expected = (b.payment_link_amount != null ? b.payment_link_amount : b.total_amount) * 100;
  if (!payment || payment.currency !== 'INR' || payment.amount !== expected) {
    throw new PaymentError(`payment link amount mismatch: paid ${payment && payment.amount} ${payment && payment.currency}, expected ${expected} INR paise`);
  }
  if (payment.status !== 'captured') throw new PaymentError('payment status is ' + payment.status);

  const paid = { status: 'confirmed', payment_id: payment.id, paid_at: new Date().toISOString() };
  const { data: flipped, error: upErr } = await db.from('safari_bookings').update(paid)
    .eq('id', b.id).neq('status', 'confirmed').select('id');
  if (upErr) throw new Error('DB error: ' + upErr.message);
  const { error: addOnErr } = await db.from('car_rentals').update(paid).eq('safari_booking_id', b.id).neq('status', 'confirmed');
  if (addOnErr) throw new Error('DB error: ' + addOnErr.message);
  if (flipped.length) await notifySafari(db, b.id);
  return true;
}

// Marks everything paid by this Razorpay order as confirmed, then sends the guest their WhatsApp
// message (when WhatsApp is set up). Safe to call more than once: verify-payment and the webhook can both fire for
// the same payment, but only the call that actually flips a row gets it back, so the guest is
// notified once.
async function confirmOrder(orderId, paymentId) {
  const db = supabase();
  const paid = { status: 'confirmed', payment_id: paymentId, paid_at: new Date().toISOString() };

  const { data: safaris, error } = await db.from('safari_bookings').update(paid)
    .eq('razorpay_order_id', orderId).neq('status', 'confirmed').select('id');
  if (error) throw new Error('DB error: ' + error.message);

  // A pickup/drop added during the safari booking is paid by the same order. Update it for every
  // booking on this order, not only the ones flipped just now, so a retry after a partial failure
  // still finishes the job.
  const { data: owned, error: ownedErr } = await db.from('safari_bookings').select('id').eq('razorpay_order_id', orderId);
  if (ownedErr) throw new Error('DB error: ' + ownedErr.message);
  for (const s of owned) {
    const { error: addOnErr } = await db.from('car_rentals').update(paid)
      .eq('safari_booking_id', s.id).neq('status', 'confirmed');
    if (addOnErr) throw new Error('DB error: ' + addOnErr.message);
  }

  await Promise.all(safaris.map(s => notifySafari(db, s.id)));
}

// What a Razorpay order paid for, for the browser's success screen.
async function findOrder(orderId) {
  const db = supabase();
  const { data: s, error } = await db.from('safari_bookings')
    .select('id, total_amount, status').eq('razorpay_order_id', orderId).maybeSingle();
  if (error) throw new Error('DB error: ' + error.message);
  if (s) return { kind: 'safari', ref: 'S-' + s.id, total: s.total_amount, status: s.status };
  return null;
}

module.exports = {
  supabase, razorpay, hmacMatches, json, InputError, PaymentError, parseBody, text, int, futureDate,
  parseContact, upsertCustomer, loadCatalog, priceTransfer, confirmOrder, findOrder,
  verifyWithRazorpay, verifyWebhookPayment, bookingMode, knownOrder, confirmByPaymentLink
};
