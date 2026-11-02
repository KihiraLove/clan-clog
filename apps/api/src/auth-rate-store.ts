/** Durable admission, serialized for bounded shared cardinality and cleanup. */
import type pg from 'pg';
import { createHash } from 'node:crypto';
import {
  authPolicy,
  type AuthAttempt,
  type AuthAdmission,
  type AuthScope,
} from './auth-admission.js';
import { transaction } from './transaction.js';

const stateKey = 'auth:v2:state';
const prefix = 'auth:v2:';

export async function admitAuthentication(
  pool: pg.Pool,
  attempt: AuthAttempt,
): Promise<AuthAdmission> {
  const directScope = 'sourceHash' in attempt ? 'source' : 'account';
  const directDigest =
    'sourceHash' in attempt
      ? attempt.sourceHash
      : createHash('sha256').update(attempt.accountId).digest('hex');
  // A denial is a read, so repeated rejected attempts cannot monopolize the
  // shared metadata lock. Admission still rechecks atomically below.
  const blocked = (
    await pool.query<{ seconds: number }>(
      `SELECT LEAST($3::int,GREATEST(1,ceil(extract(epoch FROM expires_at-clock_timestamp()))::int)) AS seconds
     FROM auth_rate_limits WHERE key_hash=$1 AND attempts>=$2 AND expires_at>clock_timestamp()`,
      [
        prefix + directScope + ':' + directDigest,
        authPolicy[directScope],
        authPolicy.windowSeconds,
      ],
    )
  ).rows[0];
  if (blocked)
    return {
      allowed: false,
      scope: directScope,
      retryAfterSeconds: blocked.seconds,
    };
  return transaction(pool, 'write', async (client) => {
    // All workers take this one short metadata-row lock. No password work is
    // done while holding it. Timeouts bound contention, including cleanup.
    await client.query("SET LOCAL lock_timeout='250ms'");
    await client.query("SET LOCAL statement_timeout='1000ms'");
    await client.query(
      "INSERT INTO auth_rate_limits(key_hash,attempts,expires_at) VALUES($1,0,'infinity') ON CONFLICT DO NOTHING",
      [stateKey],
    );
    const state = (
      await client.query<{ attempts: number }>(
        'SELECT attempts FROM auth_rate_limits WHERE key_hash=$1 FOR UPDATE',
        [stateKey],
      )
    ).rows[0]!;
    // Read database time after waiting for admission, not at transaction start.
    const now = (
      await client.query<{ now: Date }>('SELECT clock_timestamp() AS now')
    ).rows[0]!.now;
    const removed = await client.query<{ key_hash: string }>(
      `DELETE FROM auth_rate_limits WHERE key_hash IN (
        SELECT key_hash FROM auth_rate_limits WHERE expires_at<=$1
        ORDER BY expires_at LIMIT $2 FOR UPDATE SKIP LOCKED
      ) RETURNING key_hash`,
      [now, authPolicy.cleanupBatch],
    );
    let count =
      state.attempts -
      removed.rows.filter((row) => row.key_hash.startsWith(prefix)).length;
    if (count < 0 || count > authPolicy.maxBuckets) throw new Error();

    async function reserve(
      scope: AuthScope,
      digest: string,
    ): Promise<AuthAdmission> {
      const key = prefix + scope + ':' + digest;
      const existing = (
        await client.query<{ attempts: number; expires_at: Date }>(
          'SELECT attempts,expires_at FROM auth_rate_limits WHERE key_hash=$1',
          [key],
        )
      ).rows[0];
      if (!existing && count >= authPolicy.maxBuckets)
        return { allowed: false, scope: 'capacity', retryAfterSeconds: 60 };
      const result = await client.query(
        `INSERT INTO auth_rate_limits(key_hash,attempts,expires_at)
         VALUES($1,1,$2::timestamptz + $3 * interval '1 second')
         ON CONFLICT(key_hash) DO UPDATE SET
           attempts=CASE WHEN auth_rate_limits.expires_at<=$2 THEN 1 ELSE auth_rate_limits.attempts+1 END,
           expires_at=CASE WHEN auth_rate_limits.expires_at<=$2 THEN EXCLUDED.expires_at ELSE auth_rate_limits.expires_at END
         WHERE auth_rate_limits.expires_at<=$2 OR auth_rate_limits.attempts<$4
         RETURNING attempts`,
        [key, now, authPolicy.windowSeconds, authPolicy[scope]],
      );
      if (!existing) count++;
      if (result.rowCount) return { allowed: true };
      return {
        allowed: false,
        scope,
        retryAfterSeconds: Math.max(
          1,
          Math.min(
            authPolicy.windowSeconds,
            Math.ceil((existing!.expires_at.getTime() - now.getTime()) / 1000),
          ),
        ),
      };
    }
    let decision: AuthAdmission;
    if ('sourceHash' in attempt) {
      decision = await reserve('source', attempt.sourceHash);
      if (decision.allowed) {
        // Use exactly the same PostgreSQL lower()/collation as account lookup.
        // Only the digest is persisted, equally for unknown/disabled accounts.
        const identity = (
          await client.query<{ digest: string }>(
            "SELECT encode(sha256(convert_to(lower($1::text),'UTF8')),'hex') AS digest",
            [attempt.username],
          )
        ).rows[0]!.digest;
        decision = await reserve('identity', identity);
      }
    } else {
      decision = await reserve('account', directDigest);
    }
    if (count !== state.attempts)
      await client.query(
        'UPDATE auth_rate_limits SET attempts=$2 WHERE key_hash=$1',
        [stateKey, count],
      );
    return decision;
  });
}
