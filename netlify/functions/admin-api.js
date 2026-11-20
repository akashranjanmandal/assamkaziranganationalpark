const { supabase, json, razorpay } = require('../lib/safari');
const { passwordMatches, issueToken, isAuthorized } = require('../lib/auth');
const { rateLimit } = require('../lib/guard');

// Single endpoint behind the admin panel. The page sends
// { table, op, values?, id?, order? } — see the `db` shim in pages/admin.html.
// `select` is fixed per table here so the browser can't ask for arbitrary joins.
const CUSTOMER = 'customer:customers(id, name, phone)';
const TABLES = {
  safari_bookings: {
    ops: ['select', 'update'],
    select: `*, park:parks(id, name), guests:safari_guests(position, name, age, is_child, id_doc_type, id_doc_path), ${CUSTOMER}, transfers:car_rentals(id, status, route_label, direction, vehicle_name, num_vehicles, start_date, return_date, pickup_location, amount, vehicle_number, driver_name, driver_contact)`
  },
  car_rentals:          { ops: ['select', 'update'], select: `*, ${CUSTOMER}, safari:safari_bookings(id, safari_date, zone_name)` },
  tour_bookings:        { ops: ['select', 'update'], select: `*, ${CUSTOMER}, base:itineraries(title)` },
  itineraries:          { ops: ['select', 'insert', 'update', 'delete'], select: '*' },
  customers:            { ops: ['select', 'update'], select: '*' },
  reviews:              { ops: ['select', 'update', 'delete'], select: '*' },
  vehicles:             { ops: ['select', 'insert', 'update', 'delete'], select: '*' },
  parks:                { ops: ['select', 'update'], select: '*' },
  safari_slots:         { ops: ['select', 'insert', 'update', 'delete'], select: '*' },
  safari_zones:         { ops: ['select', 'insert', 'update', 'delete'], select: '*' },
  transfer_routes:      { ops: ['select', 'insert', 'update', 'delete'], select: '*' },
  transfer_rates:       { ops: ['select', 'insert', 'update', 'delete'], select: '*' }
};
const IDENT = /^[a-z_]+$/;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });

  let p;
  try {
    p = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  if (p.op === 'login') {
    // Brute-force protection: 8 attempts per 15 minutes per visitor, plus a pause on every wrong guess.
    if (!(await rateLimit(event, 'admin-login', 8, 900))) return json(429, { error: 'Too many attempts. Try again in 15 minutes.' });
    if (!passwordMatches(p.password)) {
      await new Promise(r => setTimeout(r, 700));
      return json(401, { error: 'Incorrect password' });
    }
    return json(200, { token: issueToken() });
  }

  if (!isAuthorized(event)) return json(401, { error: 'Session expired. Please log in again.' });

  // Creates (or reuses) the Razorpay payment link for a safari booking and returns its URL, so the admin can
  // send it to the guest on WhatsApp. The amount is the booking's current total.
  if (p.op === 'payment_link') {
    const id = parseInt(p.id, 10);
    if (!(id > 0)) return json(400, { error: 'Invalid request' });
    const db = supabase();
    const { data: b, error } = await db.from('safari_bookings')
      .select('id, status, zone_name, safari_date, total_amount, razorpay_payment_link_id, payment_link_url, payment_link_amount, customer:customers(name, phone)')
      .eq('id', id).maybeSingle();
    if (error || !b) return json(404, { error: 'Booking not found' });
    if (b.status === 'confirmed') return json(400, { error: 'This booking is already paid.' });
    if (b.status === 'cancelled') return json(400, { error: 'This booking is cancelled. Reopen it first.' });
    if (!(b.total_amount > 0)) return json(400, { error: 'Set the amount to collect first.' });

    // Same amount as the link already sent: reuse it, so the guest never has two different links.
    if (b.razorpay_payment_link_id && b.payment_link_url && b.payment_link_amount === b.total_amount) {
      return json(200, { data: { url: b.payment_link_url, amount: b.total_amount, reused: true } });
    }
    try {
      if (b.razorpay_payment_link_id) {
        await razorpay(`/payment_links/${encodeURIComponent(b.razorpay_payment_link_id)}/cancel`, {}).catch(() => null); // old amount: cancel best-effort
      }
      const link = await razorpay('/payment_links', {
        amount: b.total_amount * 100,
        currency: 'INR',
        accept_partial: false,
        reference_id: `S${b.id}-${Date.now().toString(36)}`,
        description: `Safari booking S-${b.id} — ${b.zone_name}, ${b.safari_date}`,
        customer: { name: b.customer && b.customer.name, contact: '+' + String((b.customer && b.customer.phone) || '').replace(/\D/g, '') },
        notify: { sms: false, email: false },
        reminder_enable: false,
        notes: { booking: 'S-' + b.id }
      });
      const { error: upErr } = await db.from('safari_bookings').update({
        razorpay_payment_link_id: link.id, payment_link_url: link.short_url, payment_link_amount: b.total_amount,
        payment_requested_at: new Date().toISOString(), status: 'awaiting_payment'
      }).eq('id', b.id);
      if (upErr) throw new Error('DB error: ' + upErr.message);
      return json(200, { data: { url: link.short_url, amount: b.total_amount } });
    } catch (err) {
      console.error('payment_link failed:', err);
      return json(502, { error: 'Could not create the payment link: ' + err.message });
    }
  }

  const table = Object.prototype.hasOwnProperty.call(TABLES, p.table) ? TABLES[p.table] : null;
  if (!table || !table.ops.includes(p.op)) return json(400, { error: 'Operation not allowed' });

  const needsId = p.op === 'update' || p.op === 'delete';
  if (needsId && (p.id === undefined || p.id === null || p.id === '')) return json(400, { error: 'Missing id' });
  if ((p.op === 'insert' || p.op === 'update') && (!p.values || typeof p.values !== 'object' || Array.isArray(p.values))) {
    return json(400, { error: 'Missing values' });
  }

  let q = supabase().from(p.table);
  if (p.op === 'select') q = q.select(table.select);
  if (p.op === 'insert') q = q.insert(p.values).select();
  if (p.op === 'update') q = q.update(p.values);
  if (p.op === 'delete') q = q.delete();
  if (needsId) q = q.eq('id', p.id);
  for (const o of Array.isArray(p.order) ? p.order : []) {
    if (!o || !IDENT.test(o.column)) return json(400, { error: 'Invalid order column' });
    q = q.order(o.column, { ascending: o.ascending !== false });
  }

  const { data, error } = await q;
  if (error) return json(400, { error: error.message });
  return json(200, { data });
};
