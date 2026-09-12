/* POST /api/admin/login — exchange the admin password for a session cookie.
   GET  /api/admin/login — report whether this browser already has one. */

import { db, isConfigured } from '../_lib/db.js';
import { adminPassword, checkPassword, makeToken, setSessionCookie, isAuthed, clientHash }
  from '../_lib/auth.js';
import { tooMany, record } from '../_lib/rate.js';

const FAIL_LIMIT = 8;
const FAIL_WINDOW_MINUTES = 15;

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      authed: isAuthed(req),
      configured: Boolean(adminPassword()),
      database: isConfigured(),
      /* Which build is actually serving. Twice now, a change has looked
         "not applied" when the deployment simply predated it. */
      build: {
        commit: (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || null,
        branch: process.env.VERCEL_GIT_COMMIT_REF || null,
        env: process.env.VERCEL_ENV || null
      }
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Use POST.' });
  }

  if (!adminPassword()) {
    return res.status(503).json({
      ok: false,
      error: 'ADMIN_PASSWORD is not set on this deployment, so nobody can sign in.'
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const who = clientHash(req);
  let sql = null;
  if (isConfigured()) {
    try {
      sql = await db();
      if (await tooMany(sql, 'login-fail', who, { limit: FAIL_LIMIT, windowMinutes: FAIL_WINDOW_MINUTES })) {
        return res.status(429).json({
          ok: false,
          error: `Too many failed attempts. Wait ${FAIL_WINDOW_MINUTES} minutes and try again.`
        });
      }
    } catch (err) {
      console.error('rate check failed:', err);
    }
  }

  const good = checkPassword(body && body.password);

  if (!good) {
    if (sql) { try { await record(sql, 'login-fail', who); } catch {} }
    /* Slow every failure down a little; the message never says which part was
       wrong because there is only one part. */
    await new Promise((r) => setTimeout(r, 400));
    return res.status(401).json({ ok: false, error: 'Wrong password.' });
  }

  setSessionCookie(res, makeToken());
  return res.status(200).json({ ok: true, database: isConfigured() });
}
