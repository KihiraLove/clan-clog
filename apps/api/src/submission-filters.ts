import * as appText from '@clog/domain';
import { normalizePlayerName } from '@clog/domain';
import type pg from 'pg';
import type { SubmissionFilters, CollectionType } from '@clog/domain';
import { ApiError } from './types.js';
import { eventPageMembership } from './event-pages.js';

export async function readSubmissionFilters(
  database: Pick<pg.Pool, 'query'> | Pick<pg.PoolClient, 'query'>,
  lock = false,
): Promise<SubmissionFilters> {
  const row = (
    await database.query<{
      version: number;
      filter_collected: boolean;
      repeat_collector_policy: SubmissionFilters['repeatCollectorPolicy'];
    }>(
      'SELECT version,filter_collected,repeat_collector_policy FROM submission_filter_settings WHERE singleton' +
        (lock ? ' FOR SHARE' : ''),
    )
  ).rows[0];
  if (!row)
    throw new ApiError(
      503,
      appText.apiSubmissionFiltersSubmissionFiltersAreUnavailable,
    );
  return {
    revision: 'submission-filters-' + row.version,
    filterCollected: row.filter_collected,
    repeatCollectorPolicy: row.repeat_collector_policy,
  };
}

/** The item lock is held by every caller. Normalize the indexed candidate set in
 * JavaScript so SQL collation/Unicode case folding cannot disagree with intake. */
export async function isRepeatCollector(
  client: pg.PoolClient,
  filters: SubmissionFilters,
  itemId: number | null,
  hardcore: boolean,
  collectorName: string,
  excludeId?: string,
) {
  if (filters.repeatCollectorPolicy !== 'reject' || itemId === null)
    return false;
  const key = normalizePlayerName(collectorName);
  const existing = await client.query(
    "SELECT 1 FROM collectors current JOIN collectors original ON original.id=current.id OR original.merged_into=current.id JOIN submissions s ON s.collector_id=original.id WHERE current.merged_into IS NULL AND current.normalized_name=$1 AND s.item_id=$2 AND s.hardcore=$3 AND s.status='approved' AND ($4::uuid IS NULL OR s.id<>$4) LIMIT 1",
    [key, itemId, hardcore, excludeId ?? null],
  );
  if (existing.rowCount) return true;
  // Compatibility for owner-created fixtures/imports without a registered identity.
  const rows = await client.query<{ name: string }>(
    "SELECT collector_name AS name FROM submissions WHERE collector_id IS NULL AND item_id=$1 AND hardcore=$2 AND status='approved' AND ($3::uuid IS NULL OR id<>$3)",
    [itemId, hardcore, excludeId ?? null],
  );
  return rows.rows.some((row) => normalizePlayerName(row.name) === key);
}
export async function requireCollectorAvailable(
  client: pg.PoolClient,
  itemId: number,
  hardcore: boolean,
  collectorName: string,
  excludeId?: string,
) {
  await client.query('SELECT id FROM items WHERE id=$1 FOR UPDATE', [itemId]);
  const filters = await readSubmissionFilters(client, true);
  if (
    await isRepeatCollector(
      client,
      filters,
      itemId,
      hardcore,
      collectorName,
      excludeId,
    )
  )
    throw new ApiError(409, appText.repeatCollectorRejected);
}

export async function isCollectedDuplicate(
  client: pg.PoolClient,
  enabled: boolean,
  itemId: number | null,
  hardcore: boolean,
  collectionType: CollectionType | null = 'regular',
) {
  return Boolean(
    enabled &&
    collectionType === 'regular' &&
    itemId !== null &&
    (
      await client.query(
        "SELECT 1 FROM submissions WHERE item_id=$1 AND hardcore=$2 AND status='approved' AND collection_type='regular' LIMIT 1",
        [itemId, hardcore],
      )
    ).rowCount,
  );
}

export async function requireUncollected(
  client: pg.PoolClient,
  enabled: boolean,
  itemId: number | null,
  hardcore: boolean,
  collectionType: CollectionType | null = 'regular',
) {
  if (
    await isCollectedDuplicate(
      client,
      enabled,
      itemId,
      hardcore,
      collectionType,
    )
  )
    throw new ApiError(
      403,
      appText.apiSubmissionFiltersFilterOutRegularDuplicatesIsOnAndThisItemAlready,
    );
}

/** Resolve occupied Event credit under the same item/filter locks as approval. */
export async function resolveCollectionCredit<
  T extends {
    collectionType: CollectionType | null;
    collectionReason: string;
    eventPageId?: string | null;
  },
>(
  client: pg.PoolClient,
  itemId: number | null,
  hardcore: boolean,
  classification: T,
  excludeId?: string,
) {
  if (itemId === null || hardcore || classification.collectionType !== 'event')
    return { ...classification, eventPageId: null };
  await client.query('SELECT id FROM items WHERE id=$1 FOR UPDATE', [itemId]);
  let pageId = classification.eventPageId ?? null;
  if (
    !pageId &&
    ['manual', 'staff_correction'].includes(classification.collectionReason)
  ) {
    const pages = await client.query<{ id: string }>(
      'SELECT p.id FROM pages p JOIN page_items pi ON pi.page_id=p.id WHERE pi.item_id=$1 AND p.active ORDER BY p.id LIMIT 2',
      [itemId],
    );
    if (pages.rows.length === 1) pageId = pages.rows[0]!.id;
  }
  if (pageId) await eventPageMembership(client, itemId, pageId, excludeId);
  const value = {
    ...classification,
    eventPageId: pageId,
    collectionReason:
      classification.collectionReason === 'legacy_event_page_unresolved'
        ? 'event_page_resolved'
        : classification.collectionReason,
  };
  const unresolved = await client.query(
    "SELECT 1 FROM submissions WHERE item_id=$1 AND status='approved' AND event_page_assignment_pending AND ($2::uuid IS NULL OR id<>$2) LIMIT 1",
    [itemId, excludeId ?? null],
  );
  if (unresolved.rowCount)
    return { ...value, collectionReason: 'legacy_event_page_unresolved' };
  if (!pageId) return value;
  const filters = await readSubmissionFilters(client, true);
  if (filters.filterCollected) return value;
  const occupied = (
    await client.query(
      "SELECT 1 FROM submissions WHERE item_id=$1 AND NOT hardcore AND collection_type='event' AND status='approved' AND ($2::uuid IS NULL OR id<>$2) AND event_page_id=$3 LIMIT 1",
      [itemId, excludeId ?? null, pageId],
    )
  ).rowCount;
  return occupied
    ? {
        ...value,
        collectionType: 'regular' as const,
        collectionReason: 'event_credit_already_obtained',
        eventPageId: null,
      }
    : value;
}

/** Call before granting or moving a credit. The canonical lock serializes every writer. */
export async function requireCreditAvailable(
  client: pg.PoolClient,
  itemId: number,
  hardcore: boolean,
  type: CollectionType,
  excludeId?: string,
  eventPageId?: string | null,
) {
  await client.query('SELECT id FROM items WHERE id=$1 FOR UPDATE', [itemId]);
  if (type === 'event') {
    const unresolved = await client.query(
      "SELECT 1 FROM submissions WHERE item_id=$1 AND status='approved' AND event_page_assignment_pending AND ($2::uuid IS NULL OR id<>$2) LIMIT 1",
      [itemId, excludeId ?? null],
    );
    if (unresolved.rowCount)
      throw new ApiError(409, appText.eventPageLegacyBlocked);
    if (!eventPageId) throw new ApiError(422, appText.eventPageRequired);
    await eventPageMembership(client, itemId, eventPageId, excludeId);
  }
  const filters = await readSubmissionFilters(client, true);
  if (type === 'regular' && !filters.filterCollected) return;
  const occupied = (
    await client.query(
      "SELECT 1 FROM submissions WHERE item_id=$1 AND hardcore=$2 AND collection_type=$3 AND status='approved' AND ($4::uuid IS NULL OR id<>$4) AND ($3<>'event' OR event_page_id=$5) LIMIT 1",
      [itemId, hardcore, type, excludeId ?? null, eventPageId ?? null],
    )
  ).rowCount;
  if (occupied)
    throw new ApiError(
      409,
      type === 'event'
        ? appText.eventPageOccupied
        : appText.apiSubmissionFiltersFilterOutRegularDuplicatesIsOnAndThisItemAlready,
    );
}
