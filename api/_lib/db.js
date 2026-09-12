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

export function connectionString() {
  for (const name of URL_VARS) {
    const v = process.env[name];
    if (v && v.trim()) return v.trim();
  }
  /* Vercel's storage integrations let you choose a variable prefix, which
     turns DATABASE_URL into something like NEON_DATABASE_URL and would make
     the fixed list above miss a perfectly good database. Fall back to any
     variable whose value is a postgres connection string. */
  for (const [name, value] of Object.entries(process.env)) {
    if (typeof value === 'string' && POSTGRES_URL_RE.test(value.trim())) {
      return value.trim();
    }
  }
  return null;
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
    varsHoldingAPostgresUrl: withUrl
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
