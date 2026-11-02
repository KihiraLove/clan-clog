import * as appText from '@clog/domain';
/** Administrator-only moderator management; temporary passwords are never redisplayed. */
import { useEffect, useState } from 'react';
import { classifyAccessFailure } from './admin-session.ts';
import type { AdminClient, StaffAccount } from './admin-model.ts';
import type { AdminSession } from './xp-model.ts';
import { useAdminAction } from './use-admin-action.ts';
import { usePreparedAdminData, useAdminDraft } from './admin-route-data.ts';

export function AdminAccounts({
  client,
  session,
  onAccessLost,
}: {
  client: AdminClient;
  session: AdminSession;
  onAccessLost: () => void;
}) {
  const initial = usePreparedAdminData()?.accounts;
  const [accounts, setAccounts] = useState<StaffAccount[] | undefined>(initial);
  const [error, setError] = useState<string>();
  const [refresh, setRefresh] = useState(0);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState<StaffAccount>();
  const action = useAdminAction(onAccessLost);
  useAdminDraft(!!(username || password), action.busy);
  useEffect(() => {
    if (initial && refresh === 0) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    setError(undefined);
    void client
      .accounts(controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) setAccounts(rows);
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return;
        if (classifyAccessFailure(failure) === 'expired') onAccessLost();
        else
          setError(
            appText.webAdminAccountsAccountsCouldNotBeLoadedRetryToRefreshTheList,
          );
      })
      .finally(() => clearTimeout(timer));
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [client, refresh, onAccessLost]);
  const manage = (
    account: StaffAccount,
    change: 'disable' | 'enable' | 'delete',
  ) => {
    void action.execute(
      async (signal) => {
        const value = await client.manageModerator(
          account.id,
          account.version ?? 1,
          change,
          session.csrfToken,
          signal,
        );
        if (!signal.aborted) {
          setAccounts((rows) =>
            change === 'delete'
              ? rows?.filter((row) => row.id !== account.id)
              : rows?.map((row) => (row.id === account.id ? value : row)),
          );
          setDeleting(undefined);
          action.setMessage(
            appText.webAdminAccountsModerator(account.username, change),
          );
        }
      },
      async (signal) => {
        const rows = await client.accounts(signal);
        if (!signal.aborted) {
          setAccounts(rows);
          setDeleting(undefined);
        }
      },
    );
  };
  return (
    <section className="admin-panel">
      <h2>{appText.webAdminAccountsModeratorAccounts}</h2>
      <form
        className="admin-credential-form"
        onSubmit={(event) => {
          event.preventDefault();
          void action.execute(async (signal) => {
            const account = await client.createModerator(
              username,
              password,
              session.csrfToken,
              signal,
            );
            if (signal.aborted) return;
            setAccounts((rows) => [...(rows ?? []), account]);
            setUsername('');
            setPassword('');
            action.setMessage(
              appText.webAdminAccountsModeratorCreated(account.username),
            );
          });
        }}
      >
        <label htmlFor="moderator-username">
          {appText.webAdminAccountsModeratorUsername}
        </label>
        <input
          id="moderator-username"
          autoComplete="off"
          required
          minLength={3}
          maxLength={32}
          pattern="[A-Za-z0-9_.\-]{3,32}"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
        <label htmlFor="moderator-password">
          {appText.webAdminAccountsTemporaryPassword}
        </label>
        <input
          id="moderator-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={256}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <p className="admin-note">
          {
            appText.webAdminAccountsUseAtLeast12CharactersAndShareTheseCredentialsWith
          }
        </p>
        <button className="site-button" disabled={action.busy}>
          {action.busy
            ? appText.webAdminAccountsCreating
            : appText.webAdminAccountsCreateModerator}
        </button>
      </form>
      {action.error && (
        <p role="alert" className="admin-error">
          {action.error}
        </p>
      )}
      {action.message && <p role="status">{action.message}</p>}
      {error ? (
        <p role="alert">
          {error}{' '}
          <button
            className="site-button"
            onClick={() => setRefresh((value) => value + 1)}
          >
            {appText.webAdminAccountsRetryAccounts}
          </button>
        </p>
      ) : !accounts ? (
        <p role="status">{appText.webAdminAccountsLoadingAccounts}</p>
      ) : (
        <div className="admin-account-list">
          <h3>{appText.webAdminAccountsExistingAccounts}</h3>
          <ul>
            {accounts.map((account) => (
              <li key={account.id}>
                <strong>{account.username}</strong>
                {appText.webAdminAccountsSeparator}
                {appText.domainDisplayStaffRole[account.role]}
                {appText.webAdminAccountsSeparator2}{' '}
                {account.disabled
                  ? appText.webAdminAccountsDisabled
                  : account.mustChangePassword
                    ? appText.webAdminAccountsPasswordChangeRequired
                    : appText.webAdminAccountsActive}
                {account.role === 'moderator' && (
                  <div className="admin-actions">
                    <button
                      className="site-button"
                      aria-label={appText.webAdminAccountsAccountAction(
                        !!account.disabled,
                        account.username,
                      )}
                      disabled={action.busy}
                      onClick={() =>
                        manage(account, account.disabled ? 'enable' : 'disable')
                      }
                    >
                      {account.disabled
                        ? appText.webAdminAccountsEnable
                        : appText.webAdminAccountsDisable}
                    </button>
                    <button
                      className="site-button"
                      aria-label={appText.webAdminAccountsDelete(
                        account.username,
                      )}
                      disabled={action.busy}
                      onClick={() => setDeleting(account)}
                    >
                      {appText.webAdminAccountsDelete2}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {deleting && (
            <div
              className="admin-delete-confirm"
              role="group"
              aria-label={appText.webAdminAccountsConfirmModeratorDeletion}
            >
              <p>
                {appText.webAdminAccountsConfirmDeletion(deleting.username)}
              </p>
              <button
                className="site-button"
                disabled={action.busy}
                onClick={() => manage(deleting, 'delete')}
              >
                {appText.webAdminAccountsConfirmDeleteModerator}
              </button>
              <button
                className="site-button"
                disabled={action.busy}
                onClick={() => setDeleting(undefined)}
              >
                {appText.webAdminAccountsCancel}
              </button>
            </div>
          )}
          {accounts.every((account) => account.role !== 'moderator') && (
            <p>{appText.webAdminAccountsNoModeratorAccountsHaveBeenCreated}</p>
          )}
        </div>
      )}
    </section>
  );
}
