/* Server-side validation of a registration.
 *
 * The browser checks the same rules, but the browser is not a gate: anything
 * can POST to this endpoint. These limits are the ones that actually hold.
 */

export const MAX_MEMBERS = 4;
export const MIN_MEMBERS = 3;

/* Roles are fixed by position: members 1-3 are always the Team Lead, the
   Presentation Maker and the Researcher, in that order. A fourth member picks
   one of the last two. Nothing is free-choice, so the three compulsory roles
   cannot be missing. */
export const ROLES = [
  'Team Lead',
  'Presentation Maker',
  'Researcher',
  'Innovation Lead',
  'Problem Analyst'
];
export const REQUIRED_ROLES = ['Team Lead', 'Presentation Maker', 'Researcher'];
export const FOURTH_ROLES = ['Innovation Lead', 'Problem Analyst'];

/* The role a member at this index must hold, or null when it is a choice. */
export function roleForPosition(i) {
  return i < REQUIRED_ROLES.length ? REQUIRED_ROLES[i] : null;
}
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

  const teamName = text(body.teamName);
  if (!teamName) return { error: 'Give your team a name.', field: 'teamName' };
  if (teamName.length > LIMITS.teamName) {
    return { error: `Team name must be ${LIMITS.teamName} characters or fewer.`, field: 'teamName' };
  }

  const raw = Array.isArray(body.members) ? body.members : [];
  if (raw.length < MIN_MEMBERS) {
    return { error: `A team needs at least ${MIN_MEMBERS} members.`, field: 'members' };
  }
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

    const branch = text(raw[i] && raw[i].branch);
    if (!branch) {
      return { error: `Member ${i + 1} needs a branch of study.`, field: `member${i + 1}Branch` };
    }
    if (!BRANCHES.includes(branch)) {
      return { error: `Member ${i + 1}'s branch is not on the list.`, field: `member${i + 1}Branch` };
    }

    /* Members 1-3 hold a fixed role; accept it if sent, fill it in if not. */
    const fixed = roleForPosition(i);
    let role = text(raw[i] && raw[i].role);
    if (fixed) {
      if (role && role !== fixed) {
        return {
          error: `Member ${i + 1} is the ${fixed}. That position is not a choice.`,
          field: `member${i + 1}Role`
        };
      }
      role = fixed;
    } else {
      if (!role) {
        return {
          error: `Member ${i + 1} must be the Innovation Lead or the Problem Analyst.`,
          field: `member${i + 1}Role`
        };
      }
      if (!FOURTH_ROLES.includes(role)) {
        return {
          error: `Member ${i + 1} can only be the Innovation Lead or the Problem Analyst.`,
          field: `member${i + 1}Role`
        };
      }
    }

    const phone = normalisePhone(raw[i] && raw[i].phone);
    if (!phone) {
      return { error: `Member ${i + 1} needs a valid 10-digit phone number.`, field: `member${i + 1}Phone` };
    }
    if (seenPhone.has(phone)) {
      return { error: 'Two members share a phone number.', field: `member${i + 1}Phone` };
    }
    seenPhone.add(phone);

    members.push({ name, branch, role, phone });
  }

  return { entry: { ref: makeRef(teamName), teamName, members } };
}
