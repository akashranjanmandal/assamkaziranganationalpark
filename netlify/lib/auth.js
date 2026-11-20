// Admin auth: the password lives only in the ADMIN_PASSWORD env var.
// Login returns a signed token "<expiryMs>.<hmac>" that the admin page sends
// as "Authorization: Bearer <token>". Changing the password invalidates all tokens.
const crypto = require('crypto');
const { hmacMatches } = require('./safari');

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

function signingKey() {
  // ADMIN_TOKEN_SECRET (optional, any long random string) keeps tokens independent of the password.
  return 'admin-token:' + (process.env.ADMIN_TOKEN_SECRET || '') + ':' + (process.env.ADMIN_PASSWORD || '');
}

function passwordMatches(input) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof input !== 'string') return false;
  const a = crypto.createHash('sha256').update(input).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

function issueToken() {
  const exp = String(Date.now() + TOKEN_TTL_MS);
  const sig = crypto.createHmac('sha256', signingKey()).update(exp).digest('hex');
  return exp + '.' + sig;
}

function isAuthorized(event) {
  if (!process.env.ADMIN_PASSWORD) return false;
  const header = event.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const [exp, sig] = token.split('.');
  if (!exp || !sig || !(Number(exp) > Date.now())) return false;
  return hmacMatches(exp, signingKey(), sig);
}

module.exports = { passwordMatches, issueToken, isAuthorized };
