/* Rate limiting backed by the database, so it holds across serverless
   instances rather than per warm lambda. */

export async function tooMany(sql, bucket, keyHash, { limit, windowMinutes }) {
  const rows = await sql`
    SELECT count(*)::int AS n FROM rate_events
    WHERE bucket = ${bucket} AND key_hash = ${keyHash}
      AND at > now() - (${windowMinutes} * interval '1 minute')`;
  return (rows[0]?.n ?? 0) >= limit;
}

export async function record(sql, bucket, keyHash) {
  await sql`INSERT INTO rate_events (bucket, key_hash) VALUES (${bucket}, ${keyHash})`;
  /* Opportunistic cleanup; keeps the table from growing without a cron. */
  if (Math.random() < 0.05) {
    await sql`DELETE FROM rate_events WHERE at < now() - interval '1 day'`;
  }
}
