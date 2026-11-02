import * as appText from '@clog/domain';
import { useState } from 'react';
import {
  staffPages,
  type AccessControlSettings as Settings,
} from '@clog/domain';
import type { AdminClient } from './admin-model.ts';
import type { AdminSession } from './xp-model.ts';
import { useAdminAction } from './use-admin-action.ts';
import { useAdminDraft, usePreparedAdminData } from './admin-route-data.ts';

export function AccessControlSettings({
  client,
  session,
  onAccessLost,
}: {
  client: AdminClient;
  session: AdminSession;
  onAccessLost: () => void;
}) {
  const initial = usePreparedAdminData()?.accessControl;
  const [saved, setSaved] = useState(initial);
  const [pages, setPages] = useState(initial?.moderatorPages ?? []);
  const action = useAdminAction(onAccessLost);
  const dirty =
    !!saved && JSON.stringify(pages) !== JSON.stringify(saved.moderatorPages);
  useAdminDraft(dirty, action.busy);
  const accept = (value: Settings) => {
    setSaved(value);
    setPages(value.moderatorPages);
  };
  if (!saved)
    return (
      <p role="alert">
        {
          appText.webAccessControlSettingsAccessControlIsUnavailableReloadThisPage
        }
      </p>
    );
  return (
    <section className="admin-panel access-control-settings">
      <h2>{appText.webAccessControlSettingsAccessControl}</h2>
      <p>
        {
          appText.webAccessControlSettingsChooseWhichPagesAllModeratorsCanAccessAdministratorOnlyControls
        }
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void action.execute(
            async (signal) => {
              const value = await client.saveAccessControl(
                pages,
                saved.revision,
                session.csrfToken,
                signal,
              );
              if (!signal.aborted) {
                accept(value);
                action.setMessage(
                  appText.webAccessControlSettingsAccessControlSaved,
                );
              }
            },
            async (signal) => {
              const value = await client.accessControl(signal);
              if (!signal.aborted) accept(value);
            },
          );
        }}
      >
        <fieldset disabled={action.busy}>
          <legend>{appText.webAccessControlSettingsModeratorPageAccess}</legend>
          {staffPages.map((page) => (
            <div className="access-control-row" key={page.id}>
              <span id={'access-label-' + page.id}>{page.label}</span>
              <button
                type="button"
                className="site-button admin-toggle"
                role="switch"
                aria-labelledby={'access-label-' + page.id}
                aria-checked={pages.includes(page.id)}
                onClick={() => {
                  const selected = pages.includes(page.id)
                    ? pages.filter((id) => id !== page.id)
                    : [...pages, page.id];
                  setPages(
                    staffPages
                      .filter((entry) => selected.includes(entry.id))
                      .map((entry) => entry.id),
                  );
                  action.setMessage(undefined);
                }}
              >
                {pages.includes(page.id)
                  ? appText.webAccessControlSettingsOn
                  : appText.webAccessControlSettingsOff}
              </button>
            </div>
          ))}
        </fieldset>
        <div className="admin-actions">
          <button className="site-button" disabled={action.busy || !dirty}>
            {appText.webAccessControlSettingsSaveChanges}
          </button>
          <button
            type="button"
            className="site-button"
            disabled={action.busy || !dirty}
            onClick={() => {
              accept(saved);
              action.setMessage(undefined);
            }}
          >
            {appText.webAccessControlSettingsDiscardChanges}
          </button>
        </div>
      </form>
      {action.error && <p role="alert">{action.error}</p>}
      {action.message && <p role="status">{action.message}</p>}
    </section>
  );
}
