import assert from 'node:assert/strict';
import test from 'node:test';
import {
  repeatCollectorSummary,
  parseSubmissionFilters,
  normalizePlayerName,
} from '@clog/domain';
import { collectorHistory } from './collector-history.ts';
import { parseCollections, type Credit } from './model.ts';
const seed: Credit = {
  submissionId: 'a',
  itemId: 1,
  collectorName: 'Alice Smith',
  collectedOn: '2026-10-01',
  hardcore: false,
  status: 'approved',
  collectionType: 'regular',
};
test('merged history uses exact shared normalization, preserves repeated dates and original records and keeps worlds/items independent', () => {
  const credits: Credit[] = [
    {
      ...seed,
      submissionId: 'z',
      collectorName: 'ALICE__SMITH',
      collectedOn: '2026-10-03',
    },
    seed,
    {
      ...seed,
      submissionId: 'b',
      collectorName: ' alice\u00a0 smith ',
      collectedOn: '2026-10-01',
    },
    { ...seed, submissionId: 'hc', hardcore: true },
    { ...seed, submissionId: 'other-item', itemId: 2 },
    {
      ...seed,
      submissionId: 'other',
      collectorName: 'Bob',
      collectedOn: '2026-09-01',
    },
  ];
  const before = structuredClone(credits),
    groups = collectorHistory(credits);
  const alice = groups.find((g) => g.count === 3)!;
  assert.equal(groups[0]!.collectorName, 'Bob');
  assert.equal(alice.count, 3);
  assert.equal(alice.collectorName, 'Alice Smith');
  assert.equal(alice.firstOn, '2026-10-01');
  assert.deepEqual(
    alice.credits.map((c) => c.submissionId),
    ['a', 'b', 'z'],
  );
  assert.equal(
    repeatCollectorSummary(alice.count, alice.collectorName, '01/10/26'),
    'Collected 3x by Alice Smith first on 01/10/26',
  );
  assert.equal(groups.length, 4);
  assert.equal(credits.length, 6);
  assert.deepEqual(credits, before);
  assert.equal(
    collectorHistory(credits.filter((c) => c.submissionId !== 'z')).find((g) =>
      g.credits.some((c) => c.submissionId === 'a'),
    )!.count,
    2,
  );
  for (const spelling of [
    ' Alice_Smith ',
    'ALICE\u00a0\u00a0SMITH',
    'alice\t smith',
    '\ufeffAlice Smith\ufeff',
  ])
    assert.equal(normalizePlayerName(spelling), 'alice smith');
});
test('group counts and first dates follow collector, date, item and world corrections', () => {
  const rows = [
    { ...seed, submissionId: 'first', collectedOn: '2026-10-10' },
    { ...seed, submissionId: 'second', collectedOn: '2026-10-20' },
  ];
  const dated = [{ ...rows[0]!, collectedOn: '2026-10-30' }, rows[1]!];
  assert.equal(collectorHistory(dated)[0]!.firstOn, '2026-10-20');
  const renamed = [dated[0]!, { ...dated[1]!, collectorName: 'Bob' }];
  assert.deepEqual(
    collectorHistory(renamed).map((g) => [g.collectorName, g.count]),
    [
      ['Bob', 1],
      ['Alice Smith', 1],
    ],
  );
  assert.equal(
    collectorHistory([{ ...rows[0]!, itemId: 2 }, rows[1]!]).length,
    2,
  );
  assert.equal(
    collectorHistory([{ ...rows[0]!, hardcore: true }, rows[1]!]).length,
    2,
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0]!.collectedOn, '2026-10-10');
});
test('policy parsers default old payloads to separate and reject invalid display/settings modes', () => {
  assert.equal(
    parseSubmissionFilters({
      revision: 'submission-filters-1',
      filterCollected: false,
    }).repeatCollectorPolicy,
    'separate',
  );
  for (const policy of ['reject', 'separate', 'merge']) {
    assert.equal(
      parseSubmissionFilters({
        revision: 'submission-filters-2',
        filterCollected: true,
        repeatCollectorPolicy: policy,
      }).repeatCollectorPolicy,
      policy,
    );
    assert.equal(
      parseCollections({
        revision: 'c',
        credits: [],
        repeatCollectorPolicy: policy,
      }).repeatCollectorPolicy,
      policy,
    );
  }
  for (const repeatCollectorPolicy of [null, true, 'bad', {}, 2]) {
    assert.throws(() =>
      parseSubmissionFilters({
        revision: 'submission-filters-1',
        filterCollected: false,
        repeatCollectorPolicy,
      }),
    );
    assert.throws(() =>
      parseCollections({ revision: 'c', credits: [], repeatCollectorPolicy }),
    );
  }
});
