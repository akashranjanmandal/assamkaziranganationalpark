const { supabase, json, loadCatalog } = require('../lib/safari');

// Read-only data for public pages. Only rows/columns that are meant to be public.
// GET /.netlify/functions/public-data?type=catalog|itineraries|reviews|vehicles[&limit=N]
const QUERIES = {
  itineraries: (db) => db.from('itineraries').select('id, title, badge, route, num_days, num_nights, days, sections, notes, sort_order')
                         .eq('active', true).order('sort_order'),
  reviews:     (db) => db.from('reviews').select('name, rating, message, park, created_at')
                         .eq('approved', true).order('created_at', { ascending: false }),
  vehicles:    (db) => db.from('vehicles').select('id, name, capacity, description')
                         .eq('active', true).order('capacity')
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method Not Allowed' });

  const params = event.queryStringParameters || {};
  let data;
  try {
    if (params.type === 'catalog') {
      data = await loadCatalog(supabase());
    } else {
      const build = QUERIES[params.type];
      if (!build) return json(400, { error: 'Unknown type' });
      let q = build(supabase());
      const limit = parseInt(params.limit, 10);
      if (limit > 0) q = q.limit(Math.min(limit, 100));
      const res = await q;
      if (res.error) throw new Error(res.error.message);
      data = res.data;
    }
  } catch (err) {
    console.error('public-data failed:', err);
    return json(500, { error: 'Could not load data' });
  }
  const res = json(200, { data });
  res.headers['Cache-Control'] = 'public, max-age=60';
  return res;
};
