import { useEffect, useRef, useState } from 'react';
import * as appText from '@clog/domain';
import {
  gameModes,
  gameModeLabel,
  type GameMode,
  type CollectorGameMode,
  type CollectorGameModeChange,
} from '@clog/domain';
import type { AdminClient, Submission } from './admin-model.ts';
import type { AdminSession } from './xp-model.ts';
import { useAdminAction } from './use-admin-action.ts';
import { useAdminDraft } from './admin-route-data.ts';
import { AdminRequestError } from './admin-api.ts';
import { classifyAccessFailure } from './admin-session.ts';
type Pending = { fields: CollectorGameModeChange; key: string };
// Preserve uncertain request identity if the review is dismissed and reopened.
const retained = new Map<string, Pending>();
export function GameModeEditor({
  row,
  client,
  session,
  onAccessLost,
  onSaved,
  onDirty,
  onBusy,
}: {
  row: Submission;
  client: AdminClient;
  session: AdminSession;
  onAccessLost: () => void;
  onSaved: () => void;
  onDirty: (value: boolean) => void;
  onBusy: (value: boolean) => void;
}) {
  const cacheKey = session.csrfToken + ':' + row.id;
  const [pending, setPending] = useState<Pending | undefined>(() =>
      retained.get(cacheKey),
    ),
    [current, setCurrent] = useState<CollectorGameMode>(),
    [draft, setDraft] = useState<GameMode | null>(
      retained.get(cacheKey)?.fields.gameMode ?? null,
    ),
    [readError, setReadError] = useState(false),
    [refresh, setRefresh] = useState(0),
    [stale, setStale] = useState(false);
  const action = useAdminAction(onAccessLost),
    dirty = !!pending || (!!current && draft !== current.gameMode),
    keep = useRef(false);
  const savedProfile = useRef(current),
    replace = useRef(false);
  savedProfile.current = current;
  keep.current = dirty || action.busy;
  useAdminDraft(dirty, action.busy);
  useEffect(() => {
    onDirty(dirty);
    onBusy(action.busy);
    return () => {
      onDirty(false);
      onBusy(false);
    };
  }, [dirty, action.busy, onDirty, onBusy]);
  useEffect(() => {
    if (!client.collectorModeClient) return;
    let active = true,
      controller: AbortController | undefined;
    const load = () => {
      if (document.visibilityState === 'hidden') return;
      controller?.abort();
      const read = new AbortController();
      controller = read;
      void client.collectorModeClient!()
        .then((api) =>
          api.load(
            row.id,
            AbortSignal.any([read.signal, AbortSignal.timeout(10000)]),
          ),
        )
        .then((next) => {
          if (!active || read.signal.aborted) return;
          setReadError(false);
          if (keep.current && !replace.current) {
            if (
              savedProfile.current &&
              savedProfile.current.revision !== next.revision
            )
              setStale(true);
            if (!savedProfile.current) setCurrent(next);
          } else {
            setCurrent(next);
            setDraft(next.gameMode);
            setStale(false);
            replace.current = false;
          }
        })
        .catch((error) => {
          if (!active || read.signal.aborted) return;
          if (classifyAccessFailure(error) === 'expired') onAccessLost();
          else setReadError(true);
        });
    };
    load();
    const timer = setInterval(load, 25000);
    document.addEventListener('visibilitychange', load);
    return () => {
      active = false;
      controller?.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
    };
  }, [client, row.id, refresh, onAccessLost]);
  if (!client.collectorModeClient) return null;
  const save = () =>
    void action.execute(async (signal) => {
      if (!current && !pending) return;
      const request = pending ?? {
        fields: {
          collectorId: current!.collectorId,
          expectedRevision: current!.revision,
          gameMode: draft,
        },
        key: crypto.randomUUID(),
      };
      retained.set(cacheKey, request);
      if (retained.size > 32) retained.delete(retained.keys().next().value!);
      setPending(request);
      try {
        const api = await client.collectorModeClient!(),
          saved = await api.save(
            row.id,
            request.fields,
            request.key,
            session.csrfToken,
            signal,
          );
        retained.delete(cacheKey);
        setPending(undefined);
        const next = await api.load(row.id, signal).catch(() => saved);
        if (signal.aborted) return;
        setCurrent(next);
        setDraft(next.gameMode);
        setStale(false);
        action.setMessage(appText.gameModeSaved);
        onSaved();
        document.dispatchEvent(new Event('visibilitychange'));
      } catch (error) {
        if (
          error instanceof AdminRequestError &&
          error.status >= 400 &&
          error.status < 500 &&
          ![408, 429].includes(error.status)
        ) {
          retained.delete(cacheKey);
          setPending(undefined);
          setStale(true);
          if (error.status === 409)
            throw Error(appText.gameModeChanged, { cause: error });
          throw error;
        }
        throw Error(appText.gameModeUncertain, { cause: error });
      }
    });
  return (
    <section
      className="collector-mode-editor"
      aria-label={appText.gameModeTitle}
    >
      <h3>{appText.gameModeTitle}</h3>
      {current && <p>{appText.gameModeCollector(current.collectorName)}</p>}
      <p className="admin-note">{appText.gameModeScope}</p>
      <label>
        {appText.gameModeTitle}
        <select
          value={draft ?? ''}
          disabled={!current || action.busy || !!pending}
          onChange={(event) =>
            setDraft(
              event.target.value ? (event.target.value as GameMode) : null,
            )
          }
        >
          <option value="">{appText.gameModeUnassigned}</option>
          {gameModes.map((mode) => (
            <option value={mode} key={mode}>
              {gameModeLabel(mode)}
            </option>
          ))}
        </select>
      </label>
      {row.submittedGameMode != null && (
        <p>
          {appText.gameModeSubmitted(gameModeLabel(row.submittedGameMode))}
          {current && row.submittedGameMode !== current.gameMode && (
            <>
              <br />
              {appText.gameModeConflictLabel}
            </>
          )}
        </p>
      )}
      <div className="admin-actions">
        <button
          type="button"
          className="site-button"
          disabled={
            action.busy ||
            (!current && !pending) ||
            !dirty ||
            (stale && !pending)
          }
          onClick={save}
        >
          {pending ? appText.gameModeRetry : appText.gameModeSave}
        </button>
        <button
          type="button"
          className="site-button"
          disabled={action.busy || !dirty || !!pending}
          onClick={() => {
            action.setError(undefined);
            setDraft(current?.gameMode ?? null);
            setRefresh((n) => n + 1);
          }}
        >
          {appText.gameModeDiscard}
        </button>
        {(stale || readError) && (
          <button
            type="button"
            className="site-button"
            disabled={action.busy || !!pending}
            onClick={() => {
              action.setError(undefined);
              replace.current = true;
              setRefresh((n) => n + 1);
            }}
          >
            {appText.gameModeReload}
          </button>
        )}
      </div>
      {stale && !pending && !action.error && (
        <p role="alert">{appText.gameModeChanged}</p>
      )}
      {readError && <p>{appText.gameModeUnavailable}</p>}
      {action.error && <p role="alert">{action.error}</p>}
      {action.message && <p role="status">{action.message}</p>}
    </section>
  );
}
