/* Admin session handling.
 *
 * The password never reaches the browser and the browser never sends it again
 * after login: a successful login mints a signed, HttpOnly cookie. Anyone can
 * read admin.html — it is the API behind it that is guarded, which is the only
 * place a guard can actually hold.
 */

import crypto from 'node:crypto';

const COOKIE = 'ideathon_admin';
const TTL_SECONDS = 8 * 60 * 60;

export function adminPassword() {
  const v = process.env.ADMIN_PASSWORD;
  return v && v.length ? v : null;
}

/* Signing key: an explicit secret if set, otherwise derived from the password
   so a password change invalidates every existing session. */
function key() {
  const explicit = process.env.ADMIN_SESSION_SECRET;
  if (explicit && explicit.length >= 16) return Buffer.from(explicit, 'utf8');
  const pw = adminPassword();
  if (!pw) throw new Error('ADMIN_PASSWORD is not set');
  return crypto.createHash('sha256').update('ideathon-session:' + pw).digest();
}

function sign(payload) {
  return crypto.createHmac('sha256', key()).update(payload).digest('base64url');
}

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function checkPassword(candidate) {
  const pw = adminPassword();
  if (!pw) return false;
  /* Compare digests so the comparison is constant-length as well as
     constant-time — raw lengths would otherwise leak the password length. */
  const a = crypto.createHash('sha256').update(String(candidate ?? '')).digest();
  const b = crypto.createHash('sha256').update(pw).digest();
  return crypto.timingSafeEqual(a, b);
}

export function makeToken() {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const payload = `v1.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return false;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
  let expected;
  try {
    expected = sign(`v1.${parts[1]}`);
  } catch {
    return false;
  }
  return safeEqual(parts[2], expected);
}

export function readCookie(req, name = COOKIE) {
  const header = req.headers?.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) {
      return decodeURIComponent(part.slice(i + 1).trim());
    }
  }
  return null;
}

export function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie',
    `${COOKIE}=${encodeURIComponent(token)}; Max-Age=${TTL_SECONDS}; Path=/; ` +
    'HttpOnly; Secure; SameSite=Strict');
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie',
    `${COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`);
}

export function isAuthed(req) {
  return verifyToken(readCookie(req));
}

/* Guard for admin endpoints. Returns true when the caller may proceed. */
export function requireAdmin(req, res) {
  if (!adminPassword()) {
    res.status(503).json({
      ok: false,
      error: 'ADMIN_PASSWORD is not set on this deployment, so the admin area is closed.'
    });
    return false;
  }
  if (!isAuthed(req)) {
    res.status(401).json({ ok: false, error: 'Not signed in.' });
    return false;
  }
  return true;
}

/* A stable, non-reversible identifier for an IP, for rate limiting without
   storing anyone's address. */
export function clientHash(req) {
  const fwd = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(fwd) ? fwd[0] : String(fwd || ''))
    .split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  const salt = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || 'ideathon';
  return crypto.createHmac('sha256', salt).update(ip).digest('base64url').slice(0, 32);
}
