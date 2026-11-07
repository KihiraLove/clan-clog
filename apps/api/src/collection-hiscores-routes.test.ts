import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import Fastify from 'fastify';
import { collectionHiScoresRoutes } from './collection-hiscores-routes.js';
test('public HiScores validates bounded queries and scopes ETags to revision, metric, page and search', async () => {
  const app = Fastify();
  let calls = 0;
  collectionHiScoresRoutes(app, {
    collectionHiScores: async (query) => {
      calls++;
      return {
        revision: 'hiscores-1-1-1',
        metric: query.metric,
        page: query.page,
        pageSize: 25,
        totalPlayers: 50,
        totalPages: 2,
        hardcoreEnabled: true,
        players: [],
        match: null,
      };
    },
  });
  try {
    const first = await app.inject('/api/v1/collections/hiscores');
    assert.equal(first.statusCode, 200);
    assert.equal(
      first.headers['cache-control'],
      'public, max-age=0, must-revalidate',
    );
    const etag = String(first.headers.etag);
    const legacyEtag =
      '"' +
      createHash('sha256')
        .update(JSON.stringify(['hiscores-1-1-1', 'total', 1, null]))
        .digest('hex') +
      '"';
    const upgraded = await app.inject({
      url: '/api/v1/collections/hiscores',
      headers: { 'if-none-match': legacyEtag },
    });
    assert.equal(upgraded.statusCode, 200);
    assert.equal(upgraded.headers.etag, etag);
    assert.equal(
      (
        await app.inject({
          url: '/api/v1/collections/hiscores',
          headers: { 'if-none-match': 'W/' + etag },
        })
      ).statusCode,
      304,
    );
    for (const suffix of ['?metric=unique', '?page=2', '?player=Player'])
      assert.equal(
        (
          await app.inject({
            url: '/api/v1/collections/hiscores' + suffix,
            headers: { 'if-none-match': etag },
          })
        ).statusCode,
        200,
      );
    const prior = calls;
    for (const query of [
      'page=0',
      'page=1.5',
      'page=1000000000',
      'metric=all',
      'player=___',
      'player=',
      'player=' + 'a'.repeat(81),
    ])
      assert.equal(
        (await app.inject('/api/v1/collections/hiscores?' + query)).statusCode,
        400,
        query,
      );
    assert.equal(calls, prior);
    assert.deepEqual(
      Object.keys(first.json()).sort(),
      [
        'revision',
        'metric',
        'page',
        'pageSize',
        'totalPlayers',
        'totalPages',
        'hardcoreEnabled',
        'players',
        'match',
      ].sort(),
    );
  } finally {
    await app.close();
  }
});
test('a missing ranking service fails without inventing an empty ranking', async () => {
  const app = Fastify();
  collectionHiScoresRoutes(app);
  try {
    assert.equal(
      (await app.inject('/api/v1/collections/hiscores')).statusCode,
      503,
    );
  } finally {
    await app.close();
  }
});
