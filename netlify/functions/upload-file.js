const crypto = require('crypto');
const { json } = require('../lib/safari');
const { blobStore, rateLimit, sniffFileType } = require('../lib/guard');

// ID document upload from the booking page. Files go to a private Netlify Blobs
// store that only the admin panel can read (see get-file.js).
// Netlify caps request bodies at 6 MB, so after base64 the file must stay under ~4.5 MB.
const MAX_BYTES = 4.5 * 1024 * 1024;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });
  if (!/^application\/json\b/i.test(event.headers['content-type'] || '')) return json(415, { error: 'Unsupported content type' });
  if (!(await rateLimit(event, 'upload', 40, 3600))) return json(429, { error: 'Too many uploads. Please wait a while and try again.' });

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }
  const { folder, filename, dataBase64 } = payload;
  if (folder !== 'aadhaar') return json(400, { error: 'Invalid folder' });
  if (typeof dataBase64 !== 'string' || !dataBase64 || !/^[A-Za-z0-9+/=\s]+$/.test(dataBase64)) return json(400, { error: 'Missing file data' });

  const buffer = Buffer.from(dataBase64, 'base64');
  if (buffer.length > MAX_BYTES) return json(413, { error: 'File too large (max 4.5 MB). Please upload a photo or a smaller PDF.' });
  const kind = sniffFileType(buffer);
  if (!kind) return json(415, { error: 'Please upload a JPG, PNG or PDF file.' });

  // The key never contains anything the browser sent.
  const key = `${folder}/${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${kind.ext}`;
  try {
    await blobStore(event, 'assam-uploads').set(key, buffer, {
      metadata: {
        contentType: kind.type,
        originalName: String(filename || '').replace(/[^\w.\- ]/g, '_').slice(0, 120),
        uploadedAt: new Date().toISOString()
      }
    });
    return json(200, { key });
  } catch (err) {
    console.error('upload-file failed:', err);
    return json(500, { error: 'Upload failed. Please try again.' });
  }
};
