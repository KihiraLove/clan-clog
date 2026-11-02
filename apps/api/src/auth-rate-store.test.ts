/** Requires a disposable database; production time always comes from PostgreSQL. */
import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { randomUUID, createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import pg from 'pg';
import { PgStore } from './store.js';
import { authPolicy, loginSourceHash } from './auth-admission.js';
const skip = !process.env.TEST_DATABASE_URL;
async function fixture(t: TestContext) {
  const connectionString = process.env.TEST_DATABASE_URL!;
  const schema = 'auth_limit_' + randomUUID().replaceAll('-', '');
  const owner = new pg.Pool({ connectionString });
  await owner.query('CREATE SCHEMA ' + schema);
  const options = {
    connectionString,
    options: '-c search_path=' + schema,
    max: 8,
    statement_timeout: 5000,
    connectionTimeoutMillis: 3000,
  };
  const pool = new pg.Pool(options),
    other = new pg.Pool(options);
  t.after(async () => {
    await pool.end();
    await other.end();
    await owner.query('DROP SCHEMA ' + schema + ' CASCADE');
    await owner.end();
  });
  const migrations = new URL(
    '../../../packages/database/migrations/',
    import.meta.url,
  );
  for (const file of (await readdir(migrations))
    .filter((n) => n.endsWith('.sql'))
    .sort())
    await pool.query(await readFile(new URL(file, migrations), 'utf8'));
  return { pool, other, first: new PgStore(pool), second: new PgStore(other) };
}
const hash = (s: string) => createHash('sha256').update(s).digest('hex');

test(
  'PostgreSQL admission shares normalized identity budgets across workers/restarts and serializes the last slot and expiry',
  { skip },
  async (t) => {
    const f = await fixture(t);
    for (let n = 0; n < 4; n++)
      assert.deepEqual(
        await f.first.allowLogin({
          sourceHash: hash('source-' + n),
          username: n % 2 ? 'ADMIN' : 'admin',
        }),
        { allowed: true },
      );
    const last = await Promise.all(
      Array.from({ length: 12 }, (_, n) =>
        (n % 2 ? f.first : f.second).allowLogin({
          sourceHash: hash('parallel-' + n),
          username: 'AdMiN',
        }),
      ),
    );
    assert.equal(last.filter((r) => r.allowed).length, 1);
    assert.equal(
      last.filter((r) => !r.allowed && r.scope === 'identity').length,
      11,
    );
    const key = 'auth:v2:identity:' + hash('admin');
    const original = (
      await f.pool.query('SELECT * FROM auth_rate_limits WHERE key_hash=$1', [
        key,
      ])
    ).rows[0];
    assert.equal(original.attempts, 5);
    // Database clock controls remaining seconds even if the JavaScript clock is wrong.
    await f.pool.query(
      "UPDATE auth_rate_limits SET expires_at=clock_timestamp()+interval '11.5 seconds' WHERE key_hash=$1",
      [key],
    );
    const expires = (
      await f.pool.query(
        'SELECT expires_at FROM auth_rate_limits WHERE key_hash=$1',
        [key],
      )
    ).rows[0].expires_at;
    const old = Date.now;
    Date.now = () => 0;
    try {
      const denied = await new PgStore(f.other).allowLogin({
        sourceHash: hash('restart'),
        username: 'admin',
      });
      assert.ok(
        !denied.allowed &&
          denied.retryAfterSeconds >= 11 &&
          denied.retryAfterSeconds <= 12,
      );
    } finally {
      Date.now = old;
    }
    const same = (
      await f.pool.query('SELECT * FROM auth_rate_limits WHERE key_hash=$1', [
        key,
      ])
    ).rows[0];
    assert.equal(same.attempts, 5);
    assert.equal(same.expires_at.getTime(), expires.getTime());
    await f.pool.query(
      "UPDATE auth_rate_limits SET expires_at=clock_timestamp()-interval '1 second' WHERE key_hash<>$1",
      ['auth:v2:state'],
    );
    const reset = await Promise.all(
      Array.from({ length: 12 }, (_, n) =>
        (n % 2 ? f.first : f.second).allowLogin({
          sourceHash: hash('expiry-' + n),
          username: 'admin',
        }),
      ),
    );
    assert.equal(reset.filter((r) => r.allowed).length, 5);
    assert.equal(
      (
        await f.pool.query(
          'SELECT attempts FROM auth_rate_limits WHERE key_hash=$1',
          [key],
        )
      ).rows[0].attempts,
      5,
    );
    const rows = (await f.pool.query('SELECT key_hash FROM auth_rate_limits'))
      .rows;
    assert.ok(
      rows.every(
        (r) => !r.key_hash.includes('admin') && !r.key_hash.includes('source-'),
      ),
    );
  },
);

test(
  'PostgreSQL source admission precedes identity state and account windows remain independent',
  { skip },
  async (t) => {
    const f = await fixture(t),
      sourceHash = loginSourceHash('192.0.2.1');
    const attempts = await Promise.all(
      Array.from({ length: 25 }, (_, n) =>
        f.first.allowLogin({ sourceHash, username: 'guess-' + n }),
      ),
    );
    assert.equal(attempts.filter((r) => r.allowed).length, 20);
    assert.ok(
      attempts
        .filter((r) => !r.allowed)
        .every((r) => !r.allowed && r.scope === 'source'),
    );
    assert.equal(
      (
        await f.pool.query(
          "SELECT count(*)::int AS n FROM auth_rate_limits WHERE key_hash LIKE 'auth:v2:identity:%'",
        )
      ).rows[0].n,
      20,
    );
    const account = await Promise.all(
      Array.from({ length: 9 }, (_, n) =>
        (n % 2 ? f.first : f.second).allowLogin({ accountId: 'staff-account' }),
      ),
    );
    assert.equal(account.filter((r) => r.allowed).length, 5);
    assert.ok(
      account
        .filter((r) => !r.allowed)
        .every((r) => !r.allowed && r.scope === 'account'),
    );
    assert.deepEqual(
      await f.first.allowLogin({ accountId: 'another-account' }),
      { allowed: true },
    );
  },
);

test(
  'bounded cleanup preserves legacy/live state and capacity denial still charges the admitted source',
  { skip },
  async (t) => {
    const f = await fixture(t);
    await f.first.allowLogin({
      sourceHash: hash('existing'),
      username: 'existing',
    });
    await f.pool.query(
      "INSERT INTO auth_rate_limits SELECT 'auth:v2:identity:'||md5(n::text)||md5(n::text),0,clock_timestamp()+interval '1 minute' FROM generate_series(1,$1) n",
      [authPolicy.maxBuckets - 2],
    );
    await f.pool.query(
      'UPDATE auth_rate_limits SET attempts=$2 WHERE key_hash=$1',
      ['auth:v2:state', authPolicy.maxBuckets],
    );
    await f.pool.query(
      "INSERT INTO auth_rate_limits SELECT 'legacy-expired-'||n,1,clock_timestamp()-interval '1 minute' FROM generate_series(1,200) n",
    );
    assert.deepEqual(
      await f.first.allowLogin({
        sourceHash: hash('existing'),
        username: 'new-identity',
      }),
      { allowed: false, scope: 'capacity', retryAfterSeconds: 60 },
    );
    assert.equal(
      (
        await f.pool.query(
          "SELECT count(*)::int AS n FROM auth_rate_limits WHERE key_hash LIKE 'legacy-expired-%'",
        )
      ).rows[0].n,
      200 - authPolicy.cleanupBatch,
    );
    assert.equal(
      (
        await f.pool.query(
          'SELECT attempts FROM auth_rate_limits WHERE key_hash=$1',
          ['auth:v2:source:' + hash('existing')],
        )
      ).rows[0].attempts,
      2,
    );
    assert.deepEqual(
      await f.second.allowLogin({
        sourceHash: hash('existing'),
        username: 'existing',
      }),
      { allowed: true },
    );
    // Reclaim only a bounded batch, then admit a fresh source/identity normally.
    await f.pool.query(
      "UPDATE auth_rate_limits SET expires_at=clock_timestamp()-interval '2 minutes' WHERE key_hash IN (SELECT key_hash FROM auth_rate_limits WHERE key_hash LIKE 'auth:v2:identity:%' LIMIT 70)",
    );
    assert.deepEqual(
      await f.first.allowLogin({
        sourceHash: hash('recovered'),
        username: 'recovered',
      }),
      { allowed: true },
    );
    const counts = (
      await f.pool.query(
        "SELECT (SELECT attempts FROM auth_rate_limits WHERE key_hash='auth:v2:state') AS tracked,count(*)::int AS actual FROM auth_rate_limits WHERE key_hash LIKE 'auth:v2:%' AND key_hash<>'auth:v2:state'",
      )
    ).rows[0];
    assert.equal(counts.tracked, counts.actual);
    assert.ok(counts.actual <= authPolicy.maxBuckets);
  },
);

test(
  'limiter storage failures and lock contention fail closed within a bounded deadline',
  { skip },
  async (t) => {
    const f = await fixture(t);
    await f.first.allowLogin({ accountId: 'owner' });
    for (let n = 0; n < 5; n++)
      await f.first.allowLogin({ accountId: 'blocked' });
    const client = await f.other.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'SELECT * FROM auth_rate_limits WHERE key_hash=$1 FOR UPDATE',
        ['auth:v2:state'],
      );
      // Rejected retries bypass the held metadata lock instead of joining it.
      const blocked = await f.first.allowLogin({ accountId: 'blocked' });
      assert.ok(!blocked.allowed && blocked.scope === 'account');
      const started = Date.now();
      await assert.rejects(f.first.allowLogin({ accountId: 'owner' }), {
        code: '55P03',
      });
      assert.ok(Date.now() - started < 3000);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
    await f.pool.query(
      'ALTER TABLE auth_rate_limits RENAME TO unavailable_rate_limits',
    );
    await assert.rejects(f.first.allowLogin({ accountId: 'owner' }), {
      code: '42P01',
    });
  },
);
