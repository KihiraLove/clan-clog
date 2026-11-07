import assert from 'node:assert/strict';
import test from 'node:test';
import { gameModes } from '@clog/domain';
import {
  CollectionHiScoresClient,
  parseCollectionHiScores,
} from './collection-hiscores-api.ts';
const snapshot = (page = 1) => ({
  revision: 'hiscores-1-1-1',
  metric: 'total',
  page,
  pageSize: 25,
  totalPlayers: 26,
  totalPages: 2,
  hardcoreEnabled: true,
  players: Array.from({ length: page === 1 ? 25 : 1 }, (_, i) => ({
    rank: (page - 1) * 25 + i + 1,
    name: 'Player ' + ((page - 1) * 25 + i + 1),
    score: '9007199254740993',
  })),
  match: null,
});
test('ranking response preserves exact large scores and rejects inconsistent rows/metadata', () => {
  assert.equal(
    parseCollectionHiScores(snapshot()).players[0]!.score,
    '9007199254740993',
  );
  for (const patch of [
    { page: 0 },
    { totalPages: 3 },
    { pageSize: 26 },
    { players: [] },
    { match: { name: 'Other', rank: 1 } },
    { players: snapshot().players.map((row) => ({ ...row, rank: 1 })) },
    { metric: 'unknown' },
    { players: snapshot().players.map((row) => ({ ...row, score: 0 })) },
  ])
    assert.throws(() => parseCollectionHiScores({ ...snapshot(), ...patch }));
  assert.throws(() =>
    parseCollectionHiScores({
      ...snapshot(),
      metric: 'hardcore',
      hardcoreEnabled: false,
    }),
  );
});
test('ranking rows parse every account mode and allow unassigned or legacy rows', () => {
  const data = snapshot();
  const modes = [...gameModes, null, undefined];
  const players = data.players.map((row, i) =>
    modes[i] === undefined ? row : { ...row, gameMode: modes[i] },
  );
  assert.deepEqual(
    parseCollectionHiScores({ ...data, players })
      .players.slice(0, modes.length)
      .map((row) => row.gameMode),
    [...gameModes, null, null],
  );
  assert.throws(() =>
    parseCollectionHiScores({
      ...data,
      players: [{ ...players[0], gameMode: 'hardcore' }, ...players.slice(1)],
    }),
  );
});
test('conditional client remembers the result URL alias and an aborted response cannot poison a newer selection', async () => {
  const original = globalThis.fetch,
    client = new CollectionHiScoresClient();
  const query = { metric: 'total' as const, page: 999 };
  let resolve!: (response: Response) => void;
  globalThis.fetch = async () =>
    new Response(JSON.stringify(snapshot(2)), { headers: { ETag: '"one"' } });
  try {
    await client.read(query, new AbortController().signal);
    assert.equal(client.peek({ ...query, page: 2 })!.page, 2);
    globalThis.fetch = async (_url, init) => {
      assert.equal(new Headers(init?.headers).get('If-None-Match'), '"one"');
      return new Response(null, { status: 304 });
    };
    assert.equal(
      (await client.read({ ...query, page: 2 }, new AbortController().signal))
        .page,
      2,
    );
    globalThis.fetch = () =>
      new Promise((done) => {
        resolve = done;
      });
    const cancelled = new AbortController(),
      pending = client.read({ ...query, page: 1 }, cancelled.signal);
    cancelled.abort();
    resolve(Response.json(snapshot()));
    await assert.rejects(pending);
    assert.equal(client.peek({ ...query, page: 2 })!.page, 2);
  } finally {
    globalThis.fetch = original;
  }
});
