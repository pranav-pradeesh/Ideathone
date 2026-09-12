/* Postgres access. Works with any Neon/Vercel Postgres connection string. */

import { neon } from '@neondatabase/serverless';

const URL_VARS = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'POSTGRES_PRISMA_URL',
  'DATABASE_URL_UNPOOLED',
  'POSTGRES_URL_NON_POOLING'
];

let client = null;
let ready = null;

const POSTGRES_URL_RE = /^postgres(ql)?:\/\/\S+/i;

/* Rank candidate variables. Vercel's storage integrations let you choose a
   name prefix, so DATABASE_URL can arrive as storage_DATABASE_URL — and they
   set a dozen variants alongside it, several of which are the wrong choice:
   _NO_SSL fails against Neon, and the unpooled/direct URLs are not what a
   serverless function should hold open. Higher score wins. */
function score(name) {
  const n = name.toUpperCase();
  if (/NO_SSL/.test(n)) return -1;                 // never: Neon requires SSL
  if (/(^|_)DATABASE_URL$/.test(n)) return 100;    // pooled, the one we want
  if (/(^|_)POSTGRES_URL$/.test(n)) return 90;
  if (/PRISMA/.test(n)) return 40;                 // works, but shaped for Prisma
  if (/UNPOOLED|NON_POOLING/.test(n)) return 30;   // direct connection
  return 50;
}

/* Returns { name, value } for the best candidate, or null. The name comes from
   the selection itself: several variables hold the identical URL, so looking
   one up by value afterwards reports whichever happened to come first. */
function selectConnection() {
  const usable = [];

  for (const [name, value] of Object.entries(process.env)) {
    if (typeof value !== 'string') continue;
    const v = value.trim();
    /* A name being set is not enough — a DATABASE_URL left empty or holding a
       placeholder must not shadow a real connection string elsewhere. */
    if (!POSTGRES_URL_RE.test(v)) continue;
    const s = score(name);
    if (s >= 0) usable.push({ name, value: v, score: s });
  }

  if (!usable.length) return null;

  usable.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    /* Tie-break on the exact names we document, then alphabetically so the
       choice is stable across cold starts. */
    const ai = URL_VARS.indexOf(a.name), bi = URL_VARS.indexOf(b.name);
    const an = ai < 0 ? 99 : ai, bn = bi < 0 ? 99 : bi;
    if (an !== bn) return an - bn;
    return a.name.localeCompare(b.name);
  });

  return usable[0];
}

export function connectionString() {
  const chosen = selectConnection();
  return chosen ? chosen.value : null;
}

/* Which variable was chosen — name only, for diagnostics. */
export function connectionVarName() {
  const chosen = selectConnection();
  return chosen ? chosen.name : null;
}

export function isConfigured() {
  return connectionString() !== null;
}

/* Names only, never values — enough for an organiser to see whether the
   integration landed and under what prefix. Admin-only. */
export function envDiagnostics() {
  /* Match whole words, not substrings: a bare /PG/ also matches RIPGREP. */
  const looksRelevant = (n) =>
    /(^|_)(DATABASE|POSTGRES|NEON|SUPABASE)(_|$)/i.test(n) ||
    /^PG(HOST|USER|PASSWORD|DATABASE|PORT|SSLMODE)$/i.test(n);
  const present = Object.keys(process.env).filter(looksRelevant).sort();
  const withUrl = Object.entries(process.env)
    .filter(([, v]) => typeof v === 'string' && POSTGRES_URL_RE.test(v.trim()))
    .map(([n]) => n).sort();
  return {
    checkedNames: URL_VARS,
    databaseLikeVars: present,
    varsHoldingAPostgresUrl: withUrl,
    usingVar: connectionVarName()
  };
}

function sqlClient() {
  if (!client) {
    const url = connectionString();
    if (!url) throw new Error('no database connection string');
    client = neon(url);
  }
  return client;
}

/* Create the tables on first use. Cheap enough to run per cold start, and it
   means deploying needs no migration step. */
export async function db() {
  const sql = sqlClient();
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS registrations (
          ref           TEXT PRIMARY KEY,
          registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          team_name     TEXT NOT NULL,
          members       JSONB NOT NULL,
          source_hash   TEXT
        )`;
      /* Branch moved from the team to the member, so a team can mix branches.
         A database created before that change still has a NOT NULL team-level
         column, which would reject every new insert. */
      await sql`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'registrations' AND column_name = 'branch'
          ) THEN
            ALTER TABLE registrations ALTER COLUMN branch DROP NOT NULL;
          END IF;
        END $$`;
      /* The real duplicate guard: two people submitting the same team name at
         the same moment cannot both win. */
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS registrations_team_name_key
        ON registrations (lower(btrim(team_name)))`;
      await sql`
        CREATE TABLE IF NOT EXISTS rate_events (
          id       BIGSERIAL PRIMARY KEY,
          bucket   TEXT NOT NULL,
          key_hash TEXT NOT NULL,
          at       TIMESTAMPTZ NOT NULL DEFAULT now()
        )`;
      await sql`
        CREATE INDEX IF NOT EXISTS rate_events_lookup
        ON rate_events (bucket, key_hash, at DESC)`;
      return true;
    })().catch((err) => { ready = null; throw err; });
  }
  await ready;
  return sql;
}

export function rowToEntry(row) {
  return {
    ref: row.ref,
    registeredAt: stamp(row.registered_at),
    teamName: row.team_name,
    members: Array.isArray(row.members) ? row.members : []
  };
}

/* 'YYYY-MM-DD HH:MM' in the event's timezone, so the sheet reads like a clock
   rather than a UTC timestamp. */
export function stamp(value, tz = process.env.EVENT_TIMEZONE || 'Asia/Kolkata') {
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d)) return '';
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(d).reduce((a, p) => (a[p.type] = p.value, a), {});
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
  } catch {
    return d.toISOString().slice(0, 16).replace('T', ' ');
  }
}
