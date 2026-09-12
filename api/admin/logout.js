/* POST /api/admin/logout — drop the session cookie. */

import { clearSessionCookie } from '../_lib/auth.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Use POST.' });
  }
  clearSessionCookie(res);
  return res.status(200).json({ ok: true });
}
