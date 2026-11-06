import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectionHiScoreMetrics,
  collectionHiScoreName,
  collectionHiScorePage,
  parseCollectionHiScoreQuery,
} from './collection-hiscores.js';
import { normalizePlayerName } from './runelite-rules.js';
test('HiScores query defaults and four explicit world metrics remain bounded', () => {
  assert.deepEqual(collectionHiScoreMetrics, [
    'total',
    'unique',
    'event',
    'hardcore',
  ]);
  assert.deepEqual(parseCollectionHiScoreQuery({}), {
    metric: 'total',
    page: 1,
  });
  for (const metric of collectionHiScoreMetrics)
    assert.equal(
      parseCollectionHiScoreQuery({ metric, page: '77' }).metric,
      metric,
    );
  for (const value of [0, -1, 1.5, '01', '1e2', '1000000000', '', null, [], {}])
    assert.throws(() => parseCollectionHiScoreQuery({ page: value }));
  assert.throws(() => parseCollectionHiScoreQuery({ metric: 'all' }));
  for (const rank of [1, 25, 26, 50, 51, 1901, 1925])
    assert.equal(collectionHiScorePage(rank), Math.floor((rank - 1) / 25) + 1);
  assert.equal(collectionHiScorePage(26), 2);
  assert.equal(collectionHiScorePage(1925), 77);
  for (const rank of [0, NaN, 1.2, Number.MAX_SAFE_INTEGER + 1])
    assert.throws(() => collectionHiScorePage(rank));
});
test('search uses the current-name normalizer and rejects unusable input', () => {
  assert.equal(
    normalizePlayerName(collectionHiScoreName('  KiHiRa_\u00a0VD ')),
    'kihira vd',
  );
  for (const name of [
    '',
    '___',
    '\u00a0',
    'a'.repeat(81),
    'a\u0000b',
    42,
    undefined,
  ])
    assert.throws(() => collectionHiScoreName(name));
  assert.equal(
    parseCollectionHiScoreQuery({ player: ' KihiraVD ' }).player,
    'KihiraVD',
  );
});
