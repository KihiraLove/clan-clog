import * as appText from '@clog/domain';
import { useEffect, useState } from 'react';
import {
  defaultRuneLiteRules,
  parseRuneLiteClanNames,
  parseRuneLiteRules,
  runeLiteClanNameLimit,
  type RuneLiteRules,
  type RuneLiteSettings,
  type WorldPolicy,
} from '@clog/domain';
import type { AdminClient } from './admin-model.ts';
import type { AdminSession } from './xp-model.ts';
import { classifyAccessFailure } from './admin-session.ts';
import { useAdminAction } from './use-admin-action.ts';
import { usePreparedAdminData, useAdminDraft } from './admin-route-data.ts';
import { ClanApiKeySettings } from './ClanApiKeySettings.tsx';
import type { ClanKeySettings } from './clan-api-key.ts';

const matchingMode = (matchName: boolean, requireKey: boolean) =>
  matchName ? (requireKey ? 'both' : 'name') : 'key';

const worldOptions = [
  ['f2p', appText.webRuneLiteReviewSettingsFreeToPlayWorldsSubmissions, true],
  ['pvp', appText.webRuneLiteReviewSettingsPvpWorldsSubmissions, true],
  ['members', appText.webRuneLiteReviewSettingsMembersWorldsSubmissions, false],
  [
    'hardcore',
    appText.webRuneLiteReviewSettingsHardcoreWorldsSubmissions,
    false,
  ],
] as const;
export function RuneLiteReviewSettings({
  client,
  session,
  onAccessLost,
}: {
  client: AdminClient;
  session: AdminSession;
  onAccessLost: () => void;
}) {
  const prepared = usePreparedAdminData();
  const initial = prepared?.runeLite;
  const [keySettings, setKeySettings] = useState<ClanKeySettings | undefined>(
    prepared?.clanKey,
  );
  const [mode, setMode] = useState(() =>
    matchingMode(
      initial?.matchClanName ?? true,
      prepared?.clanKey?.enabled ?? true,
    ),
  );
  const [saved, setSaved] = useState<RuneLiteSettings | undefined>(initial);
  const [rules, setRules] = useState<RuneLiteRules>(() =>
    initial
      ? {
          matchClanName: initial.matchClanName,
          clanNames: initial.clanNames,
          worldPolicies: initial.worldPolicies,
          playerWhitelist: initial.playerWhitelist,
        }
      : defaultRuneLiteRules(''),
  );
  const [whitelist, setWhitelist] = useState(
    initial?.playerWhitelist.join('\n') ?? '',
  );
  const [error, setError] = useState<string>();
  const [refresh, setRefresh] = useState(0);
  const action = useAdminAction(onAccessLost);
  const accept = (value: RuneLiteSettings, key: ClanKeySettings) => {
    setSaved(value);
    setKeySettings(key);
    setMode(matchingMode(value.matchClanName, key.enabled));
    setRules({
      matchClanName: value.matchClanName,
      clanNames: value.clanNames,
      worldPolicies: value.worldPolicies,
      playerWhitelist: value.playerWhitelist,
    });
    setWhitelist(value.playerWhitelist.join('\n'));
  };
  useEffect(() => {
    if (initial && prepared?.clanKey && refresh === 0) return;
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    setSaved(undefined);
    setError(undefined);
    void Promise.all([
      client.runeLiteSettings(controller.signal),
      client.clanApiKey(controller.signal),
    ])
      .then(([value, key]) => {
        if (active && !controller.signal.aborted) accept(value, key);
      })
      .catch((failure: unknown) => {
        if (!active) return;
        if (classifyAccessFailure(failure) === 'expired') onAccessLost();
        else
          setError(
            appText.webRuneLiteReviewSettingsRuneLiteReviewSettingsAreUnavailable,
          );
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [client, onAccessLost, refresh]);
  const changed =
    saved &&
    keySettings &&
    (rules.matchClanName !== saved.matchClanName ||
      mode !== matchingMode(saved.matchClanName, keySettings.enabled) ||
      JSON.stringify(rules.clanNames) !== JSON.stringify(saved.clanNames) ||
      JSON.stringify(rules.worldPolicies) !==
        JSON.stringify(saved.worldPolicies) ||
      whitelist !== saved.playerWhitelist.join('\n'));
  const disabled = action.busy || !saved || !keySettings;
  let clanNameError: string | undefined;
  if (saved) {
    try {
      parseRuneLiteClanNames(rules.clanNames, rules.matchClanName);
    } catch (failure) {
      if (failure instanceof Error) clanNameError = failure.message;
    }
  }
  const updateClanNames = (clanNames: string[]) => {
    setRules({ ...rules, clanNames });
    action.setMessage(undefined);
  };
  useAdminDraft(!!changed, action.busy);
  return (
    <>
      <ClanApiKeySettings
        client={client}
        session={session}
        onAccessLost={onAccessLost}
        settings={keySettings}
        onSaved={setKeySettings}
        busy={action.busy}
      />
      <div className="clan-api-key-settings runelite-review-settings">
        <h3>{appText.webRuneLiteReviewSettingsAutomaticReview}</h3>
        {error && (
          <p role="alert">
            {error}{' '}
            <button type="button" onClick={() => setRefresh((n) => n + 1)}>
              {appText.webRuneLiteReviewSettingsRetryReviewSettings}
            </button>
          </p>
        )}
        <form
          aria-busy={!saved && !error}
          onSubmit={(event) => {
            event.preventDefault();
            if (!saved || !keySettings || !changed || clanNameError) return;
            void action.execute(
              async (signal) => {
                const input = parseRuneLiteRules({
                  ...rules,
                  playerWhitelist: whitelist
                    .split(/\r?\n/u)
                    .filter((name) => name.trim()),
                });
                const value = await client.saveRuneLiteSettings(
                  {
                    ...input,
                    expectedRevision: saved.revision,
                    clanKeyRequirement: {
                      enabled: mode !== 'name',
                      expectedRevision: keySettings.revision,
                    },
                  },
                  session.csrfToken,
                  signal,
                );
                if (!signal.aborted) {
                  if (!value.clanKeyRequirement)
                    throw new Error(
                      appText.webRuneLiteReviewSettingsMissingClanMatchingReceipt,
                    );
                  accept(value, {
                    ...keySettings,
                    ...value.clanKeyRequirement,
                  });
                  action.setMessage(
                    appText.webRuneLiteReviewSettingsRuneLiteReviewSettingsSaved,
                  );
                }
              },
              async (signal) => {
                const [value, key] = await Promise.all([
                  client.runeLiteSettings(signal),
                  client.clanApiKey(signal),
                ]);
                if (!signal.aborted) accept(value, key);
              },
            );
          }}
        >
          <label htmlFor="runelite-clan-matching">
            {appText.webRuneLiteReviewSettingsMatchClanNameOrApi}
          </label>
          <select
            id="runelite-clan-matching"
            value={mode}
            disabled={disabled}
            onChange={(event) => {
              const next = event.target.value as 'name' | 'key' | 'both';
              setMode(next);
              setRules({
                ...rules,
                matchClanName: next !== 'key',
              });
              action.setMessage(undefined);
            }}
          >
            <option value="name">
              {appText.webRuneLiteReviewSettingsClanName}
            </option>
            <option value="key">
              {appText.webRuneLiteReviewSettingsApiKey}
            </option>
            <option value="both">
              {appText.webRuneLiteReviewSettingsBoth}
            </option>
          </select>
          <fieldset
            className="runelite-clan-names"
            disabled={disabled}
            aria-describedby={
              clanNameError ? 'runelite-clan-name-error' : undefined
            }
          >
            <legend>
              {appText.webRuneLiteReviewSettingsInGameClanNamesForMatching}
            </legend>
            {rules.clanNames.map((name, index) => (
              <div className="runelite-clan-name" key={index}>
                <label
                  className="sr-only"
                  htmlFor={`runelite-clan-name-${index}`}
                >
                  {appText.webRuneLiteReviewSettingsClanNameLabel(index + 1)}
                </label>
                <input
                  id={`runelite-clan-name-${index}`}
                  value={name}
                  maxLength={80}
                  onChange={(event) =>
                    updateClanNames(
                      rules.clanNames.map((entry, position) =>
                        position === index ? event.target.value : entry,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  aria-label={appText.webRuneLiteReviewSettingsRemoveClanName(
                    index + 1,
                  )}
                  onClick={() =>
                    updateClanNames(
                      rules.clanNames.filter(
                        (_, position) => position !== index,
                      ),
                    )
                  }
                >
                  {appText.webRuneLiteReviewSettingsRemove}
                </button>
              </div>
            ))}
            <button
              type="button"
              disabled={rules.clanNames.length >= runeLiteClanNameLimit}
              onClick={() => updateClanNames([...rules.clanNames, ''])}
            >
              {appText.webRuneLiteReviewSettingsAddClanName}
            </button>
            {clanNameError && (
              <p id="runelite-clan-name-error" role="alert">
                {clanNameError}
              </p>
            )}
          </fieldset>
          {worldOptions.map(([key, label, canReject]) => (
            <div className="runelite-world-policy" key={key}>
              <label htmlFor={'runelite-policy-' + key}>{label}</label>
              <select
                id={'runelite-policy-' + key}
                value={rules.worldPolicies[key]}
                disabled={disabled}
                onChange={(event) => {
                  setRules({
                    ...rules,
                    worldPolicies: {
                      ...rules.worldPolicies,
                      [key]: event.target.value as WorldPolicy,
                    },
                  });
                  action.setMessage(undefined);
                }}
              >
                {canReject && (
                  <option value="reject">
                    {appText.webRuneLiteReviewSettingsReject}
                  </option>
                )}
                <option value="review">
                  {appText.webRuneLiteReviewSettingsSendToReview}
                </option>
                <option value="allow">
                  {appText.webRuneLiteReviewSettingsAutoAllow}
                </option>
              </select>
            </div>
          ))}
          <label htmlFor="runelite-player-whitelist">
            {appText.webRuneLiteReviewSettingsPlayerWhitelist}
          </label>
          <textarea
            id="runelite-player-whitelist"
            rows={6}
            value={whitelist}
            disabled={disabled}
            spellCheck={false}
            onChange={(event) => {
              setWhitelist(event.target.value);
              action.setMessage(undefined);
            }}
          />
          <p className="admin-note">
            {
              appText.webRuneLiteReviewSettingsPlayersSubmissionsWhoAreTheWhitelistGetAutoAcceptedAfter
            }
          </p>
          <div className="admin-actions">
            <button
              className="site-button"
              disabled={disabled || !changed || !!clanNameError}
            >
              {appText.webRuneLiteReviewSettingsSaveReviewSettings}
            </button>
            <button
              type="button"
              disabled={disabled || !changed}
              onClick={() => {
                if (!saved || !keySettings) return;
                accept(saved, keySettings);
                action.setError(undefined);
                action.setMessage(undefined);
              }}
            >
              {appText.webRuneLiteReviewSettingsDiscardChanges}
            </button>
          </div>
        </form>
        {action.error && <p role="alert">{action.error}</p>}
        {action.message && <p role="status">{action.message}</p>}
      </div>
    </>
  );
}
