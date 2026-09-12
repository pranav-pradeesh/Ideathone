/* GET    /api/admin/registrations        — every team, newest last
   DELETE /api/admin/registrations?ref=…  — remove one team
   Both require a valid admin session. */

import { db, isConfigured, rowToEntry } from '../_lib/db.js';
import { requireAdmin } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  if (!isConfigured()) {
    return res.status(503).json({
      ok: false,
      error: 'No database is configured for this deployment, so there is nothing to collect.'
    });
  }

  try {
    const sql = await db();

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT ref, registered_at, team_name, members
        FROM registrations ORDER BY registered_at ASC`;
      return res.status(200).json({ ok: true, entries: rows.map(rowToEntry) });
    }

    if (req.method === 'DELETE') {
      const ref = String(req.query?.ref || '').trim();
      if (!ref) return res.status(400).json({ ok: false, error: 'Which team? Pass ?ref=' });
      const rows = await sql`DELETE FROM registrations WHERE ref = ${ref} RETURNING ref`;
      if (!rows.length) return res.status(404).json({ ok: false, error: 'No team with that reference.' });
      return res.status(200).json({ ok: true, ref: rows[0].ref });
    }

    res.setHeader('Allow', 'GET, DELETE');
    return res.status(405).json({ ok: false, error: 'Use GET or DELETE.' });
  } catch (err) {
    console.error('admin registrations failed:', err);
    return res.status(500).json({ ok: false, error: 'Could not read the registrations.' });
  }
}
