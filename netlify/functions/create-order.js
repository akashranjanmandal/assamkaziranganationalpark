const {
  supabase, razorpay, json, InputError, parseBody, text, int, futureDate,
  parseContact, upsertCustomer, loadCatalog, bookingMode
} = require('../lib/safari');
const { rateLimit, blobStore, ID_KEY } = require('../lib/guard');

// Safari booking. Validates and prices everything server-side.
//   BOOKING_MODE 'request' (default): saves the booking as a 'requested' slot request — no payment yet.
//     The admin checks availability and sends a payment link (admin-api 'payment_link'); the Razorpay
//     webhook marks it paid.
//   BOOKING_MODE 'instant': creates a Razorpay order and saves the booking as 'awaiting_payment'. It
//     only becomes 'confirmed' once verify-payment or the webhook sees a valid payment.
//
// Body: { type: 'private'|'shared', zoneId, slotId, date, nationality,
//         adults, children, guests: [{ name, age, idKey, idType }],
//         cameras?: { still, video },                 // parks with camera fees (Manas): charged per camera, added to the total
//         contact: { name, phone, business?, gst? } }
// Guests are listed adults first, then children.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });

  if (!(await rateLimit(event, 'order', 15, 3600))) return json(429, { error: 'Too many booking attempts. Please try again in a while.' });

  const db = supabase();
  const request = bookingMode() === 'request';
  let order = null, booking, priced;
  try {
    const p = parseBody(event);
    const catalog = await loadCatalog(db);
    priced = priceSafari(catalog, p);
    const contact = parseContact(p.contact);
    await assertUploadsExist(event, priced.guests);
    const cameras = priceCameras(priced.park, priced.nationality, p.cameras);
    const total = priced.amount + cameras.amount;

    const customerId = await upsertCustomer(db, contact);
    if (!request) {
      order = await razorpay('/orders', {
        amount: total * 100, // paise
        currency: 'INR',
        receipt: 'safari_' + Date.now(),
        notes: { kind: 'safari', zone: priced.zone.name, safari_date: priced.date, phone: contact.phone }
      });
    }

    const ins = await db.from('safari_bookings').insert({
      customer_id:       customerId,
      booking_type:      priced.type,
      park_id:           priced.park.id,
      zone_id:           priced.zone.id,
      zone_name:         priced.zone.name,
      safari_date:       priced.date,
      slot_label:        priced.slotLabel,
      nationality:       priced.nationality,
      num_adults:        priced.adults,
      num_children:      priced.children,
      num_jeeps:         priced.jeeps,
      unit_price:        priced.unitPrice,
      safari_amount:     priced.amount,
      transfer_amount:   0,
      camera_still:      cameras.still,
      camera_video:      cameras.video,
      camera_amount:     cameras.amount,
      business_name:     contact.business_name,
      gst_number:        contact.gst_number,
      total_amount:      total,
      status:            request ? 'requested' : 'awaiting_payment',
      razorpay_order_id: order ? order.id : null
    }).select('id').single();
    if (ins.error) throw new Error('DB error: ' + ins.error.message);
    booking = ins.data;

    const guestsIns = await db.from('safari_guests').insert(priced.guests.map(g => ({ ...g, booking_id: booking.id })));
    if (guestsIns.error) throw new Error('DB error: ' + guestsIns.error.message);

    if (request) return json(200, { requested: true, total, cameraAmount: cameras.amount, ref: 'S-' + booking.id });

    return json(200, {
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      total,
      ref: 'S-' + booking.id
    });
  } catch (err) {
    if (err instanceof InputError) return json(400, { error: err.message });
    console.error('create-order failed:', err);
    // Don't leave a half-saved booking behind (its guests go with it).
    if (booking) await db.from('safari_bookings').delete().eq('id', booking.id);
    return json(500, { error: request ? 'Could not save your booking. Please try again.' : 'Could not start payment. Please try again.' });
  }
};

// ID documents must be files that upload-file really stored — not names the browser made up.
async function assertUploadsExist(event, guests) {
  const keys = [...new Set(guests.map(g => g.id_doc_path).filter(Boolean))];
  const store = blobStore(event, 'assam-uploads');
  for (const key of keys) {
    if (!(await store.getMetadata(key))) throw new InputError('An uploaded ID document could not be found. Please upload it again.');
  }
}

// Camera charges (per camera, by nationality) are added to the safari total at parks that have them (Manas).
function priceCameras(park, nationality, c) {
  const kind = nationality === 'foreigner' ? 'foreigner' : 'indian';
  const feeStill = park[`camera_still_${kind}`], feeVideo = park[`camera_video_${kind}`];
  if (feeStill == null && feeVideo == null) return { still: 0, video: 0, amount: 0 };   // no camera fee at this park
  const count = v => { const n = v === undefined || v === null || v === '' ? 0 : int(v); if (!(n >= 0 && n <= 10)) throw new InputError('Invalid number of cameras'); return n; };
  const still = count(c && c.still), video = count(c && c.video);
  if ((still && feeStill == null) || (video && feeVideo == null)) throw new InputError('That camera type is not available for this park');
  return { still, video, amount: still * (feeStill || 0) + video * (feeVideo || 0) };
}

function priceSafari(catalog, p) {
  const type = p.type === 'shared' ? 'shared' : 'private';
  const zone = catalog.zones.find(z => z.id === p.zoneId);
  const park = zone && catalog.parks.find(pk => pk.id === zone.park_id);
  if (!zone || !park) throw new InputError('Please choose a safari zone');

  const nationality = p.nationality === 'foreigner' ? 'foreigner' : 'indian';
  const adults = int(p.adults);
  const children = int(p.children);

  let unitPrice, jeeps, amount;
  if (type === 'shared') {
    if (park.shared_price_per_person == null) throw new InputError('Shared jeep is not available in this park');
    // Shared safaris run in one fixed zone per park — there is nothing to choose.
    if (!park.shared_zone_id || zone.id !== park.shared_zone_id) throw new InputError('Shared jeep runs only in its fixed zone. Please book a private jeep for other zones.');
    if (!(adults >= 1 && adults <= 3) || !(children >= 0 && children <= 2)) {
      throw new InputError('Shared jeep takes 1–3 adults (and up to 2 children). For more people, book a private jeep.');
    }
    // One fixed per-person price per park. Foreign guests pay the foreigner price (it includes the foreigner entry fee).
    unitPrice = nationality === 'foreigner' ? park.shared_price_foreigner : park.shared_price_per_person;
    if (unitPrice == null) throw new InputError('Shared jeep is not available for foreign guests here. Please book a private jeep.');
    jeeps = null;
    amount = unitPrice * adults;
  } else {
    unitPrice = nationality === 'foreigner' ? zone.price_foreigner : zone.price_indian;
    if (unitPrice == null) throw new InputError('This zone is available for Indian guests only');
    if (!(adults >= 1 && adults <= 20) || !(children >= 0 && children <= 10)) throw new InputError('Invalid guest count');
    const seats = adults + (park.children_need_seat ? children : 0);
    jeeps = Math.ceil(seats / zone.max_per_jeep);
    if (jeeps > 4) throw new InputError('For more than 4 jeeps, please call us to book');
    amount = unitPrice * jeeps;
  }

  const date = futureDate(p.date, 'safari date');
  if (park.closed_weekday != null && new Date(date + 'T12:00:00Z').getUTCDay() === park.closed_weekday) {
    throw new InputError(`${park.name} is closed on that day of the week. Please choose another date.`);
  }

  let slotLabel;
  if (zone.full_day) {
    slotLabel = 'Whole Day';
  } else {
    // Private and shared safaris have their own time slots.
    const slot = catalog.slots.find(s => s.id === p.slotId && s.park_id === park.id && (s.for_type || 'private') === type);
    if (!slot) throw new InputError('Please choose a time slot');
    slotLabel = `${slot.name} (${slot.time_range})`;
  }

  const list = Array.isArray(p.guests) ? p.guests : [];
  if (list.length !== adults + children) throw new InputError('Guest details do not match guest count');
  const guests = list.map((g, i) => {
    const isChild = i >= adults;
    const label = i === 0 ? 'Primary guest' : isChild ? `Child ${i - adults + 1}` : `Guest ${i + 1}`;
    const name = text(g && g.name, 100);
    const age = int(g && g.age);
    if (!name) throw new InputError(`${label}: name is required`);
    if (!(age >= 0 && age <= 120)) throw new InputError(`${label}: valid age is required`);
    if (isChild && age > 5) throw new InputError(`${label}: children must be 5 years or younger (older children count as adults)`);
    const row = { position: i + 1, name, age, is_child: isChild, id_doc_type: null, id_doc_path: null };
    const needsId = i === 0 || park.id_docs_for_all;
    if (needsId) {
      if (typeof g.idKey !== 'string' || !ID_KEY.test(g.idKey)) throw new InputError(`${label}: ID document upload is required`);
      row.id_doc_path = g.idKey;
      // Indian guests: Aadhaar only. Foreign guests: passport, or any other ID card they have.
      row.id_doc_type = nationality === 'foreigner' ? (g.idType === 'other' ? 'other' : 'passport') : 'aadhaar';
    }
    return row;
  });

  return { type, zone, park, nationality, adults, children, jeeps, unitPrice, amount, date, slotLabel, guests };
}
