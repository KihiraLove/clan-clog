import assert from 'node:assert/strict';
import { test } from 'node:test';
import { authRetrySeconds } from './auth-retry.ts';
import { LiveAdminClient, AdminRequestError } from './admin-api.ts';

test('authentication Retry-After accepts bounded positive delta-seconds only', () => {
  for (const [header, seconds] of [
    ['1', 1],
    ['17', 17],
    ['60', 60],
  ] as const)
    assert.equal(authRetrySeconds(header), seconds);
  for (const header of [
    null,
    '',
    '0',
    '-1',
    '1.5',
    '1e1',
    ' 5',
    '999999999',
    '61',
    'Wed, 21 Oct 2026 07:28:00 GMT',
  ])
    assert.equal(authRetrySeconds(header), undefined);
});
test('login transports a safe cooldown while redacting arbitrary server messages', async () => {
  for (const header of ['3', '1', null, 'malformed', '999999999']) {
    const client = new LiveAdminClient(
      async () =>
        new Response(JSON.stringify({ error: 'private database detail' }), {
          status: 429,
          headers: header ? { 'Retry-After': header } : {},
        }),
    );
    await assert.rejects(
      client.login('user', 'password', new AbortController().signal),
      (error) => {
        assert.ok(error instanceof AdminRequestError);
        assert.equal(error.status, 429);
        assert.equal(
          error.retryAfterSeconds,
          header === '3' ? 3 : header === '1' ? 1 : 60,
        );
        assert.ok(!error.message.includes('private'));
        return true;
      },
    );
  }
});
