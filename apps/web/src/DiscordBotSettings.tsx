import * as appText from '@clog/domain';
import { useEffect, useState } from 'react';
import {
  parseDiscordFields,
  type DiscordSettings,
  type DiscordSettingsUpdate,
  type DiscordConnectionState,
} from '@clog/domain';
import type { AdminClient } from './admin-model.ts';
import type { AdminSession } from './xp-model.ts';
import { useAdminAction } from './use-admin-action.ts';
import { useAdminDraft, usePreparedAdminData } from './admin-route-data.ts';
import { withAbort } from './with-abort.ts';

const connectionLabels = {
  checking: appText.webDiscordBotSettingsChecking,
  disabled: appText.webDiscordBotSettingsDisabled,
  connecting: appText.webDiscordBotSettingsConnecting,
  connected: appText.webDiscordBotSettingsConnected,
  disconnected: appText.webDiscordBotSettingsDisconnected,
  unavailable: appText.webDiscordBotSettingsUnavailable,
};

export function DiscordBotSettings({
  client,
  session,
  onAccessLost,
}: {
  client: AdminClient;
  session: AdminSession;
  onAccessLost: () => void;
}) {
  const initial = usePreparedAdminData()?.discord;
  const [saved, setSaved] = useState<DiscordSettings | undefined>(initial);
  const [fields, setFields] = useState(initial);
  const [token, setToken] = useState(''),
    [clearToken, setClearToken] = useState(false);
  const action = useAdminAction(onAccessLost);
  const editable = session.role === 'admin';
  const [connection, setConnection] = useState<
    DiscordConnectionState | 'checking'
  >('checking');
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let request: AbortController | undefined;
    setConnection('checking');
    const poll = async () => {
      const controller = new AbortController();
      request = controller;
      const deadline = setTimeout(() => controller.abort(), 4000);
      try {
        const status = await withAbort(
          client.discordStatus(controller.signal),
          controller.signal,
        );
        if (active) setConnection(status.state);
      } catch {
        if (active) setConnection('unavailable');
      } finally {
        clearTimeout(deadline);
      }
      if (active)
        timer = setTimeout(() => {
          void poll();
        }, 5000);
    };
    void poll();
    return () => {
      active = false;
      request?.abort();
      clearTimeout(timer);
    };
  }, [client, saved?.revision]);
  const dirty =
    !!saved &&
    (JSON.stringify(fields) !== JSON.stringify(saved) || !!token || clearToken);
  useAdminDraft(dirty, action.busy);
  const accept = (value: DiscordSettings) => {
    setSaved(value);
    setFields(value);
    setToken('');
    setClearToken(false);
  };
  const reload = async (signal: AbortSignal) => {
    const value = await client.discordSettings(signal);
    if (!signal.aborted) accept(value);
  };
  const register = (target: 'guild' | 'test') => {
    if (!editable || !saved) return;
    void action.execute(
      async (signal) => {
        await client.registerDiscordCommands(
          target,
          saved.revision,
          session.csrfToken,
          signal,
        );
        if (!signal.aborted)
          action.setMessage(
            appText.webDiscordBotSettingsCommandsRegisteredForTheServer(target),
          );
      },
      reload,
      appText.webDiscordBotSettingsRegisteringCommands,
    );
  };
  if (!saved || !fields)
    return (
      <p role="alert">
        {
          appText.webDiscordBotSettingsDiscordSettingsAreUnavailableReloadThisPage
        }
      </p>
    );
  return (
    <section className="admin-panel discord-settings">
      <h2>{appText.webDiscordBotSettingsDiscordBot}</h2>
      {!editable && (
        <p>
          {
            appText.webDiscordBotSettingsOnlyTheAdministratorCanChangeDiscordSettingsOrRegisterCommands
          }
        </p>
      )}
      <p
        role="status"
        className="discord-connection-status"
        aria-live="polite"
        aria-atomic="true"
      >
        {appText.webDiscordBotSettingsStatus}{' '}
        <span
          className={
            connection === 'connected'
              ? 'admin-success'
              : connection === 'connecting'
                ? 'admin-warning'
                : ['disconnected', 'unavailable'].includes(connection)
                  ? 'admin-error'
                  : undefined
          }
        >
          {connectionLabels[connection]}
        </span>
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!editable) return;
          void action.execute(async (signal) => {
            const input: DiscordSettingsUpdate = {
              ...parseDiscordFields(fields),
              expectedRevision: saved.revision,
              ...(clearToken ? { token: '' } : token ? { token } : {}),
            };
            if (
              input.enabled &&
              (!saved.tokenConfigured || clearToken) &&
              !token
            )
              throw new Error(
                appText.webDiscordBotSettingsAddABotTokenBeforeEnablingDiscord,
              );
            const value = await client.saveDiscordSettings(
              input,
              session.csrfToken,
              signal,
            );
            if (!signal.aborted) {
              accept(value);
              action.setMessage(
                appText.webDiscordBotSettingsDiscordSettingsSavedTheBotWillReloadAutomatically,
              );
            }
          }, reload);
        }}
      >
        <fieldset disabled={action.busy || !editable}>
          <legend>{appText.webDiscordBotSettingsConnection}</legend>
          <div>
            <span id="discord-enable-label">
              {appText.webDiscordBotSettingsEnableDiscordBot}
            </span>{' '}
            <button
              type="button"
              className="site-button"
              role="switch"
              aria-labelledby="discord-enable-label"
              aria-checked={fields.enabled}
              onClick={() => setFields({ ...fields, enabled: !fields.enabled })}
            >
              {fields.enabled
                ? appText.webDiscordBotSettingsOn
                : appText.webDiscordBotSettingsOff}
            </button>
          </div>
          <div className="discord-settings-grid">
            <label>
              {appText.webDiscordBotSettingsApplicationId}
              <input
                inputMode="numeric"
                pattern="[0-9]{17,20}"
                maxLength={20}
                required={fields.enabled}
                value={fields.applicationId}
                onChange={(e) =>
                  setFields({ ...fields, applicationId: e.target.value })
                }
              />
            </label>
            <label>
              {appText.webDiscordBotSettingsServerId}
              <input
                inputMode="numeric"
                pattern="[0-9]{17,20}"
                maxLength={20}
                required={fields.enabled}
                value={fields.guildId}
                onChange={(e) =>
                  setFields({ ...fields, guildId: e.target.value })
                }
              />
            </label>
            <label>
              {appText.webDiscordBotSettingsTestServerIdOptional}
              <input
                inputMode="numeric"
                pattern="[0-9]{17,20}"
                maxLength={20}
                value={fields.testGuildId}
                onChange={(e) =>
                  setFields({ ...fields, testGuildId: e.target.value })
                }
              />
            </label>
            <label>
              {appText.webDiscordBotSettingsBotToken}
              <input
                type="password"
                autoComplete="new-password"
                spellCheck={false}
                maxLength={256}
                value={token}
                disabled={clearToken}
                placeholder={
                  saved.tokenConfigured
                    ? appText.webDiscordBotSettingsStoredSecurelyLeaveBlankToKeepIt
                    : appText.webDiscordBotSettingsPasteTheTokenFromDiscord
                }
                onChange={(e) => setToken(e.target.value)}
              />
            </label>
          </div>
          {!saved.tokenConfigured && (
            <p>{appText.webDiscordBotSettingsNoBotTokenIsStored}</p>
          )}
          {saved.tokenConfigured && (
            <label>
              <input
                type="checkbox"
                checked={clearToken}
                onChange={(e) => {
                  setClearToken(e.target.checked);
                  setToken('');
                  if (e.target.checked)
                    setFields({ ...fields, enabled: false });
                }}
              />
              {appText.webDiscordBotSettingsRemoveStoredTokenWhenSaving}
            </label>
          )}
        </fieldset>
        <fieldset disabled={action.busy || !editable}>
          <legend>{appText.webDiscordBotSettingsRateLimitsPerMinute}</legend>
          <div className="discord-settings-grid">
            {(
              [
                [
                  'intakeUser',
                  appText.webDiscordBotSettingsSubmissionsPerUser,
                  120,
                ],
                [
                  'intakeGuild',
                  appText.webDiscordBotSettingsSubmissionsPerServer,
                  120,
                ],
                [
                  'searchUser',
                  appText.webDiscordBotSettingsSearchesPerUser,
                  600,
                ],
                [
                  'searchGuild',
                  appText.webDiscordBotSettingsSearchesPerServer,
                  600,
                ],
              ] as const
            ).map(([key, label, max]) => (
              <label key={key}>
                {label}
                <input
                  type="number"
                  min={1}
                  max={max}
                  required
                  value={fields.limits[key]}
                  onChange={(e) =>
                    setFields({
                      ...fields,
                      limits: {
                        ...fields.limits,
                        [key]: e.target.valueAsNumber,
                      },
                    })
                  }
                />
              </label>
            ))}
          </div>
        </fieldset>
        <div className="admin-actions">
          <button
            className="site-button"
            disabled={!editable || action.busy || !dirty}
          >
            {appText.webDiscordBotSettingsSaveDiscordSettings}
          </button>
          <button
            type="button"
            className="site-button"
            disabled={!editable || action.busy || !dirty}
            onClick={() => accept(saved)}
          >
            {appText.webDiscordBotSettingsDiscardChanges}
          </button>
        </div>
      </form>
      <h3>{appText.webDiscordBotSettingsRegisterSlashCommands}</h3>
      <div className="admin-actions">
        <button
          className="site-button"
          disabled={
            !editable ||
            action.busy ||
            dirty ||
            !saved.tokenConfigured ||
            !saved.applicationId ||
            !saved.guildId
          }
          onClick={() => register('guild')}
        >
          {appText.webDiscordBotSettingsRegisterForMainServer}
        </button>
        <button
          className="site-button"
          disabled={
            !editable ||
            action.busy ||
            dirty ||
            !saved.tokenConfigured ||
            !saved.applicationId ||
            !saved.testGuildId
          }
          onClick={() => register('test')}
        >
          {appText.webDiscordBotSettingsRegisterForTestServer}
        </button>
      </div>
      {action.error && <p role="alert">{action.error}</p>}
      {action.message && <p role="status">{action.message}</p>}
    </section>
  );
}
