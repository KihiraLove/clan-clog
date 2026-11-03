import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  classifyCollection,
  eligibleEventPageIds,
  type IntakeSchedulingEvidence,
} from './collection-types.js';
import { collectionState, type CollectionCredit } from './index.js';
const evidence: IntakeSchedulingEvidence = {
  receivedAt: '2026-10-19T12:00:00Z',
  enabled: true,
  revision: 'schedules-7',
  permanentlyOpenPageIds: ['permanent'],
  eventPages: [{ scheduleId: 's', pageId: 'event', itemIds: [1] }],
};
test('classification uses frozen membership, defers unmatched normal claims and always keeps hardcore Regular', () => {
  assert.equal(classifyCollection(evidence, 1, false).collectionType, 'event');
  assert.equal(
    classifyCollection(evidence, 2, false).collectionType,
    'regular',
  );
  assert.equal(classifyCollection(evidence, null, false).collectionType, null);
  for (const itemId of [null, 1, 2]) {
    assert.equal(
      classifyCollection(evidence, itemId, true).collectionType,
      'regular',
    );
    assert.equal(
      classifyCollection({ ...evidence, enabled: false }, itemId, false)
        .collectionType,
      'regular',
    );
    assert.equal(
      classifyCollection(null, itemId, false).collectionType,
      'regular',
    );
  }
});

test('one frozen page is selected, shared Event candidates require a choice and page display never duplicates an obtain', () => {
  assert.equal(classifyCollection(evidence, 1, false).eventPageId, 'event');
  const shared = {
    ...evidence,
    eventPages: [
      ...evidence.eventPages,
      { scheduleId: 'other', pageId: 'b', itemIds: [1] },
      { scheduleId: 'repeat', pageId: 'event', itemIds: [1] },
    ],
  };
  assert.deepEqual(eligibleEventPageIds(shared, 1), ['b', 'event']);
  assert.equal(classifyCollection(shared, 1, false).eventPageId, null);
  const row: CollectionCredit = {
    submissionId: 'a',
    itemId: 1,
    collectorName: 'Alice',
    collectedOn: '2026-10-20',
    status: 'approved',
    collectionType: 'event',
    eventPageId: 'event',
  };
  const regular = {
    ...row,
    submissionId: 'r',
    collectionType: 'regular' as const,
    eventPageId: null,
  };
  const b = {
    ...row,
    submissionId: 'b',
    collectorName: 'Bob',
    eventPageId: 'b',
  };
  assert.deepEqual(
    collectionState(1, [row, b, regular], false, 'event').collectors.map(
      (c) => c.submissionId,
    ),
    ['a', 'r'],
  );
  assert.deepEqual(
    collectionState(1, [row, b, regular], false, 'b').collectors.map(
      (c) => c.submissionId,
    ),
    ['b', 'r'],
  );
  assert.equal(
    collectionState(1, [row], false, 'b').collected,
    true,
    'ordinary completion remains canonical',
  );
  assert.equal(
    collectionState(1, [row, b, regular], false, 'b').obtainCount,
    3,
  );
});
test('event history comes first and all repeated regular credits are stable oldest first', () => {
  const seed: CollectionCredit = {
    submissionId: 'z',
    itemId: 1,
    collectorName: 'Same player',
    collectedOn: '2026-10-19',
    status: 'approved',
    collectionType: 'regular',
  };
  const credits = [
    { ...seed, submissionId: 'event', collectionType: 'event' as const },
    { ...seed, submissionId: 'b', collectedOn: '2026-10-01' },
    { ...seed, submissionId: 'a', collectedOn: '2026-10-01' },
    seed,
    { ...seed, submissionId: 'rejected', status: 'rejected' as const },
    { ...seed, submissionId: 'hc', hardcore: true },
  ];
  assert.deepEqual(
    collectionState(1, credits, false).collectors.map((c) => c.submissionId),
    ['event', 'a', 'b', 'z'],
  );
  assert.deepEqual(
    collectionState(1, credits, true).collectors.map((c) => c.submissionId),
    ['hc'],
  );
});
