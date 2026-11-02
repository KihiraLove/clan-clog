import * as appText from '@clog/domain';
/** Load catalog plus paged claims together, retaining cursor history for previous-page navigation. */
import { useEffect, useId, useRef, useState } from 'react';
import { AdminRequestError } from './admin-api.ts';
import { classifyAccessFailure } from './admin-session.ts';
import {
  safeScreenshotPath,
  type AdminCatalog,
  type AdminClient,
  type QueueResult,
  type QueueView,
} from './admin-model.ts';
import type { AdminSession } from './xp-model.ts';
import { formatUtcTime } from './format-time.ts';
import { SubmissionEditor } from './SubmissionEditor.tsx';
import { ManualSubmissionForm } from './ManualSubmissionForm.tsx';
import { usePreparedAdminData } from './admin-route-data.ts';
import { useAdminAction } from './use-admin-action.ts';
import type { SubmissionFilters } from '@clog/domain';
export function AdminQueue({
  client,
  session,
  onAccessLost,
}: {
  client: AdminClient;
  session: AdminSession;
  onAccessLost: () => void;
}) {
  const initial = usePreparedAdminData();
  const preparedRead = useRef(!!initial?.queue);
  const [view, setView] = useState<QueueView>('pending'),
    [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const cursor = cursors[cursors.length - 1];
  const pagingHintId = useId();
  const [refresh, setRefresh] = useState(0),
    [selected, setSelected] = useState<string>();
  const [snapshot, setSnapshot] = useState<
    | {
        view: QueueView;
        cursor: string | undefined;
        catalog: AdminCatalog;
        queue: QueueResult;
      }
    | undefined
  >(
    initial?.catalog && initial.queue
      ? {
          catalog: initial.catalog,
          queue: initial.queue,
          view: 'pending',
          cursor: undefined,
        }
      : undefined,
  );
  const [loading, setLoading] = useState(!initial?.queue),
    [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [filters, setFilters] = useState<SubmissionFilters | undefined>(
    initial?.queue?.filters,
  );
  const filterAction = useAdminAction(onAccessLost);
  // Paging/filtering keeps the prepared catalog; explicit refresh and writes reload it.
  const catalogCache = useRef(
    initial?.catalog
      ? { client, refresh: 0, catalog: initial.catalog }
      : undefined,
  );
  useEffect(() => {
    if (preparedRead.current) {
      preparedRead.current = false;
      return;
    }
    let active = true;
    const controller = new AbortController(),
      timer = window.setTimeout(() => controller.abort(), 10000);
    setLoading(true);
    setError(undefined);
    void Promise.all([
      catalogCache.current?.client === client &&
      catalogCache.current.refresh === refresh
        ? Promise.resolve(catalogCache.current.catalog)
        : client.catalog(controller.signal),
      client.queue(view, cursor, controller.signal),
    ])
      .then(([catalog, queue]) => {
        // Historical claims may reference an item removed from the active catalog.
        if (queue.nextCursor !== null && queue.nextCursor === cursor)
          throw new Error(appText.webAdminQueueInconsistentReviewSnapshot);
        if (active) {
          catalogCache.current = { client, refresh, catalog };
          setSnapshot({ catalog, queue, view, cursor });
          if (queue.filters)
            setFilters((saved) =>
              !saved ||
              Number(queue.filters!.revision.split('-').at(-1)) >
                Number(saved.revision.split('-').at(-1))
                ? queue.filters
                : saved,
            );
        }
      })
      .catch((failure: unknown) => {
        if (!active) return;
        if (classifyAccessFailure(failure) === 'expired') onAccessLost();
        else
          setError(
            failure instanceof AdminRequestError
              ? failure.message
              : appText.webAdminQueueCouldNotRefreshSubmissionsTheLastSuccessfulViewIsPreserved,
          );
      })
      .finally(() => {
        clearTimeout(timer);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [client, view, cursor, refresh, onAccessLost]);
  // A retained response must match the selected filter/page before it can be acted upon.
  const ready = snapshot?.view === view && snapshot.cursor === cursor;
  const changing = loading || (!ready && !error);
  const pageProblem = error
    ? appText.webAdminQueueTheCurrentPageCouldNotBeLoadedReloadTheSubmissions
    : !ready
      ? appText.webAdminQueueTheRequestedPageIsNotLoadedYet
      : null;
  const previousReason = loading
    ? appText.webAdminQueueLoadingSubmissions
    : (pageProblem ??
      (cursors.length === 1
        ? appText.webAdminQueueAlreadyOnTheFirstPage
        : null));
  const nextReason = loading
    ? appText.webAdminQueueLoadingSubmissions
    : (pageProblem ??
      (!snapshot?.queue.nextCursor
        ? appText.webAdminQueueAlreadyOnTheLastPage
        : null));
  const choose = (next: QueueView) => {
    setView(next);
    setCursors([undefined]);
    setSelected(undefined);
    setNotice(undefined);
  };
  return (
    <>
      {snapshot?.catalog && (
        <ManualSubmissionForm
          catalog={snapshot.catalog}
          client={client}
          session={session}
          onAccessLost={onAccessLost}
          onCreated={(row) => {
            setNotice(appText.webAdminQueueManualSubmissionCreated(row.status));
            setSelected(undefined);
            setView(row.status === 'pending' ? 'pending' : 'reviewed');
            setCursors([undefined]);
            setRefresh((v) => v + 1);
          }}
        />
      )}
      <section className="admin-panel submission-filter-panel">
        <h2 id="submission-filter-title">
          {appText.webAdminQueueFilterOutRegularDuplicates}
        </h2>
        {session.role === 'admin' ? (
          <button
            type="button"
            className="site-button admin-toggle"
            role="switch"
            aria-labelledby="submission-filter-title"
            aria-checked={filters?.filterCollected ?? false}
            disabled={!filters || filterAction.busy}
            onClick={() => {
              if (!filters || session.role !== 'admin') return;
              const checked = !filters.filterCollected;
              void filterAction.execute(
                async (signal) => {
                  const saved = await client.saveSubmissionFilters(
                    checked,
                    filters.revision,
                    session.csrfToken,
                    signal,
                  );
                  if (!signal.aborted) setFilters(saved);
                },
                async (signal) => {
                  const current = await client.queue(view, cursor, signal);
                  if (!signal.aborted && current.filters)
                    setFilters(current.filters);
                },
              );
            }}
          >
            {filters?.filterCollected
              ? appText.webAdminQueueOn
              : appText.webAdminQueueOff}
          </button>
        ) : (
          <p>
            {appText.webAdminQueueDuplicateFilterExplanation.beforeState}{' '}
            <strong>
              {filters
                ? filters.filterCollected
                  ? appText.webAdminQueueDuplicateFilterExplanation.enabled
                  : appText.webAdminQueueDuplicateFilterExplanation.disabled
                : appText.webAdminQueueDuplicateFilterExplanation.unavailable}
            </strong>
            {appText.webAdminQueueDuplicateFilterExplanation.afterState}
          </p>
        )}
        {filterAction.error && <p role="alert">{filterAction.error}</p>}
      </section>
      <section className="admin-panel">
        <div className="admin-section-heading">
          <div>
            <h2>{appText.webAdminQueueSubmissions}</h2>
          </div>
          <button
            className="site-button"
            disabled={loading}
            onClick={() => setRefresh((v) => v + 1)}
          >
            {appText.webAdminQueueRefreshSubmissions}
          </button>
        </div>
        <div
          className="admin-filters"
          role="group"
          aria-label={appText.webAdminQueueSubmissionViews}
        >
          {(['pending', 'unmatched', 'reviewed'] as const).map((id) => (
            <button
              type="button"
              key={id}
              aria-pressed={view === id}
              className="site-button"
              onClick={() => choose(id)}
            >
              {id === 'pending'
                ? appText.webAdminQueuePending
                : id === 'unmatched'
                  ? appText.webAdminQueueUnmatched
                  : appText.webAdminQueueReviewed}
            </button>
          ))}
        </div>
        {notice && (
          <p role="status" className="admin-success">
            {notice}
          </p>
        )}
        {error && (
          <div role="alert" className="admin-error">
            <p>{error}</p>
            <button
              className="site-button"
              onClick={() => {
                setCursors([undefined]);
                setRefresh((v) => v + 1);
              }}
            >
              {appText.webAdminQueueReloadCurrentSubmissions}
            </button>
          </div>
        )}
        <div className="submission-results" aria-busy={changing}>
          {snapshot && snapshot.queue.submissions.length > 0 && (
            <ul className="submission-list">
              {snapshot.queue.submissions.map((row) => {
                const item = snapshot.catalog.items.find(
                  (item) => item.id === row.itemId,
                );
                return (
                  <li
                    key={row.id}
                    className={
                      selected === row.id
                        ? 'submission-card submission-card--selected'
                        : 'submission-card'
                    }
                  >
                    <button
                      type="button"
                      className="submission-card__open"
                      disabled={changing || !ready || Boolean(error)}
                      onClick={() => setSelected(row.id)}
                      aria-label={appText.webAdminQueueReview(
                        row.collectorName,
                        item?.name ?? row.rawItemText,
                      )}
                    >
                      <span className="submission-card__summary">
                        <span className="submission-card__item">
                          {item ? (
                            <img src={item.iconPath} alt="" />
                          ) : (
                            <span
                              className="submission-card__icon-fallback"
                              aria-hidden="true"
                            >
                              {appText.webAdminQueueQuestionMark}
                            </span>
                          )}
                          <strong>
                            {item?.name ??
                              (row.rawItemText ||
                                appText.webAdminQueueNeedsItemMatch)}
                          </strong>
                        </span>
                        <span className="submission-card__collector">
                          {row.collectorName}
                        </span>
                        {row.itemId === null && (
                          <span>
                            {appText.webAdminQueueUnmatchedMessage(
                              row.gameItemId === undefined
                                ? ''
                                : appText.webAdminQueueGameItemId(
                                    row.gameItemId,
                                  ),
                            )}
                          </span>
                        )}
                        <time dateTime={row.submittedAt}>
                          {formatUtcTime(row.submittedAt)}
                        </time>
                        <span>
                          {row.collectionType === null
                            ? appText.webAdminQueueAwaitingItemMatch
                            : row.collectionType === 'event'
                              ? appText.webAdminQueueEventCollection
                              : appText.webAdminQueueRegularCollection}
                        </span>
                      </span>
                      {safeScreenshotPath(row.screenshotPath) && (
                        <img
                          className="submission-card__screenshot"
                          src={row.screenshotPath}
                          alt={appText.webAdminQueueSubmissionScreenshot}
                          loading="lazy"
                        />
                      )}
                      <span
                        className={'admin-badge admin-badge--' + row.status}
                      >
                        {appText.domainDisplaySubmissionStatus[row.status]}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {(!snapshot || !snapshot.queue.submissions.length) && (
            <p className="admin-empty" role={changing ? 'status' : undefined}>
              {changing
                ? appText.webAdminQueueLoadingSubmissions3(view)
                : appText.webAdminQueueNoSubmissionsInThisView(
                    snapshot?.view ?? view,
                  )}
            </p>
          )}
          {changing && snapshot && snapshot.queue.submissions.length > 0 && (
            <p className="queue-loading" role="status">
              {appText.webAdminQueueLoadingSubmissionsMessage(view)}
            </p>
          )}
        </div>
        <div className="admin-pagination">
          <button
            className="site-button"
            disabled={Boolean(previousReason)}
            aria-describedby={
              previousReason ? pagingHintId + '-previous' : undefined
            }
            aria-busy={loading}
            onClick={() => {
              setCursors((values) => values.slice(0, -1));
              setSelected(undefined);
            }}
          >
            {appText.webAdminQueuePreviousPage}
          </button>
          <span>{appText.webAdminQueuePageMessage(cursors.length)}</span>
          <button
            className="site-button"
            disabled={Boolean(nextReason)}
            aria-describedby={nextReason ? pagingHintId + '-next' : undefined}
            aria-busy={loading}
            onClick={() => {
              setCursors((values) => [
                ...values.slice(0, -1),
                snapshot!.queue.pageCursor,
                snapshot!.queue.nextCursor!,
              ]);
              setSelected(undefined);
            }}
          >
            {appText.webAdminQueueNextPage}
          </button>
        </div>
        {previousReason && (
          <p id={pagingHintId + '-previous'} className="sr-only">
            {previousReason}
          </p>
        )}
        {nextReason && (
          <p id={pagingHintId + '-next'} className="sr-only">
            {nextReason}
          </p>
        )}
      </section>
      {selected && snapshot && (
        <SubmissionEditor
          key={selected}
          id={selected}
          catalog={snapshot.catalog}
          client={client}
          session={session}
          disabled={loading || Boolean(error)}
          onAccessLost={onAccessLost}
          onClose={() => setSelected(undefined)}
          onChanged={(status) => {
            setNotice(appText.webAdminQueueSavedSubmissionState(status));
            setCursors([undefined]);
            if (status !== 'pending') {
              setView('reviewed');
            }
            setRefresh((v) => v + 1);
          }}
        />
      )}
    </>
  );
}
