const {
  supabase, json, InputError, parseBody, text, int, parseContact, upsertCustomer
} = require('../lib/safari');
const { rateLimit } = require('../lib/guard');

// Itinerary booking request. Nothing is paid online: the request is saved and followed up directly.
//   kind 'preset': one of our itineraries (its days and nights come from the itinerary); description optional.
//   kind 'custom': the guest's own plan — a description is required, plus days and nights; pickup/drop optional.
//                  They may pick one of our itineraries as a starting point (baseItineraryId); the days and nights stay theirs.
// Body: { kind, itineraryId?, description, days?, nights?, pickupDrop?, contact: { name, phone } }
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });
  if (!(await rateLimit(event, 'tour', 10, 3600))) return json(429, { error: 'Too many requests. Please try again in a while.' });

  const db = supabase();
  try {
    const p = parseBody(event);
    const contact = parseContact(p.contact);
    const description = text(p.description, 3000) || null;
    let row;

    if (p.kind === 'custom') {
      if (!description || description.length < 10) throw new InputError('Please describe the itinerary you have in mind');
      const days = int(p.days), nights = int(p.nights);
      if (!(days >= 1 && days <= 60)) throw new InputError('Please enter the number of days');
      if (!(nights >= 0 && nights <= 60)) throw new InputError('Please enter the number of nights');
      let baseId = null;
      if (p.baseItineraryId !== undefined && p.baseItineraryId !== null && p.baseItineraryId !== '') {
        const { data: base, error: bErr } = await db.from('itineraries').select('id').eq('id', int(p.baseItineraryId)).eq('active', true).maybeSingle();
        if (bErr) throw new Error('DB error: ' + bErr.message);
        if (!base) throw new InputError('That itinerary is not available');
        baseId = base.id;
      }
      row = {
        request_kind: 'custom', itinerary_id: baseId, package_key: 'custom', package_title: 'Customised itinerary',
        num_days: days, num_nights: nights, description, pickup_drop: text(p.pickupDrop, 500) || null
      };
    } else if (p.kind === 'preset') {
      const id = int(p.itineraryId);
      const { data: it, error } = await db.from('itineraries').select('id, title, num_days, num_nights').eq('id', id).eq('active', true).maybeSingle();
      if (error) throw new Error('DB error: ' + error.message);
      if (!it) throw new InputError('Please choose an itinerary');
      row = {
        request_kind: 'preset', itinerary_id: it.id, package_key: 'it:' + it.id, package_title: it.title,
        num_days: it.num_days, num_nights: it.num_nights, description, pickup_drop: null
      };
    } else {
      throw new InputError('Please choose an itinerary or describe your own');
    }

    const customerId = await upsertCustomer(db, contact);
    const ins = await db.from('tour_bookings').insert({ ...row, customer_id: customerId, business_name: contact.business_name, gst_number: contact.gst_number, status: 'requested' }).select('id').single();
    if (ins.error) throw new Error('DB error: ' + ins.error.message);

    return json(200, { ref: 'T-' + ins.data.id });
  } catch (err) {
    if (err instanceof InputError) return json(400, { error: err.message });
    console.error('create-tour-booking failed:', err);
    return json(500, { error: 'Could not save your request. Please try again.' });
  }
};
