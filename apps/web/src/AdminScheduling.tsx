import * as appText from '@clog/domain';
import { useEffect, useRef, useState } from 'react';
import { CompetitionImport } from './CompetitionImport.tsx';
import type { CompetitionClient } from './competition-api.ts';
import {
  parseCollectionScheduleInput,
  type CollectionSchedule,
  type SchedulingState,
} from '@clog/domain';
import type { AdminClient, AdminCatalog } from './admin-model.ts';
import type { AdminSession } from './xp-model.ts';
import { classifyAccessFailure } from './admin-session.ts';
import { useAdminAction } from './use-admin-action.ts';
import { usePreparedAdminData, useAdminDraft } from './admin-route-data.ts';
import {
  localScheduleInput,
  localScheduleToUtc,
  localScheduleLabel,
  utcScheduleLabel,
} from './schedule-time.ts';

export function AdminScheduling({
  client,
  session,
  onAccessLost,
  competitionClient,
}: {
  client: AdminClient;
  session: AdminSession;
  onAccessLost: () => void;
  competitionClient: CompetitionClient;
}) {
  const initial = usePreparedAdminData();
  const [state, setState] = useState<SchedulingState | undefined>(
    initial?.schedules,
  );
  const [catalog, setCatalog] = useState<AdminCatalog | undefined>(
    initial?.catalog,
  );
  const [error, setError] = useState<string>();
  const [refresh, setRefresh] = useState(0);
  const [editingId, setEditingId] = useState<string>();
  const [title, setTitle] = useState('');
  const [startLocal, setStartLocal] = useState('');
  const [endLocal, setEndLocal] = useState('');
  const [pageIds, setPageIds] = useState<string[]>([]);
  const [pageSearch, setPageSearch] = useState('');
  const [removing, setRemoving] = useState<CollectionSchedule>();
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const [now, setNow] = useState(() => new Date().toISOString());
  const action = useAdminAction(onAccessLost);
  const edited = state?.schedules.find((schedule) => schedule.id === editingId);
  useAdminDraft(
    edited
      ? title !== edited.title ||
          startLocal !== localScheduleInput(edited.startsAt) ||
          endLocal !== localScheduleInput(edited.endsAt) ||
          JSON.stringify(pageIds.slice().sort()) !==
            JSON.stringify(edited.pageIds.slice().sort())
      : !!(title || startLocal || endLocal || pageIds.length),
    action.busy,
  );
  useEffect(() => {
    if (removing && !deleteDialog.current?.open)
      deleteDialog.current?.showModal();
  }, [removing]);
  const reset = () => {
    setEditingId(undefined);
    setTitle('');
    setStartLocal('');
    setEndLocal('');
    setPageIds([]);
    setPageSearch('');
  };
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date().toISOString()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    let active = true;
    if (initial?.schedules && initial.catalog && refresh === 0) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    setState(undefined);
    setError(undefined);
    void Promise.all([
      client.scheduling(controller.signal),
      client.catalog(controller.signal),
    ])
      .then(([state, catalog]) => {
        if (active && !controller.signal.aborted) {
          setState(state);
          setCatalog(catalog);
        }
      })
      .catch((failure: unknown) => {
        if (!active) return;
        if (classifyAccessFailure(failure) === 'expired') onAccessLost();
        else setError(appText.webAdminSchedulingSchedulingCouldNotBeLoaded);
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [client, onAccessLost, refresh]);
  const reload = async (signal: AbortSignal) => {
    const [state, catalog] = await Promise.all([
      client.scheduling(signal),
      client.catalog(signal),
    ]);
    if (!signal.aborted) {
      setState(state);
      setCatalog(catalog);
      reset();
      setRemoving(undefined);
    }
  };
  const busy = action.busy || !state || !catalog;
  const previewUtc = (local: string) => {
    try {
      return utcScheduleLabel(localScheduleToUtc(local));
    } catch {
      return null;
    }
  };
  const edit = (schedule: CollectionSchedule) => {
    setEditingId(schedule.id);
    setTitle(schedule.title);
    setStartLocal(localScheduleInput(schedule.startsAt));
    setEndLocal(localScheduleInput(schedule.endsAt));
    setPageIds(schedule.pageIds);
    setPageSearch('');
    action.setMessage(undefined);
    document.getElementById('schedule-title')?.focus();
  };
  return (
    <>
      <section className="admin-panel scheduling-panel">
        <h2 id="scheduling-toggle-title">
          {
            appText.webAdminSchedulingTrackEventCollectionsDuringScheduledWindows
          }
        </h2>
        {error && (
          <p role="alert">
            {error}{' '}
            <button type="button" onClick={() => setRefresh((n) => n + 1)}>
              {appText.webAdminSchedulingRetryScheduling}
            </button>
          </p>
        )}
        {session.role === 'admin' ? (
          <div className="scheduling-toggle">
            <button
              type="button"
              className="site-button admin-toggle"
              role="switch"
              aria-label={appText.webAdminSchedulingCollectionLogScheduling}
              aria-describedby="scheduling-toggle-title"
              aria-checked={state?.enabled ?? false}
              disabled={busy}
              onClick={() => {
                if (!state) return;
                const enabled = !state.enabled;
                void action.execute(async (signal) => {
                  const saved = await client.setSchedulingEnabled(
                    enabled,
                    state.revision,
                    session.csrfToken,
                    signal,
                  );
                  if (!signal.aborted) {
                    setState(saved);
                    action.setMessage(
                      enabled
                        ? appText.webAdminSchedulingSchedulingEnabled
                        : appText.webAdminSchedulingSchedulingDisabled,
                    );
                  }
                }, reload);
              }}
            >
              {state?.enabled
                ? appText.webAdminSchedulingOn
                : appText.webAdminSchedulingOff}
            </button>
          </div>
        ) : (
          <p>
            {appText.webAdminSchedulingSchedulingIs}{' '}
            <strong>
              {state?.enabled
                ? appText.webAdminSchedulingEnabled
                : appText.webAdminSchedulingDisabled}
            </strong>
            {appText.webAdminSchedulingOnlyTheAdministratorCanChangeThis}
          </p>
        )}
      </section>
      <section className="admin-panel scheduling-panel">
        <h2>{appText.webAdminSchedulingScheduleManagement}</h2>
        <CompetitionImport
          client={competitionClient}
          session={session}
          onAccessLost={onAccessLost}
          onApplied={() => setRefresh((n) => n + 1)}
        />
        <form
          aria-busy={!state && !error}
          onSubmit={(event) => {
            event.preventDefault();
            if (!state) return;
            void action.execute(async (signal) => {
              const input = parseCollectionScheduleInput({
                title,
                startsAt: localScheduleToUtc(startLocal),
                endsAt: localScheduleToUtc(endLocal),
                pageIds,
              });
              const saved = await client.saveSchedule(
                input,
                state.revision,
                session.csrfToken,
                signal,
                editingId,
              );
              if (!signal.aborted) {
                setState(saved);
                reset();
                action.setMessage(
                  editingId
                    ? appText.webAdminSchedulingScheduleUpdated
                    : appText.webAdminSchedulingScheduleCreated,
                );
              }
            }, reload);
          }}
        >
          <h3>
            {editingId
              ? appText.webAdminSchedulingEditSchedule
              : appText.webAdminSchedulingNewSchedule}
          </h3>
          <fieldset className="admin-fieldset" disabled={busy}>
            <label htmlFor="schedule-title">
              {appText.webAdminSchedulingScheduleName}
              <input
                id="schedule-title"
                value={title}
                maxLength={100}
                required
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <div className="schedule-datetime-field">
              <label htmlFor="schedule-start">
                {appText.webAdminSchedulingStartDateAndTimeLocal}
              </label>
              <div className="schedule-datetime-row">
                <input
                  id="schedule-start"
                  type="datetime-local"
                  step={1}
                  required
                  value={startLocal}
                  onChange={(event) => setStartLocal(event.target.value)}
                />
                {previewUtc(startLocal) && (
                  <span className="schedule-utc" aria-live="polite">
                    {appText.webAdminSchedulingStartUTC(previewUtc(startLocal))}
                  </span>
                )}
              </div>
            </div>
            <div className="schedule-datetime-field">
              <label htmlFor="schedule-end">
                {appText.webAdminSchedulingEndDateAndTimeLocal}
              </label>
              <div className="schedule-datetime-row">
                <input
                  id="schedule-end"
                  type="datetime-local"
                  step={1}
                  required
                  value={endLocal}
                  onChange={(event) => setEndLocal(event.target.value)}
                />
                {previewUtc(endLocal) && (
                  <span className="schedule-utc" aria-live="polite">
                    {appText.webAdminSchedulingEndUTC(previewUtc(endLocal))}
                  </span>
                )}
              </div>
            </div>
            <label htmlFor="schedule-pages-search">
              {appText.webAdminSchedulingFindCollectionLogPages}
              <input
                id="schedule-pages-search"
                type="search"
                value={pageSearch}
                onChange={(event) => setPageSearch(event.target.value)}
              />
            </label>
            <fieldset className="schedule-page-list catalog-picker">
              <legend>{appText.webAdminSchedulingCollectionLogPages}</legend>
              <div className="catalog-choice-list">
                {!catalog && <p>{appText.webAdminSchedulingLoadingPages}</p>}
                {catalog?.pages
                  .filter((p) =>
                    (p.name + ' ' + p.category)
                      .toLowerCase()
                      .includes(pageSearch.toLowerCase()),
                  )
                  .map((page) => (
                    <label className="admin-checkbox" key={page.id}>
                      <input
                        type="checkbox"
                        checked={pageIds.includes(page.id)}
                        onChange={(event) =>
                          setPageIds(
                            event.target.checked
                              ? [...pageIds, page.id]
                              : pageIds.filter((id) => id !== page.id),
                          )
                        }
                      />
                      {page.name}
                      {appText.webAdminSchedulingOpenParenthesis}
                      {page.category}
                      {appText.webAdminSchedulingCloseParenthesis}
                    </label>
                  ))}
                {pageIds
                  .filter((id) => !catalog?.pages.some((p) => p.id === id))
                  .map((id) => (
                    <label className="admin-checkbox" key={id}>
                      <input
                        type="checkbox"
                        checked
                        onChange={() =>
                          setPageIds(pageIds.filter((value) => value !== id))
                        }
                      />
                      {appText.webAdminSchedulingUnavailablePage}
                      {id}
                      {appText.webAdminSchedulingRemoveBeforeSaving}
                    </label>
                  ))}
              </div>
            </fieldset>
            <p className="admin-note">
              {appText.webAdminSchedulingPagesSelectedMessage(pageIds.length)}
            </p>
            <div className="admin-actions">
              <button
                className="site-button"
                disabled={
                  !title.trim() || !startLocal || !endLocal || !pageIds.length
                }
              >
                {editingId
                  ? appText.webAdminSchedulingSaveSchedule
                  : appText.webAdminSchedulingCreateSchedule}
              </button>
              {editingId && (
                <button type="button" className="site-button" onClick={reset}>
                  {appText.webAdminSchedulingCancelEdit}
                </button>
              )}
            </div>
          </fieldset>
        </form>
        <h3>{appText.webAdminSchedulingSavedSchedules}</h3>
        {state?.schedules.length === 0 && (
          <p>{appText.webAdminSchedulingNoSchedulesYet}</p>
        )}
        <div className="schedule-list">
          {state?.schedules.map((schedule) => (
            <article className="schedule-card" key={schedule.id}>
              <div className="schedule-card__heading">
                <h4>{schedule.title}</h4>
                <span className="admin-badge">
                  {!state.enabled
                    ? appText.webAdminSchedulingInactiveWhileSchedulingIsDisabled
                    : now < schedule.startsAt
                      ? appText.webAdminSchedulingUpcoming
                      : now < schedule.endsAt
                        ? appText.webAdminSchedulingOpenNow
                        : appText.webAdminSchedulingEnded}
                </span>
              </div>
              <div className="schedule-card__times">
                <p>
                  {appText.webAdminSchedulingStart}
                  {localScheduleLabel(schedule.startsAt)}
                  <br />
                  <span className="schedule-utc">
                    {utcScheduleLabel(schedule.startsAt)}
                  </span>
                </p>
                <p>
                  {appText.webAdminSchedulingEnd}
                  {localScheduleLabel(schedule.endsAt)}
                  <br />
                  <span className="schedule-utc">
                    {utcScheduleLabel(schedule.endsAt)}
                  </span>
                </p>
              </div>
              <p>
                {appText.webAdminSchedulingPagesMessage(
                  schedule.pageIds
                    .map(
                      (id) =>
                        catalog?.pages.find((p) => p.id === id)?.name ??
                        appText.webAdminSchedulingUnavailablePage2(id),
                    )
                    .join(', '),
                )}
              </p>
              <div className="admin-actions">
                <button
                  type="button"
                  className="site-button"
                  disabled={busy}
                  onClick={() => edit(schedule)}
                >
                  {appText.webAdminSchedulingEdit}
                </button>
                <button
                  type="button"
                  className="site-button site-button--danger"
                  disabled={busy}
                  onClick={() => setRemoving(schedule)}
                >
                  {appText.webAdminSchedulingDelete}
                </button>
              </div>
            </article>
          ))}
        </div>
        {removing && (
          <dialog
            ref={deleteDialog}
            aria-label={appText.webAdminSchedulingDeleteSchedule}
            className="site-dialog schedule-delete-confirm"
            onCancel={() => setRemoving(undefined)}
          >
            <p>
              {appText.webAdminSchedulingDeletePagesWillFollowTheRemainingSchedules(
                removing.title,
              )}
            </p>
            <div className="admin-actions">
              <button
                type="button"
                className="site-button site-button--danger"
                disabled={busy}
                onClick={() => {
                  if (!state) return;
                  void action.execute(async (signal) => {
                    const saved = await client.deleteSchedule(
                      removing.id,
                      state.revision,
                      session.csrfToken,
                      signal,
                    );
                    if (!signal.aborted) {
                      setState(saved);
                      if (editingId === removing.id) reset();
                      setRemoving(undefined);
                      action.setMessage(
                        appText.webAdminSchedulingScheduleDeleted,
                      );
                    }
                  }, reload);
                }}
              >
                {appText.webAdminSchedulingConfirmDeleteSchedule}
              </button>
              <button
                type="button"
                className="site-button"
                disabled={busy}
                onClick={() => setRemoving(undefined)}
              >
                {appText.webAdminSchedulingKeepSchedule}
              </button>
            </div>
          </dialog>
        )}
        {action.error && <p role="alert">{action.error}</p>}
        {action.message && <p role="status">{action.message}</p>}
      </section>
    </>
  );
}
