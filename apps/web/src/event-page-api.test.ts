/** Upgrade choices retain exact wire identity across uncertain saves. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  eventPageAssignments,
  assignEventPages,
  parseEventPageAssignments,
} from './event-page-api.ts';
const credit = {
  submissionId: '00000000-0000-4000-8000-000000000001',
  version: 1,
  itemId: 1,
  itemName: 'Shared',
  collectorName: 'Original',
  collectedOn: '2026-10-20',
  pages: [
    { id: 'a', name: 'A', available: true },
    { id: 'retired', name: 'Retired', available: false },
  ],
  eligiblePageIds: ['a'],
  receivedAt: '2026-10-20T12:00:00Z',
};
const review = {
  revision: 'event-pages-1-' + 'a'.repeat(64),
  total: 1,
  credits: [credit],
};
test('upgrade parsing retains missing/retired pages and rejects malformed or duplicate choices', () => {
  assert.deepEqual(parseEventPageAssignments(review), review);
  assert.equal(
    parseEventPageAssignments({
      ...review,
      credits: [{ ...credit, pages: [] }],
    }).credits[0]!.pages.length,
    0,
  );
  for (const value of [
    { ...review, total: 0 },
    { ...review, credits: [credit, credit] },
    { ...review, revision: 'bad' },
    {
      ...review,
      credits: [{ ...credit, pages: [credit.pages[0], credit.pages[0]] }],
    },
    {
      ...review,
      credits: [
        { ...credit, pages: [{ ...credit.pages[0], available: 'true' }] },
      ],
    },
  ])
    assert.throws(() => parseEventPageAssignments(value));
});
test('assignment transport is private, versioned, CSRF protected and replays identical fields/key', async () => {
  const prior = globalThis.fetch,
    calls: { path: string; init: RequestInit | undefined }[] = [];
  globalThis.fetch = async (path, init) => {
    calls.push({ path: String(path), init });
    return new Response(
      JSON.stringify(
        init?.method === 'POST'
          ? { assignedIds: [credit.submissionId] }
          : review,
      ),
      { headers: { 'Content-Type': 'application/json' } },
    );
  };
  try {
    const signal = new AbortController().signal;
    assert.deepEqual(await eventPageAssignments(signal), review);
    const fields = {
      expectedRevision: review.revision,
      assignments: [
        {
          submissionId: credit.submissionId,
          expectedVersion: 1,
          eventPageId: 'a',
        },
      ],
    };
    await assignEventPages(fields, 'stable-key', 'csrf', signal);
    await assignEventPages(fields, 'stable-key', 'csrf', signal);
    for (const call of calls) {
      assert.equal(call.path, '/api/v1/admin/event-page-assignments');
      assert.equal(call.init?.cache, 'no-store');
      assert.equal(call.init?.credentials, 'same-origin');
    }
    for (const call of calls.slice(1)) {
      assert.deepEqual(JSON.parse(call.init!.body as string), fields);
      assert.equal(new Headers(call.init?.headers).get('X-CSRF-Token'), 'csrf');
      assert.equal(
        new Headers(call.init?.headers).get('Idempotency-Key'),
        'stable-key',
      );
    }
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ assignedIds: [] }), {
        headers: { 'Content-Type': 'application/json' },
      });
    await assert.rejects(
      assignEventPages(fields, 'stable-key', 'csrf', signal),
    );
  } finally {
    globalThis.fetch = prior;
  }
});
