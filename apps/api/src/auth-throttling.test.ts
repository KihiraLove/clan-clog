/** Admission regressions use fake clocks/verifiers, never a live installation. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { OperationalDiagnostics } from '@clog/domain';
import { createApp } from './app.js';
import { PasswordHasher } from './passwords.js';
import {
  authPolicy,
  loginSourceHash,
  type AuthAttempt,
  type AuthAdmission,
  type AuthScope,
} from './auth-admission.js';
import type { BackendStore, StoredSession } from './types.js';

class FakeAdmission {
  now = 100000;
  buckets = new Map<string, { attempts: number; until: number }>();
  async allow(attempt: AuthAttempt): Promise<AuthAdmission> {
    const reserve = (scope: AuthScope, value: string): AuthAdmission => {
      const key = scope + ':' + value;
      let bucket = this.buckets.get(key);
      if (!bucket || bucket.until <= this.now) {
        bucket = { attempts: 0, until: this.now + 60000 };
        this.buckets.set(key, bucket);
      }
      if (bucket.attempts >= authPolicy[scope])
        return {
          allowed: false,
          scope,
          retryAfterSeconds: Math.ceil((bucket.until - this.now) / 1000),
        };
      bucket.attempts++;
      return { allowed: true };
    };
    if ('accountId' in attempt) return reserve('account', attempt.accountId);
    const source = reserve('source', attempt.sourceHash);
    return source.allowed
      ? reserve('identity', attempt.username.toLowerCase())
      : source;
  }
}
async function fixture(setup = false) {
  const rate = new FakeAdmission();
  let verifies = 0,
    lookups = 0;
  const passwords = new PasswordHasher(undefined, async (password, salt) => {
    verifies++;
    return createHash('sha512').update(password).update(salt).digest();
  });
  const encoded = await passwords.hash('correct-password');
  const staff = new Map(
    ['admin', 'reviewer', 'disabled'].map((name) => [
      name,
      {
        id: name,
        username: name,
        role: 'admin' as const,
        mustChangePassword: setup,
        disabled: name === 'disabled',
        credentialVersion: 1,
        passwordHash: encoded,
      },
    ]),
  );
  const sessions = new Map<string, StoredSession>();
  const store = {
    ensureDefaultAdmin: async () => undefined,
    allowLogin: (attempt: AuthAttempt) => rate.allow(attempt),
    accountByUsername: async (name: string) => {
      lookups++;
      return staff.get(name.toLowerCase()) ?? null;
    },
    accountById: async (id: string) => staff.get(id) ?? null,
    createSession: async (
      key: string,
      identity: Omit<StoredSession, 'expiresAt'>,
      expiresAt: Date,
    ) => {
      sessions.set(key, { ...identity, expiresAt });
    },
    session: async (key: string) => sessions.get(key) ?? null,
    deleteSession: async (key: string) => {
      sessions.delete(key);
    },
    updateAccount: async (
      id: string,
      version: number,
      username: string,
      hash?: string,
    ) => {
      const account = staff.get(id)!;
      Object.assign(account, {
        username,
        credentialVersion: version + 1,
        mustChangePassword: false,
        ...(hash ? { passwordHash: hash } : {}),
      });
      return account;
    },
  };
  const records: Record<string, unknown>[] = [];
  const origin = 'https://clog.example.com';
  const app = createApp(undefined, undefined, {
    store: store as unknown as BackendStore,
    auth: { origin, secret: 'a'.repeat(64), secure: true },
    logger: false,
    passwords,
    diagnostics: new OperationalDiagnostics('api', (record) =>
      records.push(record),
    ),
  });
  await app.ready();
  verifies = 0;
  const login = (
    name = 'admin',
    ip = '198.51.100.1',
    password = 'wrong-password',
  ) =>
    app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      remoteAddress: ip,
      headers: { origin },
      payload: { username: name, password },
    });
  return {
    app,
    store,
    rate,
    login,
    records,
    origin,
    counts: () => ({ verifies, lookups }),
  };
}

test('distributed case variants share a username window; cooldown never slides and recovers automatically', async (t) => {
  const f = await fixture();
  t.after(() => f.app.close());
  for (let n = 0; n < 5; n++)
    assert.equal(
      (await f.login(n % 2 ? 'ADMIN' : 'admin', '198.51.100.' + (n + 1)))
        .statusCode,
      401,
    );
  const blocked = await f.login('AdMiN', '198.51.100.50');
  assert.equal(blocked.statusCode, 429);
  assert.equal(blocked.headers['retry-after'], '60');
  assert.equal(blocked.headers['cache-control'], 'no-store');
  assert.deepEqual(f.counts(), { verifies: 5, lookups: 5 });
  assert.equal(
    (await f.login('reviewer', '198.51.100.1', 'correct-password')).statusCode,
    200,
  );
  f.rate.now += 43001;
  for (let n = 0; n < 3; n++)
    assert.equal(
      (await f.login('admin', '198.51.100.60')).headers['retry-after'],
      '17',
    );
  assert.deepEqual(f.counts(), { verifies: 6, lookups: 6 });
  assert.equal(
    (await f.login('reviewer', '198.51.100.70', 'correct-password')).statusCode,
    200,
  );
  f.rate.now += 17000;
  assert.equal(
    (await f.login('admin', '198.51.100.80', 'correct-password')).statusCode,
    200,
  );
  const events = f.records.filter((r) => r.event === 'throttle');
  assert.ok(events.length >= 4);
  assert.ok(events.every((r) => r.code === 'AUTH_IDENTITY_LIMIT'));
  const serialized = JSON.stringify(events);
  for (const secret of [
    'admin',
    '198.51.100',
    'wrong-password',
    'cookie',
    'csrf',
  ])
    assert.ok(!serialized.includes(secret));
});

test('source gate counts successful attempts, bounds rotated usernames and runs before lookup/username allocation', async (t) => {
  const f = await fixture();
  t.after(() => f.app.close());
  assert.equal(
    (await f.login('admin', undefined, 'correct-password')).statusCode,
    200,
  );
  for (let n = 1; n < 20; n++)
    assert.equal((await f.login('unknown-' + n)).statusCode, 401);
  assert.equal((await f.login('brand-new')).statusCode, 429);
  assert.deepEqual(f.counts(), { verifies: 20, lookups: 20 });
  assert.ok(!f.rate.buckets.has('identity:brand-new'));
  assert.equal(
    (await f.login('reviewer', '198.51.100.2', 'correct-password')).statusCode,
    200,
  );
});

test('unknown, disabled and existing identities have identical public throttling and dummy verification behavior', async (t) => {
  const bodies = [];
  for (const username of ['admin', 'disabled', 'unknown']) {
    const f = await fixture();
    t.after(() => f.app.close());
    for (let n = 0; n < 5; n++)
      assert.equal(
        (await f.login(username, '192.0.2.' + (n + 1))).statusCode,
        401,
      );
    const result = await f.login(username, '192.0.2.90');
    assert.equal(result.statusCode, 429);
    bodies.push(result.body);
    assert.equal(f.counts().verifies, 5);
  }
  assert.equal(new Set(bodies).size, 1);
});

test('parallel last-slot requests cannot pass either gate or invoke another verifier', async (t) => {
  for (const scope of ['source', 'identity']) {
    const f = await fixture();
    t.after(() => f.app.close());
    const attempt = (n: number) =>
      scope === 'identity'
        ? f.login('admin', '192.0.2.' + (n + 1))
        : f.login('unknown-' + n);
    const limit = scope === 'identity' ? 5 : 20;
    for (let n = 0; n < limit - 1; n++) await attempt(n);
    const before = f.counts();
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, n) => attempt(limit + n)),
    );
    assert.equal(results.filter((r) => r.statusCode === 401).length, 1);
    assert.equal(results.filter((r) => r.statusCode === 429).length, 7);
    assert.equal(f.counts().verifies, before.verifies + 1);
    assert.equal(f.counts().lookups, before.lookups + 1);
  }
});

test('authenticated sessions/logout survive throttling; first-login account checks have an independent five-attempt budget', async (t) => {
  const f = await fixture(true);
  t.after(() => f.app.close());
  const signed = await f.login('admin', undefined, 'correct-password');
  assert.equal(signed.statusCode, 200);
  const cookie = String(signed.headers['set-cookie']).split(';')[0]!;
  const headers = {
    origin: f.origin,
    cookie,
    'x-csrf-token': signed.json().csrfToken,
  };
  const logoutSession = await f.login(
    'admin',
    '198.51.100.2',
    'correct-password',
  );
  assert.equal(logoutSession.statusCode, 200);
  for (let n = 0; n < 3; n++) await f.login('admin', '198.51.100.' + (n + 2));
  assert.equal((await f.login('admin', '198.51.100.90')).statusCode, 429);
  assert.equal(
    (
      await f.app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: {
          origin: f.origin,
          cookie: String(logoutSession.headers['set-cookie']).split(';')[0]!,
          'x-csrf-token': logoutSession.json().csrfToken,
        },
      })
    ).statusCode,
    204,
  );

  assert.equal(
    (
      await f.app.inject({ url: '/api/v1/auth/session', headers: { cookie } })
    ).json().authenticated,
    true,
  );
  for (let n = 0; n < 5; n++)
    assert.equal(
      (
        await f.app.inject({
          method: 'PATCH',
          url: '/api/v1/auth/account',
          headers,
          payload: {
            currentPassword: 'wrong',
            newPassword: 'new-password-long',
          },
        })
      ).statusCode,
      400,
    );
  const before = f.counts().verifies;
  const blocked = await f.app.inject({
    method: 'PATCH',
    url: '/api/v1/auth/account',
    headers,
    payload: {
      currentPassword: 'correct-password',
      newPassword: 'new-password-long',
    },
  });
  assert.equal(blocked.statusCode, 429);
  assert.equal(blocked.headers['retry-after'], '60');
  assert.equal(f.counts().verifies, before);
  // Missing CSRF cannot spend the account budget or run a password check.
  assert.equal(
    (
      await f.app.inject({
        method: 'PATCH',
        url: '/api/v1/auth/account',
        headers: { origin: f.origin, cookie },
        payload: { currentPassword: 'wrong', newPassword: 'new-password-long' },
      })
    ).statusCode,
    403,
  );
  f.rate.now += 60000;
  const saved = await f.app.inject({
    method: 'PATCH',
    url: '/api/v1/auth/account',
    headers,
    payload: {
      currentPassword: 'correct-password',
      newPassword: 'new-password-long',
    },
  });
  assert.equal(saved.statusCode, 200);
  assert.equal(saved.json().mustChangePassword, false);
  const nextCookie = String(saved.headers['set-cookie']).split(';')[0]!;
  assert.equal(
    (
      await f.app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: {
          origin: f.origin,
          cookie: nextCookie,
          'x-csrf-token': saved.json().csrfToken,
        },
      })
    ).statusCode,
    204,
  );
});

test('shared limiter failures and capacity exhaustion fail closed without leaking details or password work', async (t) => {
  for (const capacity of [false, true]) {
    const f = await fixture();
    t.after(() => f.app.close());
    f.store.allowLogin = async () => {
      if (capacity)
        return { allowed: false, scope: 'capacity', retryAfterSeconds: 60 };
      throw Error('driver password=secret address=private');
    };
    const result = await f.login();
    assert.equal(result.statusCode, 503);
    assert.deepEqual(result.json(), {
      error: 'Sign-in is temporarily unavailable. Try again shortly.',
    });
    assert.deepEqual(f.counts(), { verifies: 0, lookups: 0 });
    assert.ok(!JSON.stringify(f.records).includes('private'));
  }
});

test('trusted equivalent IPv4/IPv6 spellings share source hashes', () => {
  assert.equal(
    loginSourceHash('192.0.2.1'),
    loginSourceHash('::ffff:192.0.2.1'),
  );
  assert.equal(
    loginSourceHash('192.0.2.1'),
    loginSourceHash('::FFFF:c000:0201'),
  );
  assert.equal(
    loginSourceHash('2001:db8::1'),
    loginSourceHash('2001:0DB8:0:0:0:0:0:0001'),
  );
  assert.notEqual(
    loginSourceHash('2001:db8::1'),
    loginSourceHash('2001:db8::2'),
  );
  assert.equal(
    loginSourceHash('fe80::1%eth0'),
    loginSourceHash('fe80:0:0:0:0:0:0:1%eth0'),
  );
  assert.throws(() => loginSourceHash('untrusted-forwarded-name'));
});
