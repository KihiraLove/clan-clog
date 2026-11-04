import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectorDisplayName,
  collectorNamesConfirmation,
  normalizePlayerName,
  type CollectorNamePreview,
} from '@clog/domain';
import {
  parseCollectorPreview,
  apply,
  preview,
  collectors,
} from './collector-name-api.ts';
const id = '00000000-0000-4000-8000-000000000001',
  target = '00000000-0000-4000-8000-000000000002';
const seed: CollectorNamePreview = {
  token: id,
  operation: 'rename',
  source: { id, name: 'Alice', version: '1', historyVersion: '3' },
  target: null,
  newName: 'Alice New',
  counts: { pending: 1, approved: 2, rejected: 0, revoked: 1 },
};
test('name validation and exact two-line confirmations preserve escaped React text and display-only changes', () => {
  assert.equal(collectorDisplayName(' Alice\u00a0  Smith '), 'Alice Smith');
  assert.equal(
    normalizePlayerName(collectorDisplayName('ALICE_SMITH')),
    'alice smith',
  );
  for (const invalid of [
    '',
    '  ',
    '___',
    null,
    {},
    'x'.repeat(81),
    'Alice\0Bob',
  ])
    assert.throws(() => collectorDisplayName(invalid));
  assert.equal(
    collectorNamesConfirmation(false, 'Alice', 'Bob'),
    'Are you sure you want to change user Alice to Bob?\nThis action cannot be reversed.',
  );
  assert.equal(
    collectorNamesConfirmation(true, 'Alice', 'Bob'),
    'Are you sure you want to merge user Alice to existing Bob?\nThis action cannot be reversed.',
  );
  assert.equal(
    collectorNamesConfirmation(false, '<img>', 'A&B'),
    'Are you sure you want to change user <img> to A&B?\nThis action cannot be reversed.',
  );
});
test('preview parsing requires explicit operation, valid identities, scope versions and nonnegative counts', () => {
  assert.deepEqual(parseCollectorPreview(seed), seed);
  for (const invalid of [
    { ...seed, operation: 'merge' },
    { ...seed, source: { ...seed.source, historyVersion: '0' } },
    { ...seed, counts: { ...seed.counts, approved: -1 } },
    { ...seed, token: 'invalid' },
    { ...seed, target: seed.source, operation: 'merge' },
  ])
    assert.throws(() => parseCollectorPreview(invalid));
  const merge = {
    ...seed,
    operation: 'merge',
    target: { ...seed.source, id: target, name: 'Bob' },
    newName: 'Bob',
  };
  assert.equal(parseCollectorPreview(merge).operation, 'merge');
});
test('transport protects writes and verifies the exact confirmed receipt while allowing the same uncertain retry key', async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  const calls: { url: string; init: RequestInit }[] = [];
  const receipt = {
    operationId: target,
    operation: 'rename',
    sourceId: id,
    targetId: id,
    originalName: 'Alice',
    newName: 'Alice New',
    counts: seed.counts,
  };
  let value: unknown = receipt;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init: init! });
    return new Response(JSON.stringify(value), { status: 200 });
  };
  const signal = new AbortController().signal;
  assert.deepEqual(await apply(seed, target, 'csrf', signal), receipt);
  await apply(seed, target, 'csrf', signal);
  assert.equal(calls[0]!.init.credentials, 'same-origin');
  assert.equal(calls[0]!.init.cache, 'no-store');
  assert.deepEqual(calls[0]!.init.headers, {
    'Content-Type': 'application/json',
    'X-CSRF-Token': 'csrf',
    'Idempotency-Key': target,
  });
  assert.equal(calls[0]!.init.body, calls[1]!.init.body);
  for (const bad of [
    { ...receipt, newName: 'Unconfirmed' },
    { ...receipt, operation: 'merge' },
    { ...receipt, targetId: target },
    { ...receipt, counts: { ...seed.counts, approved: 9 } },
  ]) {
    value = bad;
    await assert.rejects(apply(seed, target, 'csrf', signal));
  }
  value = seed;
  await preview(id, 'Alice New', 'csrf', signal);
  assert.ok(!Object.hasOwn(calls.at(-1)!.init.headers!, 'Idempotency-Key'));
  value = { ...seed, source: { ...seed.source, id: target } };
  await assert.rejects(preview(id, 'Alice New', 'csrf', signal));
  value = { collectors: [seed.source], hasMore: false };
  assert.equal((await collectors('Alice Smith', signal)).collectors.length, 1);
  assert.ok(calls.at(-1)!.url.endsWith('search=Alice%20Smith'));
});
