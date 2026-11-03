import * as appText from './text.js';
export type CollectionType = 'regular' | 'event';
export interface IntakeSchedulingEvidence {
  receivedAt: string;
  enabled: boolean;
  revision: string;
  permanentlyOpenPageIds: string[];
  eventPages: { scheduleId: string; pageId: string; itemIds: number[] }[];
}
export const collectionTypeLabel = (type: CollectionType | null | undefined) =>
  type === null
    ? appText.domainCollectionTypesAwaitingItemMatch
    : type === 'event'
      ? appText.domainCollectionTypesEventCollection
      : appText.domainCollectionTypesRegularCollection;

export const eligibleEventPageIds = (
  evidence: IntakeSchedulingEvidence | null,
  itemId: number | null,
) =>
  [
    ...new Set(
      evidence?.enabled && itemId !== null
        ? evidence.eventPages
            .filter((p) => p.itemIds.includes(itemId))
            .map((p) => p.pageId)
        : [],
    ),
  ].sort();

/** Only the catalog membership and windows frozen at receipt can establish an event. */
export function classifyCollection(
  evidence: IntakeSchedulingEvidence | null,
  itemId: number | null,
  hardcore: boolean,
): {
  collectionType: CollectionType | null;
  collectionReason: string;
  eventPageId?: string | null;
} {
  if (hardcore)
    return { collectionType: 'regular' as const, collectionReason: 'hardcore' };
  if (!evidence)
    return { collectionType: 'regular' as const, collectionReason: 'legacy' };
  if (!evidence.enabled)
    return {
      collectionType: 'regular' as const,
      collectionReason: 'scheduling_disabled',
    };
  if (itemId === null)
    return { collectionType: null, collectionReason: 'unmatched' };
  const pages = eligibleEventPageIds(evidence, itemId);
  const event = pages.length > 0;
  return {
    collectionType: event ? ('event' as const) : ('regular' as const),
    collectionReason: event ? 'timed_event' : 'unscheduled',
    ...(event ? { eventPageId: pages.length === 1 ? pages[0]! : null } : {}),
  };
}
