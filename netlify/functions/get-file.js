const { isAuthorized } = require('../lib/auth');
const { blobStore } = require('../lib/guard');

// Admin-only viewer for uploaded ID documents (and legacy payment screenshots).
const KEY = /^(aadhaar|screenshots)\/[\w.\-]{1,200}$/;
const SAFE_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf']);

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method Not Allowed' };
  if (!isAuthorized(event)) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };

  const key = event.queryStringParameters && event.queryStringParameters.key;
  if (!key || !KEY.test(key) || key.includes('..')) return { statusCode: 400, body: JSON.stringify({ error: 'Invalid key' }) };

  try {
    const entry = await blobStore(event, 'assam-uploads').getWithMetadata(key, { type: 'arrayBuffer' });
    if (!entry) return { statusCode: 404, body: JSON.stringify({ error: 'File not found' }) };
    const stored = entry.metadata && entry.metadata.contentType;
    // Anything that is not a known image/PDF is served as a download, never rendered.
    const contentType = SAFE_TYPES.has(stored) ? stored : 'application/octet-stream';
    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': SAFE_TYPES.has(stored) ? 'inline' : 'attachment',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; object-src 'self'; sandbox"
      },
      body: Buffer.from(entry.data).toString('base64'),
      isBase64Encoded: true
    };
  } catch (err) {
    console.error('get-file failed:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not load file' }) };
  }
};
