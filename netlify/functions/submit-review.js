const { supabase, json, parseBody, InputError } = require('../lib/safari');
const { toWhatsAppNumber } = require('../lib/whatsapp');
const { rateLimit } = require('../lib/guard');

// Public review form. Reviews are always saved unapproved; pages escape them when shown.
// Address, contact number and email are optional, kept private (public-data never returns them) and shown only in the admin.
const clean = (v, max) => typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim().slice(0, max) : '';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });
  if (!(await rateLimit(event, 'review', 5, 3600))) return json(429, { error: 'Too many reviews from you. Please try again later.' });

  let p;
  try {
    p = parseBody(event);
  } catch (err) {
    if (err instanceof InputError) return json(400, { error: err.message });
    throw err;
  }

  const name = clean(p.name, 80);
  const message = clean(p.message, 2000);
  const rating = parseInt(p.rating, 10);
  if (!name || !message) return json(400, { error: 'Please fill all fields.' });
  if (!(rating >= 1 && rating <= 5)) return json(400, { error: 'Invalid rating' });

  const address = clean(p.address, 300) || null;
  const emailRaw = clean(p.email, 120);
  const phoneRaw = clean(p.phone, 30);
  if (emailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailRaw)) return json(400, { error: 'Please enter a valid email address, or leave it empty.' });
  const phone = phoneRaw ? toWhatsAppNumber(phoneRaw) : null;
  if (phoneRaw && !phone) return json(400, { error: 'Please enter a valid contact number, or leave it empty.' });

  const { error } = await supabase().from('reviews').insert({ name, rating, message, address, phone, email: emailRaw || null, approved: false });
  if (error) {
    console.error('submit-review failed:', error);
    return json(500, { error: 'Could not save review. Please try again.' });
  }
  return json(200, { ok: true });
};
