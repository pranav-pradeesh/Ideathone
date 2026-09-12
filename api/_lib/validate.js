/* Server-side validation of a registration.
 *
 * The browser checks the same rules, but the browser is not a gate: anything
 * can POST to this endpoint. These limits are the ones that actually hold.
 */

export const MAX_MEMBERS = 3;
export const BRANCHES = [
  'Mechatronics',
  'Mechanical Engineering',
  'CSE A',
  'CSE B',
  'CSE AI/ML',
  'EEE',
  'ECE'
];

const LIMITS = { teamName: 60, memberName: 60 };

function text(v) {
  return typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '';
}

export function normalisePhone(raw) {
  let d = String(raw ?? '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d.length === 10 ? d : '';
}

export function makeRef(teamName) {
  const slug = (String(teamName).toUpperCase().replace(/[^A-Z0-9]/g, '') + 'XXX').slice(0, 3);
  return 'ID60-' + slug + '-' + Math.floor(Math.random() * 9000 + 1000);
}

/* Returns { entry } or { error, field }. */
export function validate(body) {
  if (!body || typeof body !== 'object') return { error: 'Malformed request.' };

  /* Bots fill in every field they find; a human never sees this one. */
  if (text(body.website)) return { error: 'Rejected.', field: 'website' };

  const branch = text(body.branch);
  if (!branch) return { error: 'Choose a branch of study.', field: 'branch' };
  if (!BRANCHES.includes(branch)) return { error: 'Unknown branch of study.', field: 'branch' };

  const teamName = text(body.teamName);
  if (!teamName) return { error: 'Give your team a name.', field: 'teamName' };
  if (teamName.length > LIMITS.teamName) {
    return { error: `Team name must be ${LIMITS.teamName} characters or fewer.`, field: 'teamName' };
  }

  const raw = Array.isArray(body.members) ? body.members : [];
  if (!raw.length) return { error: 'Add at least one member.', field: 'members' };
  if (raw.length > MAX_MEMBERS) {
    return { error: `Teams are capped at ${MAX_MEMBERS} members.`, field: 'members' };
  }

  const members = [];
  const seenName = new Set();
  const seenPhone = new Set();

  for (let i = 0; i < raw.length; i++) {
    const name = text(raw[i] && raw[i].name);
    if (!name) return { error: `Member ${i + 1} needs a name.`, field: `member${i + 1}Name` };
    if (name.length > LIMITS.memberName) {
      return { error: `Member ${i + 1}'s name is too long.`, field: `member${i + 1}Name` };
    }
    if (seenName.has(name.toLowerCase())) {
      return { error: 'Two members have the same name.', field: `member${i + 1}Name` };
    }
    seenName.add(name.toLowerCase());

    const phone = normalisePhone(raw[i] && raw[i].phone);
    if (!phone) {
      return { error: `Member ${i + 1} needs a valid 10-digit phone number.`, field: `member${i + 1}Phone` };
    }
    if (seenPhone.has(phone)) {
      return { error: 'Two members share a phone number.', field: `member${i + 1}Phone` };
    }
    seenPhone.add(phone);

    members.push({ name, phone });
  }

  return { entry: { ref: makeRef(teamName), branch, teamName, members } };
}
