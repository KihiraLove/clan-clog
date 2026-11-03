/** Frozen scheduling chooses a target; current membership validates new grants. */
import type pg from 'pg';
import {
  classifyCollection,
  eligibleEventPageIds,
  type IntakeSchedulingEvidence,
} from '@clog/domain';
import { ApiError } from './types.js';
import * as appText from '@clog/domain';
export function classifyIntake(
  evidence: IntakeSchedulingEvidence | null,
  itemId: number | null,
  hardcore: boolean,
  supplied?: string,
) {
  const value = classifyCollection(evidence, itemId, hardcore);
  if (supplied !== undefined) {
    if (
      value.collectionType !== 'event' ||
      !eligibleEventPageIds(evidence, itemId).includes(supplied)
    )
      throw new ApiError(422, appText.eventPageInvalid);
    return { ...value, eventPageId: supplied };
  }
  return {
    ...value,
    eventPageId: 'eventPageId' in value ? value.eventPageId : null,
  };
}
export async function eventPageMembership(
  client: pg.PoolClient,
  itemId: number,
  pageId: string,
  excludeId?: string,
) {
  // A name/date correction can retain unavailable historical page identity.
  const valid = await client.query(
    `SELECT 1 FROM page_items pi JOIN pages p ON p.id=pi.page_id WHERE pi.item_id=$1 AND pi.page_id=$2 AND p.active
    UNION ALL SELECT 1 FROM submissions WHERE id=$3 AND item_id=$1 AND event_page_id=$2 AND status='approved' LIMIT 1`,
    [itemId, pageId, excludeId ?? null],
  );
  if (!valid.rowCount) throw new ApiError(422, appText.eventPageInvalid);
}
