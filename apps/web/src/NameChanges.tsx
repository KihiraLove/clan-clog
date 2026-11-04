import { useEffect, useId, useRef, useState } from 'react';
import * as appText from '@clog/domain';
import {
  collectorDisplayName,
  type CollectorIdentity,
  type CollectorNamePreview,
} from '@clog/domain';
import type { AdminClient } from './admin-model.ts';
import type { AdminSession } from './xp-model.ts';
import { AdminRequestError } from './admin-api.ts';
import { classifyAccessFailure } from './admin-session.ts';
import { useAdminAction } from './use-admin-action.ts';
import { useAdminDraft } from './admin-route-data.ts';
import { UserNameChangesSetting } from './UserNameChangesSetting.tsx';
export function NameChanges({
  client,
  session,
  onAccessLost,
  onChanged,
}: {
  client: AdminClient;
  session: AdminSession;
  onAccessLost: () => void;
  onChanged: () => void;
}) {
  const id = useId(),
    dialog = useRef<HTMLDialogElement>(null),
    opener = useRef<HTMLButtonElement>(null),
    cancel = useRef<HTMLButtonElement>(null);
  const [search, setSearch] = useState(''),
    [source, setSource] = useState(''),
    [newName, setNewName] = useState(''),
    [active, setActive] = useState(false),
    [refresh, setRefresh] = useState(0);
  const [options, setOptions] = useState<CollectorIdentity[]>([]),
    [targetOptions, setTargetOptions] = useState<CollectorIdentity[]>([]),
    [hasMore, setHasMore] = useState(false),
    [readError, setReadError] = useState<string>(),
    [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<CollectorNamePreview>(),
    [open, setOpen] = useState(false),
    [pending, setPending] = useState<{
      preview: CollectorNamePreview;
      key: string;
    }>(),
    [stale, setStale] = useState(false);
  const action = useAdminAction(onAccessLost),
    locked = action.busy || !!pending;
  useAdminDraft(
    !!source &&
      !!newName &&
      newName !== options.find((row) => row.id === source)?.name,
    locked,
  );
  useEffect(() => {
    if (!active || session.role !== 'admin' || !client.collectorNameClient)
      return;
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      void client.collectorNameClient!()
        .then((api) => api.collectors(search, controller.signal))
        .then((result) => {
          if (!controller.signal.aborted) {
            setOptions(result.collectors);
            setHasMore(result.hasMore);
            setReadError(undefined);
          }
        })
        .catch((error) => {
          if (!controller.signal.aborted) {
            if (classifyAccessFailure(error) === 'expired') onAccessLost();
            else setReadError(appText.collectorNamesUnavailable);
          }
        })
        .finally(() => {
          clearTimeout(deadline);
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 200);
    const deadline = setTimeout(() => {
      if (!controller.signal.aborted) {
        controller.abort();
        setLoading(false);
        setReadError(appText.collectorNamesUnavailable);
      }
    }, 15000);
    return () => {
      clearTimeout(timer);
      clearTimeout(deadline);
      controller.abort();
    };
  }, [client, active, search, refresh, session.role, onAccessLost]);
  useEffect(() => {
    if (
      !newName ||
      session.role !== 'admin' ||
      !client.collectorNameClient ||
      pending
    )
      return;
    const controller = new AbortController();
    const targetDeadline = setTimeout(() => controller.abort(), 15000);
    const timer = setTimeout(() => {
      void client.collectorNameClient!()
        .then((api) => api.collectors(newName, controller.signal))
        .then((result) => {
          if (!controller.signal.aborted) setTargetOptions(result.collectors);
        })
        .catch((error) => {
          if (
            !controller.signal.aborted &&
            classifyAccessFailure(error) === 'expired'
          )
            onAccessLost();
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      clearTimeout(targetDeadline);
      controller.abort();
    };
  }, [client, newName, session.role, pending, onAccessLost]);
  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    element?.showModal();
    cancel.current?.focus();
    return () => {
      element?.close();
      opener.current?.focus();
    };
  }, [open]);
  let valid = false;
  try {
    valid = !!source && !!collectorDisplayName(newName);
  } catch {
    /* Disabled until valid. */
  }
  const loadPreview = () =>
    void action.execute(async (signal) => {
      const api = await client.collectorNameClient!(),
        next = await api.preview(source, newName, session.csrfToken, signal);
      if (signal.aborted) return;
      if (next.operation === 'noop') {
        action.setMessage(appText.collectorNamesNoop);
        setOpen(false);
        setPreview(undefined);
        return;
      }
      setPreview(next);
      setStale(false);
      setOpen(true);
    });
  const confirm = () =>
    void action.execute(async (signal) => {
      if (!preview || stale) return;
      const request = pending ?? { preview, key: crypto.randomUUID() };
      setPending(request);
      try {
        const api = await client.collectorNameClient!(),
          result = await api.apply(
            request.preview,
            request.key,
            session.csrfToken,
            signal,
          );
        if (signal.aborted) return;
        setPending(undefined);
        setPreview(undefined);
        setOpen(false);
        setSource(result.targetId);
        setNewName(result.newName);
        setSearch(result.newName);
        setOptions([
          {
            ...(request.preview.target ?? request.preview.source),
            id: result.targetId,
            name: result.newName,
          },
        ]);
        setRefresh((n) => n + 1);
        action.setMessage(
          appText.collectorNamesSuccess(
            result.operation === 'merge',
            result.originalName,
            result.newName,
          ),
        );
        onChanged();
      } catch (error) {
        if (
          error instanceof AdminRequestError &&
          error.status >= 400 &&
          error.status < 500 &&
          ![408, 429].includes(error.status)
        ) {
          setPending(undefined);
          setStale(true);
          throw error;
        }
        throw Error(appText.collectorNamesUncertain, { cause: error });
      }
    });
  const close = () => {
    if (!action.busy) setOpen(false);
  };
  if (!client.collectorNameClient) return null;
  return (
    <section className="admin-panel name-changes-panel">
      <h2>{appText.collectorNamesTitle}</h2>
      <UserNameChangesSetting
        client={client}
        session={session}
        onAccessLost={onAccessLost}
      />
      {session.role !== 'admin' ? (
        <p>{appText.collectorNamesAdminOnly}</p>
      ) : (
        <>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (valid && !locked) loadPreview();
            }}
          >
            <fieldset className="admin-fieldset" disabled={locked}>
              <div className="admin-form-grid">
                <label>
                  {appText.collectorNamesSearch}
                  <input
                    type="search"
                    value={search}
                    maxLength={80}
                    onFocus={() => setActive(true)}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setSource('');
                      setActive(true);
                    }}
                  />
                </label>
                <label>
                  {appText.collectorNamesSource}
                  <select
                    value={source}
                    disabled={loading}
                    onFocus={() => setActive(true)}
                    onChange={(event) => setSource(event.target.value)}
                  >
                    <option value="">{appText.collectorNamesSelect}</option>
                    {options.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {appText.collectorNamesNewName}
                  <input
                    value={newName}
                    list={`${id}-targets`}
                    maxLength={80}
                    onChange={(event) => setNewName(event.target.value)}
                  />
                  <datalist id={`${id}-targets`}>
                    {targetOptions.map((row) => (
                      <option key={row.id} value={row.name} />
                    ))}
                  </datalist>
                </label>
              </div>
            </fieldset>
            {hasMore && <p>{appText.collectorNamesNarrowSearch}</p>}
            {readError && <p role="alert">{readError}</p>}
            {readError && (
              <button
                type="button"
                className="site-button"
                disabled={locked}
                onClick={() => {
                  setActive(true);
                  setRefresh((n) => n + 1);
                }}
              >
                {appText.collectorNamesReload}
              </button>
            )}
            <button
              ref={opener}
              type="button"
              className="site-button"
              disabled={action.busy || (!pending && !valid)}
              onClick={() => {
                if (pending) setOpen(true);
                else loadPreview();
              }}
            >
              {pending
                ? appText.collectorNamesRetry
                : appText.collectorNamesChange}
            </button>
          </form>
          {!open && action.error && <p role="alert">{action.error}</p>}
          {action.message && <p role="status">{action.message}</p>}
          {open && preview && (
            <dialog
              ref={dialog}
              className="submission-review-dialog collector-name-dialog"
              aria-labelledby={`${id}-title`}
              aria-describedby={`${id}-confirmation`}
              onCancel={(event) => {
                event.preventDefault();
                close();
              }}
              onKeyDown={(event) => {
                if (event.key !== 'Tab') return;
                const buttons = Array.from(
                    event.currentTarget.querySelectorAll<HTMLButtonElement>(
                      'button:not(:disabled)',
                    ),
                  ),
                  first = buttons[0],
                  last = buttons.at(-1);
                if (event.shiftKey && document.activeElement === first) {
                  event.preventDefault();
                  last?.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                  event.preventDefault();
                  first?.focus();
                }
              }}
            >
              <div className="admin-panel">
                <h2 id={`${id}-title`}>{appText.collectorNamesTitle}</h2>
                <p
                  id={`${id}-confirmation`}
                  className="collector-name-confirmation"
                >
                  {appText.collectorNamesConfirmation(
                    preview.operation === 'merge',
                    preview.source.name,
                    preview.newName,
                  )}
                </p>
                {action.error && <p role="alert">{action.error}</p>}
                <div className="admin-actions">
                  <button
                    ref={cancel}
                    type="button"
                    className="site-button"
                    disabled={action.busy}
                    onClick={close}
                  >
                    {appText.collectorNamesCancel}
                  </button>
                  {stale ? (
                    <button
                      type="button"
                      className="site-button"
                      disabled={action.busy}
                      onClick={loadPreview}
                    >
                      {appText.collectorNamesRefreshPreview}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="site-button"
                      disabled={action.busy}
                      onClick={confirm}
                    >
                      {pending
                        ? appText.collectorNamesRetry
                        : preview.operation === 'merge'
                          ? appText.collectorNamesMerge
                          : appText.collectorNamesChange}
                    </button>
                  )}
                </div>
              </div>
            </dialog>
          )}
        </>
      )}
    </section>
  );
}
