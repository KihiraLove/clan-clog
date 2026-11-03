/** Durable legacy choices remain outstanding until an administrator saves them. */
import { useEffect, useRef, useState } from 'react';
import * as appText from '@clog/domain';
import {
  formatCollectionDate,
  type EventPageAssignmentReview,
  type EventPageAssignmentSelection,
} from '@clog/domain';
import type { AdminClient } from './admin-model.ts';
import type { AdminSession } from './xp-model.ts';
import { AdminRequestError } from './admin-api.ts';
import { classifyAccessFailure } from './admin-session.ts';
import { useAdminAction } from './use-admin-action.ts';
import { useAdminDraft } from './admin-route-data.ts';
export function EventPageAssignments({
  client,
  session,
  onAccessLost,
}: {
  client: AdminClient;
  session: AdminSession;
  onAccessLost: () => void;
}) {
  const [review, setReview] = useState<EventPageAssignmentReview>(),
    [open, setOpen] = useState(false),
    [refresh, setRefresh] = useState(0),
    [readError, setReadError] = useState<string>();
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<{
    fields: EventPageAssignmentSelection;
    key: string;
  }>();
  const dialog = useRef<HTMLDialogElement>(null),
    button = useRef<HTMLButtonElement>(null);
  const action = useAdminAction(onAccessLost),
    locked = action.busy || !!pending;
  useAdminDraft(Object.values(choices).some(Boolean), locked);
  useEffect(() => {
    if (!client.eventPageClient) return;
    let active = true;
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 15000);
    void client
      .eventPageClient()
      .then((api) => api.eventPageAssignments(controller.signal))
      .then((next) => {
        if (!controller.signal.aborted) {
          setReview(next);
          setChoices({});
          setReadError(undefined);
          setOpen(next.total > 0);
        }
      })
      .catch((error) => {
        if (active) {
          if (classifyAccessFailure(error) === 'expired') onAccessLost();
          else setReadError(appText.eventPageReviewUnavailable);
        }
      })
      .finally(() => clearTimeout(timer));
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [client, session.username, refresh, onAccessLost]);
  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      button.current?.focus();
    };
  }, [open]);
  if (!review?.total && !readError) return null;
  const save = () => {
    void action.execute(async (signal) => {
      if (!review) return;
      const fields: EventPageAssignmentSelection = {
        expectedRevision: review.revision,
        assignments: review.credits
          .filter((r) => choices[r.submissionId])
          .map((r) => ({
            submissionId: r.submissionId,
            expectedVersion: r.version,
            eventPageId: choices[r.submissionId]!,
          })),
      };
      const request = pending ?? { fields, key: crypto.randomUUID() };
      if (!request.fields.assignments.length) return;
      setPending(request);
      const api = await client.eventPageClient!();
      try {
        await api.assignEventPages(
          request.fields,
          request.key,
          session.csrfToken,
          signal,
        );
      } catch (error) {
        if (
          error instanceof AdminRequestError &&
          error.status >= 400 &&
          error.status < 500 &&
          ![408, 429].includes(error.status)
        )
          setPending(undefined);
        if (error instanceof AdminRequestError && error.status === 409)
          throw Error(appText.eventPageReviewChanged, { cause: error });
        throw error;
      }
      if (signal.aborted) return;
      setPending(undefined);
      setChoices({});
      action.setMessage(appText.eventPageAssignmentsSaved);
      try {
        const next = await api.eventPageAssignments(signal);
        if (!signal.aborted) {
          setReview(next);
          if (!next.total) setOpen(false);
        }
      } catch {
        setReadError(appText.eventPageSavedReload);
      }
    });
  };
  const close = () => {
    if (!locked) setOpen(false);
  };
  return (
    <aside className="admin-panel">
      <h2>{appText.eventPageAssignmentsTitle}</h2>
      <p>{appText.eventPageAssignmentsHelp}</p>
      {readError && <p role="alert">{readError}</p>}
      <div className="admin-actions">
        <button
          ref={button}
          className="site-button"
          onClick={() => setOpen(true)}
          disabled={!review?.total}
        >
          {appText.eventPageReviewButton}
        </button>
        <button
          className="site-button"
          disabled={locked}
          onClick={() => setRefresh((n) => n + 1)}
        >
          {appText.eventPageReload}
        </button>
      </div>
      {open && review && (
        <dialog
          ref={dialog}
          className="submission-review-dialog"
          aria-labelledby="event-page-title"
          onCancel={(event) => {
            event.preventDefault();
            close();
          }}
        >
          <form
            className="admin-panel"
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <h2 id="event-page-title">{appText.eventPageAssignmentsTitle}</h2>
            <p>{appText.eventPageOutstanding(review.total)}</p>
            {action.error && <p role="alert">{action.error}</p>}
            {action.message && <p role="status">{action.message}</p>}
            <fieldset className="admin-fieldset" disabled={locked}>
              {review.credits.map((row) => (
                <section key={row.submissionId}>
                  <h3>
                    {appText.eventPageObtain(
                      row.itemName,
                      row.collectorName,
                      formatCollectionDate(row.collectedOn),
                    )}
                  </h3>
                  <p>
                    {appText.eventPageFrozenEvidence(
                      row.eligiblePageIds.join(', ') ||
                        appText.eventPageNoEvidence,
                    )}
                  </p>
                  {row.pages.some((p) => p.available) ? (
                    <label>
                      {appText.eventPageChoose}
                      <select
                        value={choices[row.submissionId] ?? ''}
                        onChange={(event) =>
                          setChoices({
                            ...choices,
                            [row.submissionId]: event.target.value,
                          })
                        }
                      >
                        <option value="">{appText.eventPageChoose}</option>
                        {row.pages
                          .filter((p) => p.available)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                      </select>
                    </label>
                  ) : (
                    <p role="status">{appText.eventPageRepairCatalog}</p>
                  )}
                </section>
              ))}
            </fieldset>
            {pending && <p>{appText.eventPageRetryHelp}</p>}
            <div className="admin-actions">
              <button
                type="submit"
                className="site-button"
                disabled={
                  action.busy ||
                  (!pending && !Object.values(choices).some(Boolean))
                }
              >
                {pending ? appText.eventPageRetry : appText.eventPageSave}
              </button>
              <button
                type="button"
                className="site-button"
                disabled={locked}
                onClick={close}
              >
                {appText.eventPageCancel}
              </button>
              <button
                type="button"
                className="site-button"
                disabled={locked}
                onClick={() => setRefresh((n) => n + 1)}
              >
                {appText.eventPageReload}
              </button>
            </div>
          </form>
        </dialog>
      )}
    </aside>
  );
}
