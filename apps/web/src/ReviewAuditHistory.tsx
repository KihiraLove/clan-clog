import * as appText from '@clog/domain';
/** Bounded history pages retain immutable before/after evidence and explicit stale recovery. */
import { useEffect, useRef, useState } from 'react';
import type { AdminClient, SubmissionDetail } from './admin-model.ts';
import { AdminRequestError } from './admin-api.ts';
import { classifyAccessFailure } from './admin-session.ts';
import { formatUtcTime } from './format-time.ts';
import { collectionTypeLabel } from '@clog/domain';
export function ReviewAuditHistory({
  initial,
  client,
  disabled,
  onAccessLost,
  onReload,
}: {
  initial: SubmissionDetail;
  client: AdminClient;
  disabled: boolean;
  onAccessLost: () => void;
  onReload: () => void;
}) {
  const [detail, setDetail] = useState(initial);
  const [cursors, setCursors] = useState([initial.auditCursor]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string>();
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function load(cursor: string, older: boolean) {
    if (controller.current) return;
    const request = new AbortController();
    controller.current = request;
    const timer = window.setTimeout(() => request.abort(), 10000);
    setBusy(true);
    setError(undefined);
    try {
      const next = await client.detail(
        initial.submission.id,
        request.signal,
        cursor,
      );
      if (request.signal.aborted)
        throw new Error(appText.webReviewAuditHistoryAuditRequestTimedOut);
      if (
        next.auditRevision !== initial.auditRevision ||
        next.submission.version !== initial.submission.version
      )
        throw new AdminRequestError(409);
      if (next.nextAuditCursor === cursor || next.auditCursor !== cursor)
        throw new Error(appText.webReviewAuditHistoryInconsistentHistoryPage);
      setDetail(next);
      setCursors((values) =>
        older ? [...values, cursor] : values.slice(0, -1),
      );
    } catch (failure) {
      if (classifyAccessFailure(failure) === 'expired') onAccessLost();
      else
        setError(
          failure instanceof AdminRequestError && failure.status === 409
            ? appText.webReviewAuditHistoryHistoryChangedReloadTheSubmissionToBrowseTheLatestEvents
            : appText.webReviewAuditHistoryCouldNotLoadAuditEventsTheLastPageIsPreserved,
        );
    } finally {
      clearTimeout(timer);
      controller.current = null;
      setBusy(false);
    }
  }
  return (
    <details className="admin-audit">
      <summary>
        {appText.webReviewAuditHistoryAuditHistoryOnThisPage(
          detail.audit.length,
        )}
      </summary>
      {!detail.audit.length && (
        <p>{appText.webReviewAuditHistoryNoReviewEventsRecordedYet}</p>
      )}
      <div className="admin-pagination">
        <button
          type="button"
          className="site-button"
          disabled={busy || disabled || !!error || cursors.length === 1}
          aria-busy={busy}
          onClick={() => void load(cursors[cursors.length - 2]!, false)}
        >
          {appText.webReviewAuditHistoryNewerEvents}
        </button>
        <span>
          {appText.webReviewAuditHistoryHistoryPageMessage(cursors.length)}
        </span>
        <button
          type="button"
          className="site-button"
          disabled={busy || disabled || !!error || !detail.nextAuditCursor}
          aria-busy={busy}
          onClick={() => void load(detail.nextAuditCursor!, true)}
        >
          {appText.webReviewAuditHistoryOlderEvents}
        </button>
      </div>
      {busy && (
        <p role="status">{appText.webReviewAuditHistoryLoadingAuditEvents}</p>
      )}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="site-button"
            disabled={busy || disabled}
            onClick={onReload}
          >
            {appText.webReviewAuditHistoryReloadSubmission}
          </button>
        </div>
      )}
      <ol>
        {detail.audit.map((entry) => {
          const fields: [string, string, string][] = [
            [
              appText.webReviewAuditHistoryStatus,
              entry.before.status,
              entry.after.status,
            ],
            [
              appText.webReviewAuditHistoryCollectionType,
              collectionTypeLabel(entry.before.collectionType),
              collectionTypeLabel(entry.after.collectionType),
            ],
            [
              appText.webReviewAuditHistorySubmittedItemName,
              entry.before.rawItemText,
              entry.after.rawItemText,
            ],
            [
              appText.webReviewAuditHistoryGameItemId,
              String(
                entry.before.gameItemId ??
                  appText.webReviewAuditHistoryNotSupplied,
              ),
              String(
                entry.after.gameItemId ??
                  appText.webReviewAuditHistoryNotSupplied,
              ),
            ],
            [
              appText.webReviewAuditHistoryItem,
              entry.before.itemId === null
                ? appText.webReviewAuditHistoryUnmatched
                : '#' + entry.before.itemId,
              entry.after.itemId === null
                ? appText.webReviewAuditHistoryUnmatched
                : '#' + entry.after.itemId,
            ],
            [
              appText.webReviewAuditHistoryCollector,
              entry.before.collectorName,
              entry.after.collectorName,
            ],
            [
              appText.webReviewAuditHistoryDate,
              entry.before.collectedOn,
              entry.after.collectedOn,
            ],
            [
              appText.webReviewAuditHistoryHardcore,
              entry.before.hardcore
                ? appText.webReviewAuditHistoryYes
                : appText.webReviewAuditHistoryNo,
              entry.after.hardcore
                ? appText.webReviewAuditHistoryYes
                : appText.webReviewAuditHistoryNo,
            ],
            [
              appText.webReviewAuditHistoryReviewNote,
              entry.before.reviewNote,
              entry.after.reviewNote,
            ],
          ];
          return (
            <li key={entry.id}>
              <strong>
                {appText.webReviewAuditHistoryAuditActor(
                  entry.action,
                  entry.actorName,
                )}
              </strong>
              <p>{formatUtcTime(entry.at)}</p>
              {entry.reason && (
                <p>
                  {appText.webReviewAuditHistoryReasonMessage(entry.reason)}
                </p>
              )}
              <div className="admin-table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{appText.webReviewAuditHistoryField}</th>
                      <th>{appText.webReviewAuditHistoryBefore}</th>
                      <th>{appText.webReviewAuditHistoryAfter}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields
                      .filter(([, before, after]) => before !== after)
                      .map(([label, before, after]) => (
                        <tr key={label}>
                          <th scope="row">{label}</th>
                          <td>{before}</td>
                          <td>{after}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </li>
          );
        })}
      </ol>
    </details>
  );
}
