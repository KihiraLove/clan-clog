/** Private, bounded upgrade-review transport stays in the staff graph. */
import type {
  EventPageAssignmentReview,
  EventPageAssignmentSelection,
  EventPageAssignmentResult,
} from '@clog/domain';
import * as appText from '@clog/domain';
import { validateCollectionDate } from '@clog/domain';
import { AdminRequestError } from './admin-api.ts';
import { object, list, text, identity, unique, timestamp } from './xp-model.ts';
const endpoint = '/api/v1/admin/event-page-assignments';
export function parseEventPageAssignments(
  value: unknown,
): EventPageAssignmentReview {
  const row = object(value);
  if (
    !Number.isInteger(row.total) ||
    Number(row.total) < 0 ||
    !/^event-pages-[1-9][0-9]*-[a-f0-9]{64}$/u.test(text(row.revision))
  )
    throw Error(appText.eventPageReviewUnavailable);
  const credits = list(row.credits).map((value) => {
    const r = object(value),
      pages = list(r.pages).map((value) => {
        const p = object(value);
        if (typeof p.available !== 'boolean')
          throw Error(appText.eventPageReviewUnavailable);
        return { id: text(p.id), name: text(p.name), available: p.available };
      });
    unique(pages.map((p) => p.id));
    const eligiblePageIds = list(r.eligiblePageIds).map(text);
    unique(eligiblePageIds);
    return {
      submissionId: text(r.submissionId),
      version: identity(r.version),
      itemId: identity(r.itemId),
      itemName: text(r.itemName),
      collectorName: text(r.collectorName),
      collectedOn: validateCollectionDate(text(r.collectedOn)),
      pages,
      eligiblePageIds,
      receivedAt: r.receivedAt === null ? null : timestamp(r.receivedAt),
    };
  });
  if (credits.length > 50 || credits.length > Number(row.total))
    throw Error(appText.eventPageReviewUnavailable);
  unique(credits.map((r) => r.submissionId));
  return { revision: text(row.revision), total: Number(row.total), credits };
}
async function request(signal: AbortSignal, init: RequestInit = {}) {
  const r = await fetch(endpoint, {
    ...init,
    signal,
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (!r.ok) throw new AdminRequestError(r.status);
  return r.json();
}
export async function eventPageAssignments(signal: AbortSignal) {
  return parseEventPageAssignments(await request(signal));
}
export async function assignEventPages(
  fields: EventPageAssignmentSelection,
  key: string,
  csrf: string,
  signal: AbortSignal,
): Promise<EventPageAssignmentResult> {
  const r = object(
    await request(signal, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrf,
        'Idempotency-Key': key,
      },
      body: JSON.stringify(fields),
    }),
  );
  const assignedIds = list(r.assignedIds).map(text);
  unique(assignedIds);
  if (
    assignedIds.length !== fields.assignments.length ||
    assignedIds.some(
      (id) => !fields.assignments.some((a) => a.submissionId === id),
    )
  )
    throw Error(appText.eventPageReviewUnavailable);
  return { assignedIds };
}
