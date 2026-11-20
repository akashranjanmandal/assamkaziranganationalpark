// Abuse protection shared by the public functions.
const { getStore, connectLambda } = require('@netlify/blobs');

function clientIp(event) {
  const h = event.headers || {};
  return h['x-nf-client-connection-ip'] || String(h['x-forwarded-for'] || '').split(',')[0].trim() || h['client-ip'] || 'unknown';
}

function blobStore(event, name) {
  connectLambda(event);
  return getStore(name);
}

// Fixed-window counter per visitor IP, kept in Netlify Blobs so it holds across
// function instances. Returns false once `max` requests were made within
// `windowSec`. If the store is unavailable the request is allowed (and logged):
// an outage must not stop guests from booking.
async function rateLimit(event, bucket, max, windowSec) {
  try {
    const store = blobStore(event, 'rate-limits');
    const key = `${bucket}/${clientIp(event).replace(/[^a-zA-Z0-9.:_-]/g, '_')}`;
    const now = Date.now();
    const prev = await store.get(key, { type: 'json' });
    const rec = prev && prev.resetAt > now ? prev : { count: 0, resetAt: now + windowSec * 1000 };
    rec.count += 1;
    await store.setJSON(key, rec);
    return rec.count <= max;
  } catch (err) {
    console.error(`rate limit "${bucket}" unavailable, allowing request:`, err.message);
    return true;
  }
}

// Uploads are identified by their first bytes, never by the name or type the browser sends.
function sniffFileType(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { type: 'image/jpeg', ext: 'jpg' };
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { type: 'image/png', ext: 'png' };
  if (buf.length >= 5 && buf.subarray(0, 5).toString('latin1') === '%PDF-') return { type: 'application/pdf', ext: 'pdf' };
  return null;
}

// Keys created by upload-file look like "aadhaar/1790364675676_a5elm21.jpg".
const ID_KEY = /^aadhaar\/\d{13}_[a-z0-9]{6,12}\.(jpg|png|pdf)$/;

module.exports = { clientIp, blobStore, rateLimit, sniffFileType, ID_KEY };
