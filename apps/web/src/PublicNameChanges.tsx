import { useEffect, useId, useRef, useState } from 'react';
import * as appText from '@clog/domain';
import {
  normalizePlayerName,
  publicNameChangeInput,
  type PublicNameChangeInput,
} from '@clog/domain';
const endpoint = '/api/v1/collector-name-changes';
export default function PublicNameChanges() {
  const [enabled, setEnabled] = useState(false),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [oldName, setOldName] = useState(''),
    [newName, setNewName] = useState(''),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const pending = useRef<
      { fields: PublicNameChangeInput; key: string } | undefined
    >(undefined),
    dialog = useRef<HTMLDialogElement>(null),
    opener = useRef<HTMLButtonElement>(null),
    working = useRef(false),
    id = useId();
  useEffect(() => {
    let active = true;
    let controller: AbortController | undefined;
    const refresh = () => {
      controller?.abort();
      controller = new AbortController();
      const current = controller;
      void fetch(endpoint, {
        cache: 'no-store',
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(10000),
        ]),
      })
        .then(async (response) => {
          if (!response.ok) throw Error();
          const value = (await response.json()) as { enabled?: unknown };
          if (active && !current.signal.aborted)
            setEnabled(value.enabled === true);
        })
        .catch(() => {});
    };
    refresh();
    document.addEventListener('visibilitychange', refresh);
    const timer = setInterval(refresh, 30000);
    return () => {
      active = false;
      controller?.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    const element = dialog.current!;
    const x = scrollX,
      y = scrollY;
    element.showModal();
    return () => {
      element.close();
      opener.current?.focus({ preventScroll: true });
      window.scrollTo(x, y);
    };
  }, [open]);
  const change = async () => {
    if (working.current) return;
    let request = pending.current;
    if (!request) {
      try {
        request = {
          fields: publicNameChangeInput({ oldName, newName }),
          key: crypto.randomUUID(),
        };
      } catch {
        setError(appText.publicNamesInvalid);
        return;
      }
    }
    pending.current = request;
    working.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': request.key,
        },
        body: JSON.stringify(request.fields),
      });
      if (!response.ok) {
        if (
          response.status >= 400 &&
          response.status < 500 &&
          ![408, 429].includes(response.status)
        ) {
          pending.current = undefined;
          const value = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          const allowed = [
            appText.publicNamesWomFirst,
            appText.publicNamesStaffRequired,
            appText.publicNamesDisabled,
            appText.publicNamesInvalid,
            appText.collectorNamesChanged,
          ];
          setError(
            value.error && allowed.includes(value.error)
              ? value.error
              : appText.publicNamesStaffRequired,
          );
          return;
        }
        throw Error();
      }
      const value = (await response.json()) as {
        status?: unknown;
        operationId?: unknown;
        oldName?: unknown;
        newName?: unknown;
      };
      if (
        value.status !== 'changed' ||
        typeof value.operationId !== 'string' ||
        !/^[a-f0-9-]{36}$/iu.test(value.operationId) ||
        typeof value.oldName !== 'string' ||
        typeof value.newName !== 'string' ||
        normalizePlayerName(value.oldName) !==
          normalizePlayerName(request.fields.oldName) ||
        normalizePlayerName(value.newName) !==
          normalizePlayerName(request.fields.newName)
      )
        throw Error();
      pending.current = undefined;
      setOpen(false);
      setOldName('');
      setNewName('');
      setMessage(appText.publicNamesSuccess);
      document.dispatchEvent(new Event('visibilitychange'));
    } catch {
      setError(appText.publicNamesUncertain);
    } finally {
      working.current = false;
      setBusy(false);
    }
  };
  const close = () => {
    if (!working.current) setOpen(false);
  };
  return (
    <>
      {(enabled || pending.current) && (
        <button
          ref={opener}
          type="button"
          className="site-button"
          onClick={() => {
            setMessage('');
            setOpen(true);
          }}
        >
          {appText.publicNamesTitle}
        </button>
      )}
      {message && (
        <p className="public-name-success" role="status">
          {message}
        </p>
      )}
      {open && (
        <dialog
          ref={dialog}
          className="submission-review-dialog public-name-dialog"
          aria-labelledby={id}
          onCancel={(event) => {
            event.preventDefault();
            close();
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Tab') return;
            const elements = Array.from(
                event.currentTarget.querySelectorAll<HTMLElement>(
                  'input:not(:disabled),button:not(:disabled),a[href]',
                ),
              ),
              first = elements[0],
              last = elements.at(-1);
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }}
        >
          <form
            className="admin-panel"
            onSubmit={(event) => {
              event.preventDefault();
              void change();
            }}
          >
            <h2 id={id}>{appText.publicNamesTitle}</h2>
            <fieldset
              className="admin-fieldset"
              disabled={busy || !!pending.current}
            >
              <label>
                {appText.publicNamesOldName}
                <input
                  autoComplete="off"
                  maxLength={12}
                  value={oldName}
                  onChange={(event) => setOldName(event.target.value)}
                />
              </label>
              <label>
                {appText.publicNamesNewName}
                <input
                  autoComplete="off"
                  maxLength={12}
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                />
              </label>
            </fieldset>
            <div className="admin-actions">
              <button
                className="site-button"
                type="button"
                disabled={busy}
                onClick={close}
              >
                {appText.collectorNamesCancel}
              </button>
              <button className="site-button" type="submit" disabled={busy}>
                {appText.publicNamesChange}
              </button>
            </div>
            {error && (
              <div role="alert">
                <p>{error}</p>
                {error === appText.publicNamesWomFirst && (
                  <a
                    href={
                      'https://wiseoldman.net/players/' +
                      encodeURIComponent(oldName.trim()) +
                      '?dialog=submit-name'
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {appText.publicNamesWomLink}
                  </a>
                )}
              </div>
            )}
          </form>
        </dialog>
      )}
    </>
  );
}
