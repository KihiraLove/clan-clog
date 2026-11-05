import assert from 'node:assert/strict';
import test from 'node:test';
import { load, parseCollectorMode, save } from './collector-mode-api.ts';
const id = '00000000-0000-4000-8000-000000000133',
  revision = 'collector-mode-' + id + '-1-1';
test('profile parsing requires explicit nullable canonical mode and an identity-bound revision', () => {
  assert.equal(
    parseCollectorMode({
      collectorId: id,
      collectorName: 'User',
      revision,
      gameMode: null,
    }).gameMode,
    null,
  );
  for (const gameMode of ['unknown', undefined, ['ironman'], 'group_ironman_5'])
    assert.throws(() =>
      parseCollectorMode({
        collectorId: id,
        collectorName: 'User',
        revision,
        gameMode,
      }),
    );
  assert.throws(() =>
    parseCollectorMode({
      collectorId: id,
      collectorName: 'User',
      revision: revision.replace('133', '134'),
      gameMode: 'normal',
    }),
  );
});
test('collector handling loads and saves the selected identity through its own endpoint', async () => {
  const original = globalThis.fetch;
  const key = '00000000-0000-4000-8000-000000000134';
  globalThis.fetch = async (url, init) => {
    assert.equal(url, '/api/v1/admin/collectors/' + id + '/game-mode');
    if (init?.method === 'PUT') {
      assert.equal(new Headers(init.headers).get('X-CSRF-Token'), 'csrf');
      assert.equal(new Headers(init.headers).get('Idempotency-Key'), key);
    }
    return Response.json({
      collectorId: id,
      collectorName: 'User',
      gameMode: 'ironman',
      revision:
        init?.method === 'PUT' ? 'collector-mode-' + id + '-2-2' : revision,
      operationId: key,
    });
  };
  try {
    assert.equal(
      (await load(id, new AbortController().signal, true)).collectorId,
      id,
    );
    assert.equal(
      (
        await save(
          id,
          { collectorId: id, expectedRevision: revision, gameMode: 'ironman' },
          key,
          'csrf',
          new AbortController().signal,
          true,
        )
      ).operationId,
      key,
    );
  } finally {
    globalThis.fetch = original;
  }
});
test('mode receipt validation keeps the request fields/key stable and rejects mismatched or unchanged receipts', async () => {
  const original = globalThis.fetch,
    fields = {
      collectorId: id,
      expectedRevision: revision,
      gameMode: 'ironman' as const,
    },
    key = '00000000-0000-4000-8000-000000000134',
    calls: RequestInit[] = [];
  let mode: 'ironman' | 'normal' = 'ironman',
    same = false;
  globalThis.fetch = async (url, init) => {
    assert.equal(url, '/api/v1/admin/submissions/claim/game-mode');
    calls.push(init!);
    return Response.json({
      collectorId: id,
      collectorName: 'User',
      gameMode: mode,
      revision: same ? revision : 'collector-mode-' + id + '-2-2',
      operationId: key,
    });
  };
  try {
    await save('claim', fields, key, 'csrf', new AbortController().signal);
    await save('claim', fields, key, 'csrf', new AbortController().signal);
    assert.deepEqual(calls[0]!.body, calls[1]!.body);
    assert.equal(new Headers(calls[0]!.headers).get('Idempotency-Key'), key);
    assert.equal(new Headers(calls[0]!.headers).get('X-CSRF-Token'), 'csrf');
    mode = 'normal';
    await assert.rejects(
      save('claim', fields, key, 'csrf', new AbortController().signal),
    );
    mode = 'ironman';
    same = true;
    await assert.rejects(
      save('claim', fields, key, 'csrf', new AbortController().signal),
    );
  } finally {
    globalThis.fetch = original;
  }
});
