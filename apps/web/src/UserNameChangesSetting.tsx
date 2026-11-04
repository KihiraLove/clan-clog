import { useEffect, useState } from 'react';
import * as appText from '@clog/domain';
import type { UserNameChangeSettings } from '@clog/domain';
import type { AdminClient } from './admin-model.ts';
import type { AdminSession } from './xp-model.ts';
import { classifyAccessFailure } from './admin-session.ts';
import { useAdminAction } from './use-admin-action.ts';
export function UserNameChangesSetting({
  client,
  session,
  onAccessLost,
}: {
  client: AdminClient;
  session: AdminSession;
  onAccessLost: () => void;
}) {
  const [current, setCurrent] = useState<UserNameChangeSettings>(),
    [failed, setFailed] = useState(false),
    [reload, setReload] = useState(0);
  const action = useAdminAction(onAccessLost);
  useEffect(() => {
    const controller = new AbortController(),
      deadline = setTimeout(() => controller.abort(), 15000);
    setCurrent(undefined);
    setFailed(false);
    void client.collectorNameClient!()
      .then((api) => api.userSettings(controller.signal))
      .then((value) => {
        if (!controller.signal.aborted) setCurrent(value);
      })
      .catch((error) => {
        if (classifyAccessFailure(error) === 'expired') onAccessLost();
        else setFailed(true);
      })
      .finally(() => clearTimeout(deadline));
    return () => {
      controller.abort();
      clearTimeout(deadline);
    };
  }, [client, reload, onAccessLost]);
  return (
    <div className="user-name-setting">
      <label>
        <input
          type="checkbox"
          role="switch"
          checked={current?.enabled ?? false}
          disabled={!current || action.busy || session.role !== 'admin'}
          onChange={(event) => {
            const enabled = event.target.checked;
            setCurrent({ ...current!, enabled });
            void action.execute(async (signal) => {
              const api = await client.collectorNameClient!();
              try {
                const next = await api.saveUserSettings(
                  current!,
                  enabled,
                  session.csrfToken,
                  signal,
                );
                if (!signal.aborted) {
                  setCurrent(next);
                  action.setMessage(appText.userNameChangesSaved);
                }
              } catch (error) {
                setReload((n) => n + 1);
                throw error;
              }
            });
          }}
        />
        {appText.userNameChangesToggle}
      </label>
      {failed && (
        <p>
          {appText.userNameChangesUnavailable}{' '}
          <button
            className="site-button"
            type="button"
            onClick={() => setReload((n) => n + 1)}
          >
            {appText.collectorNamesReload}
          </button>
        </p>
      )}
      {action.error && <p role="alert">{action.error}</p>}
      {action.message && <p role="status">{action.message}</p>}
    </div>
  );
}
