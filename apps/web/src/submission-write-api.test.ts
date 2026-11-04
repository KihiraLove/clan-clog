import assert from 'node:assert/strict';
import test from 'node:test';
import { repeatCollectorRejected } from '@clog/domain';
import { manualSubmissionReceipt } from './submission-write-api.ts';
import { LiveAdminClient, AdminRequestError } from './admin-api.ts';
import { adminFixtures } from '../tests/admin-fixtures.ts';
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
test('filter writes preserve CSRF/version and validate the saved policy, including legacy omission', async () => {
  const prior = globalThis.fetch,
    calls: RequestInit[] = [];
  globalThis.fetch = async (_path, init) => {
    calls.push(init!);
    return json({
      revision: 'submission-filters-2',
      filterCollected: true,
      repeatCollectorPolicy: 'merge',
    });
  };
  try {
    const client = new LiveAdminClient((input, init) =>
        globalThis.fetch(input, init),
      ),
      signal = new AbortController().signal;
    assert.equal(
      (
        await client.saveSubmissionFilters(
          true,
          'submission-filters-1',
          'csrf',
          signal,
          'merge',
        )
      ).repeatCollectorPolicy,
      'merge',
    );
    assert.deepEqual(JSON.parse(calls[0]!.body as string), {
      filterCollected: true,
      expectedRevision: 'submission-filters-1',
      repeatCollectorPolicy: 'merge',
    });
    assert.equal(new Headers(calls[0]!.headers).get('X-CSRF-Token'), 'csrf');
    assert.equal(calls[0]!.credentials, 'same-origin');
    assert.equal(calls[0]!.cache, 'no-store');
    await client.saveSubmissionFilters(
      true,
      'submission-filters-1',
      'csrf',
      signal,
    );
    assert.equal(
      Object.hasOwn(
        JSON.parse(calls[1]!.body as string),
        'repeatCollectorPolicy',
      ),
      false,
    );
    globalThis.fetch = async () =>
      json({
        revision: 'submission-filters-2',
        filterCollected: true,
        repeatCollectorPolicy: 'separate',
      });
    await assert.rejects(
      client.saveSubmissionFilters(
        true,
        'submission-filters-1',
        'csrf',
        signal,
        'merge',
      ),
    );
  } finally {
    globalThis.fetch = prior;
  }
});
test('manual receipts accept only a truthful policy rejection for the submitted identity/date', async () => {
  assert.equal(
    new AdminRequestError(409, repeatCollectorRejected).message,
    repeatCollectorRejected,
  );
  assert.notEqual(
    new AdminRequestError(409, 'private database details').message,
    'private database details',
  );
  const fixture = await adminFixtures(),
    prior = globalThis.fetch;
  const fields = {
    itemId: fixture.detail.submission.itemId!,
    collectorName: 'Alice Smith',
    collectedOn: '2026-10-01',
    hardcore: false,
    collectionType: 'regular' as const,
    approve: true,
  };
  const row = {
    ...fixture.detail.submission,
    ...fields,
    source: 'manual',
    status: 'rejected',
    eventPageId: null,
    reviewReason: repeatCollectorRejected,
    admissionPolicy: {
      revision: 'submission-filters-9',
      filterCollected: false,
      repeatCollectorPolicy: 'reject',
    },
  };
  try {
    const client = new LiveAdminClient((input, init) =>
        globalThis.fetch(input, init),
      ),
      signal = new AbortController().signal;
    globalThis.fetch = async () => json(row, 201);
    assert.equal(
      (await client.addManual(fields, 'key', 'csrf', signal)).status,
      'rejected',
    );
    for (const bad of [
      { ...row, admissionPolicy: undefined },
      { ...row, reviewReason: 'Different reason' },
      { ...row, collectorName: 'Other player' },
      { ...row, collectedOn: '2026-10-02' },
    ]) {
      globalThis.fetch = async () => json(bad, 201);
      await assert.rejects(client.addManual(fields, 'key', 'csrf', signal));
    }
  } finally {
    globalThis.fetch = prior;
  }
});
test('manual receipts validate canonical display names against immutable submitted names', () => {
  const fields = {
    itemId: 1,
    collectorName: 'alice_smith',
    collectedOn: '2026-10-01',
    hardcore: false,
    approve: true,
  };
  const receipt = {
    id: '00000000-0000-4000-8000-000000000001',
    version: 1,
    source: 'manual',
    itemId: 1,
    rawItemText: 'Item',
    collectorName: 'Alice Smith',
    originalCollectorName: 'alice_smith',
    collectedOn: '2026-10-01',
    dateSource: 'admin',
    submittedAt: '2026-10-01T00:00:00.000Z',
    proofUrl: '',
    hardcore: false,
    status: 'approved',
    reviewNote: '',
    reviewReason: null,
  };
  assert.equal(
    manualSubmissionReceipt(receipt, fields, false).collectorName,
    'Alice Smith',
  );
  assert.throws(() =>
    manualSubmissionReceipt(
      { ...receipt, collectorName: 'Unrelated' },
      fields,
      false,
    ),
  );
});
