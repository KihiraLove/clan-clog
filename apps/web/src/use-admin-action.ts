import * as appText from '@clog/domain';
/** Serialize form operations, bound their duration and centralize access/conflict errors. */
import { withAbort } from './with-abort.ts';
import { useEffect, useRef, useState } from 'react';
import { AdminRequestError } from './admin-api.ts';
import { classifyAccessFailure } from './admin-session.ts';

export function useAdminAction(onAccessLost: () => void) {
  const [busy, setBusy] = useState(false),
    [operation, setOperation] = useState<string>(),
    [error, setError] = useState<string>(),
    [message, setMessage] = useState<string>();
  const controller = useRef<AbortController | undefined>(undefined);
  useEffect(
    () => () => {
      controller.current?.abort();
      controller.current = undefined;
    },
    [],
  );
  const execute = async (
    work: (signal: AbortSignal) => Promise<void>,
    conflict?: (signal: AbortSignal) => Promise<void>,
    label?: string,
  ) => {
    // A ref closes the double-click gap before React renders the disabled busy state.
    if (controller.current) return;
    const current = new AbortController();
    controller.current = current;
    const timer = window.setTimeout(() => current.abort(), 15000);
    setBusy(true);
    setOperation(label ?? appText.webUseAdminActionSavingChanges);
    setError(undefined);
    setMessage(undefined);
    try {
      await withAbort(work(current.signal), current.signal);
    } catch (failure) {
      if (controller.current !== current) return;
      if (classifyAccessFailure(failure) === 'expired') onAccessLost();
      else {
        setError(
          current.signal.aborted
            ? appText.webUseAdminActionTheRequestTimedOutReloadOrRetryToCheckThe
            : failure instanceof AdminRequestError
              ? failure.message
              : failure instanceof Error
                ? failure.message
                : appText.webUseAdminActionTheAdminRequestCouldNotBeCompleted,
        );
        // A conflict may reload current state, but never silently replays the write.
        if (
          failure instanceof AdminRequestError &&
          failure.status === 409 &&
          conflict
        ) {
          try {
            await conflict(current.signal);
            if (controller.current === current && !current.signal.aborted)
              setError(
                failure.message ===
                  appText.webUseAdminActionAnotherChangeWasSavedLoadTheLatestDataBeforeTrying
                  ? appText.webUseAdminActionAnotherChangeWasSavedTheLatestDataIsLoadedReview
                  : appText.webUseAdminActionTheLatestDataIsLoadedReviewTheChangesBeforeTrying(
                      failure.message,
                    ),
              );
          } catch (failure) {
            if (classifyAccessFailure(failure) === 'expired') onAccessLost();
            else
              setError(
                appText.webUseAdminActionTheDataChangedButTheLatestVersionCouldNotBe,
              );
          }
        }
      }
    } finally {
      clearTimeout(timer);
      if (controller.current === current) {
        controller.current = undefined;
        setBusy(false);
        setOperation(undefined);
      }
    }
  };
  return { busy, operation, error, message, execute, setMessage, setError };
}
