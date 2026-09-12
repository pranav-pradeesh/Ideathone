/* POST /api/register — public team registration. */

import { db, isConfigured, rowToEntry, stamp } from './_lib/db.js';
import { validate } from './_lib/validate.js';
import { clientHash } from './_lib/auth.js';
import { tooMany, record } from './_lib/rate.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Use POST.' });
  }

  if (!isConfigured()) {
    /* No database wired up yet. 503 tells the page to keep the entry on the
       device instead of losing it. */
    return res.status(503).json({ ok: false, error: 'No database is configured for this deployment.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }

  const result = validate(body);
  if (result.error) {
    return res.status(400).json({ ok: false, error: result.error, field: result.field });
  }

  const entry = result.entry;
  const who = clientHash(req);

  try {
    const sql = await db();

    if (await tooMany(sql, 'register', who, { limit: 12, windowMinutes: 60 })) {
      return res.status(429).json({
        ok: false,
        error: 'Too many registrations from this connection in the last hour. Ask an organiser.'
      });
    }

    const rows = await sql`
      INSERT INTO registrations (ref, team_name, members, source_hash)
      VALUES (${entry.ref}, ${entry.teamName},
              ${JSON.stringify(entry.members)}::jsonb, ${who})
      RETURNING ref, registered_at`;

    await record(sql, 'register', who);

    return res.status(201).json({
      ok: true,
      ref: rows[0].ref,
      registeredAt: stamp(rows[0].registered_at)
    });
  } catch (err) {
    /* 23505 = unique violation, i.e. the team name is taken. */
    if (err && (err.code === '23505' || /duplicate key/i.test(err.message || ''))) {
      return res.status(409).json({
        ok: false,
        field: 'teamName',
        error: 'A team with that name is already registered. Pick another.'
      });
    }
    console.error('register failed:', err);
    return res.status(500).json({ ok: false, error: 'Could not save the registration. Try again.' });
  }
}
