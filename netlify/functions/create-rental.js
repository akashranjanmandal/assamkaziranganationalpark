const {
  supabase, json, InputError, parseBody, text, int, parseContact, upsertCustomer, loadCatalog, priceTransfer
} = require('../lib/safari');
const { rateLimit } = require('../lib/guard');

// Car Rental service. Three kinds of request — nothing is paid online; the request is saved and followed up directly.
//   kind 'pickup': airport / railway station ⇄ Manas / Kaziranga pickup & drop. The fare comes from the rate card (database).
//   kind 'preset': a car for one of our itineraries (the number of days comes from the itinerary).
//   kind 'custom': a car for the guest's own route — they describe it and say how many days.
// Body: { kind, contact: { name, phone },
//         pickup: { rateId, direction, vehicles, date, returnDate, pickupLocation },
//         preset/custom: { vehicleId, itineraryId?, routeDescription?, days?, pickupLocation? } }
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });
  if (!(await rateLimit(event, 'rental', 15, 3600))) return json(429, { error: 'Too many requests. Please try again in a while.' });

  const db = supabase();
  try {
    const p = parseBody(event);
    const contact = parseContact(p.contact);

    // ── pickup & drop ──
    if (p.kind === 'pickup') {
      const catalog = await loadCatalog(db);
      const t = priceTransfer(catalog, p.pickup || {}, null);
      const customerId = await upsertCustomer(db, contact);
      const ins = await db.from('car_rentals').insert({
        customer_id: customerId, rental_type: 'transfer', transfer_rate_id: t.rate.id,
        route_label: t.routeLabel, direction: t.direction, vehicle_name: t.vehicleName,
        num_vehicles: t.vehicles, start_date: t.startDate, return_date: t.returnDate,
        pickup_location: t.pickupLocation, amount: t.amount, status: 'requested',
        business_name: contact.business_name, gst_number: contact.gst_number
      }).select('id').single();
      if (ins.error) throw new Error('DB error: ' + ins.error.message);
      return json(200, { ref: 'C-' + ins.data.id, total: t.amount });
    }

    // ── a car for an itinerary / a customised route ──
    const pickupLocation = text(p.pickupLocation, 300) || null;
    const { data: vehicle, error: vErr } = await db.from('vehicles')
      .select('id, name').eq('id', p.vehicleId).eq('active', true).maybeSingle();
    if (vErr || !vehicle) throw new InputError('Please choose a car');

    let row;
    if (p.kind === 'custom') {
      const routeDescription = text(p.routeDescription, 2000);
      if (routeDescription.length < 5) throw new InputError('Please explain your route or destination');
      const days = int(p.days);
      if (!(days >= 1 && days <= 60)) throw new InputError('Please enter the number of days');
      row = { itinerary: 'Customised trip', itinerary_id: null, route_description: routeDescription, num_days: days };
    } else if (p.kind === 'preset') {
      const { data: it, error } = await db.from('itineraries').select('id, title, num_days').eq('id', int(p.itineraryId)).eq('active', true).maybeSingle();
      if (error) throw new Error('DB error: ' + error.message);
      if (!it) throw new InputError('Please choose an itinerary');
      row = { itinerary: it.title, itinerary_id: it.id, route_description: null, num_days: it.num_days };
    } else {
      throw new InputError('Please choose a service');
    }

    const customerId = await upsertCustomer(db, contact);
    const ins = await db.from('car_rentals').insert({
      ...row, customer_id: customerId, rental_type: 'tour', vehicle_id: vehicle.id, vehicle_name: vehicle.name,
      num_vehicles: 1, pickup_location: pickupLocation, status: 'requested',
      business_name: contact.business_name, gst_number: contact.gst_number
    }).select('id').single();
    if (ins.error) throw new Error('DB error: ' + ins.error.message);
    return json(200, { ref: 'C-' + ins.data.id });
  } catch (err) {
    if (err instanceof InputError) return json(400, { error: err.message });
    console.error('create-rental failed:', err);
    return json(500, { error: 'Could not save your request. Please try again.' });
  }
};
