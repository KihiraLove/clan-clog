/** Staff submission writes and receipt checks load only on interaction. */
import {
  parseSubmissionFilters,
  normalizePlayerName,
  type RepeatCollectorPolicy,
} from '@clog/domain';
import * as appText from '@clog/domain';
import {
  parseSubmission,
  safeScreenshotPath,
  type ManualSubmissionInput,
} from './admin-model.ts';
import { collectionTypeMatches } from './admin-api.ts';
export async function saveSubmissionFilters(
  request: (
    path: string,
    signal: AbortSignal,
    options?: RequestInit,
  ) => Promise<unknown>,
  filterCollected: boolean,
  revision: string,
  csrf: string,
  signal: AbortSignal,
  repeatCollectorPolicy?: RepeatCollectorPolicy,
) {
  const value = parseSubmissionFilters(
    await request('/api/v1/admin/submission-filters', signal, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify({
        filterCollected,
        expectedRevision: revision,
        ...(repeatCollectorPolicy === undefined
          ? {}
          : { repeatCollectorPolicy }),
      }),
    }),
  );
  if (
    value.filterCollected !== filterCollected ||
    value.revision === revision ||
    (repeatCollectorPolicy !== undefined &&
      value.repeatCollectorPolicy !== repeatCollectorPolicy)
  )
    throw new Error(appText.webAdminApiUnexpectedSubmissionFilterReceipt);
  return value;
}
export function manualSubmissionReceipt(
  value: unknown,
  fields: ManualSubmissionInput,
  screenshot: boolean,
) {
  const result = parseSubmission(value);
  if (
    result.source !== 'manual' ||
    (screenshot && !safeScreenshotPath(result.screenshotPath)) ||
    result.itemId !== fields.itemId ||
    result.hardcore !== fields.hardcore ||
    (fields.gameMode !== undefined &&
      result.submittedGameMode !== fields.gameMode) ||
    (result.originalCollectorName ?? result.collectorName) !==
      fields.collectorName.trim() ||
    normalizePlayerName(result.collectorName) !==
      normalizePlayerName(fields.collectorName) ||
    result.collectedOn !== fields.collectedOn ||
    !collectionTypeMatches(
      result,
      fields.collectionType,
      true,
      fields.eventPageId,
    ) ||
    (result.status !== (fields.approve ? 'approved' : 'pending') &&
      !(
        result.status === 'rejected' &&
        result.admissionPolicy?.repeatCollectorPolicy === 'reject' &&
        result.reviewReason === appText.repeatCollectorRejected
      ))
  )
    throw Error(appText.webAdminApiUnexpectedManualSubmissionReceipt);
  return result;
}
