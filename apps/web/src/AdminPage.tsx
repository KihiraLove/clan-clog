import * as appText from '@clog/domain';
/** Resolve the admin session before mounting private queue/catalog views; share navigation. */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PreparedAdminEntry } from './app-runtime.ts';
import { AdminRequestError } from './admin-api.ts';
import { useLoginCooldown } from './use-login-cooldown.ts';
import {
  classifyAccessFailure,
  visibleAdminSession,
  type AdminAccess,
} from './admin-session.ts';
import type { AdminClient } from './admin-model.ts';
import type { AdminSession } from './xp-model.ts';
import { AdminRouteContext, adminRouteLabels } from './admin-route-data.ts';
import { useAdminRoutes, type AdminNavigator } from './use-admin-routes.ts';
import { withAbort } from './with-abort.ts';
import { useAdminAction } from './use-admin-action.ts';
import type { SiteSettings } from './site-settings.ts';
import type { Branding } from './branding.ts';
import { AdminSettings } from './AdminSettings.tsx';
import { AdminQueue } from './AdminQueue.tsx';
import { AdminCatalogPage } from './AdminCatalogPage.tsx';
import { CatalogUpdateNotice } from './CatalogUpdateNotice.tsx';
import { EventPageAssignments } from './EventPageAssignments.tsx';
import { AccountSettings } from './AccountSettings.tsx';
import { AdminAccounts } from './AdminAccounts.tsx';
import { RuneLiteReviewSettings } from './RuneLiteReviewSettings.tsx';
import { AdminScheduling } from './AdminScheduling.tsx';
import { DiscordBotSettings } from './DiscordBotSettings.tsx';
import { AccessControlSettings } from './AccessControlSettings.tsx';
import { staffPages, canAccessStaffPage, staffPageForPath } from '@clog/domain';
import type { CompetitionClient } from './competition-api.ts';

export interface AdminRouteProps {
  path: string;
  onNavigate: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}
export function AdminNavigation({
  path,
  onNavigate,
  session,
}: AdminRouteProps & { session?: AdminSession | null | undefined }) {
  if (!session || session.mustChangePassword) return null;
  return (
    <nav
      className="admin-navigation"
      aria-label={appText.webAdminPageAdminNavigation}
    >
      {[
        ...staffPages
          .filter((page) => canAccessStaffPage(session, page.id))
          .map((page) => [page.path, page.label]),
        ...(session?.role === 'admin'
          ? [
              ['/admin/access-control', appText.webAdminPageAccessControl],
              ['/admin/accounts', appText.webAdminPageModeratorAccounts],
            ]
          : []),
        ['/admin/account', appText.webAdminPageYourAccount],
      ].map(([url, label]) => (
        <a
          key={url}
          href={url}
          onClick={onNavigate}
          aria-current={
            path === url || (path === '/admin/xp' && url === '/admin/schedules')
              ? 'page'
              : undefined
          }
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
export function AdminPage({
  client,
  path,
  onNavigate,
  onSettingsSaved,
  onBrandingSaved,
  competitionClient,
  registerNavigation,
  initial,
}: AdminRouteProps & {
  client: AdminClient;
  competitionClient: CompetitionClient;
  registerNavigation: (navigator: AdminNavigator | null) => void;
  clanName: string;
  onSettingsSaved: (settings: SiteSettings) => void;
  onBrandingSaved: (branding: Branding, hardcore?: boolean) => void;
  initial?: PreparedAdminEntry | undefined;
}) {
  const [access, setAccess] = useState<AdminAccess>(
      () => initial?.access ?? { phase: 'checking' },
    ),
    [error, setError] = useState<string | undefined>(initial?.error);
  const session = access.phase === 'authenticated' ? access.session : null;
  const [refresh, setRefresh] = useState(0);
  const preparedAccess = useRef(Boolean(initial));
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const accessLost = useCallback(() => {
    setAccess({ phase: 'expired' });
    setError(undefined);
  }, []);
  const signedOut = useCallback(() => {
    setAccess({ phase: 'signed-out' });
    setError(undefined);
  }, []);
  const routes = useAdminRoutes({
    path,
    session,
    client,
    onAccessLost: accessLost,
    register: registerNavigation,
    initial,
  });
  const action = useAdminAction(accessLost);
  // Update role/page access without reloading unchanged forms or private drafts.
  useEffect(() => {
    if (!session || session.mustChangePassword) return;
    const controller = new AbortController();
    let reading = false;
    const check = async () => {
      if (reading || controller.signal.aborted) return;
      reading = true;
      try {
        const next = await client.session(controller.signal);
        if (!controller.signal.aborted) {
          if (!next) accessLost();
          else
            setAccess((previous) =>
              previous.phase === 'authenticated' &&
              JSON.stringify(previous.session) === JSON.stringify(next)
                ? previous
                : { phase: 'authenticated', session: next },
            );
        }
      } catch {
        /* A transient read failure does not turn a denied API operation into success. */
      } finally {
        reading = false;
      }
    };
    const onFocus = () => {
      void check();
    };
    const timer = window.setInterval(onFocus, 25000);
    window.addEventListener('focus', onFocus);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [client, session, accessLost]);
  const loginAction = useAdminAction(accessLost);
  const cooldown = useLoginCooldown();
  const loggingIn = loginAction.busy,
    loginError = loginAction.error;
  const logIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loggingIn || cooldown.seconds > 0) return;
    await loginAction.execute(async (signal) => {
      try {
        await client.login(username, password, signal);
        if (signal.aborted) return;
        const next = await client.session(signal);
        if (signal.aborted) return;
        if (!next) throw new Error(appText.webAdminPageSessionNotEstablished);
        setAccess({ phase: 'authenticated', session: next });
        setError(undefined);
        setPassword('');
      } catch (failure) {
        if (failure instanceof AdminRequestError && failure.status === 429)
          cooldown.start(failure.retryAfterSeconds ?? 60);
        if (signal.aborted) throw failure;
        throw new Error(
          failure instanceof AdminRequestError && failure.status === 401
            ? appText.webAdminPageIncorrectUsernameOrPassword
            : failure instanceof AdminRequestError && failure.status === 429
              ? appText.webAdminPageTooManyAttemptsTryAgainLater
              : appText.webAdminPageCouldNotSignInCheckYourCredentialsAndTryAgain,
          { cause: failure },
        );
      }
    });
    setPassword('');
  };
  useEffect(() => {
    if (preparedAccess.current) {
      preparedAccess.current = false;
      return;
    }
    let active = true;
    const controller = new AbortController(),
      timer = window.setTimeout(() => controller.abort(), 10000);
    setAccess({ phase: 'checking' });
    setError(undefined);
    void withAbort(client.session(controller.signal), controller.signal)
      .then((next) => {
        if (active && !controller.signal.aborted)
          setAccess(
            next
              ? { phase: 'authenticated', session: next }
              : { phase: 'signed-out' },
          );
      })
      .catch((failure: unknown) => {
        if (!active) return;
        const accessFailure = classifyAccessFailure(failure);
        if (accessFailure !== 'other') {
          setAccess({ phase: 'expired' });
          setError(undefined);
        } else {
          setAccess({ phase: 'checking' });
          setError(
            appText.webAdminPageCouldNotCheckAdminAccessReloadToTryAgain,
          );
        }
      })
      .finally(() => clearTimeout(timer));
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [client, refresh]);
  return (
    <AdminRouteContext.Provider
      value={
        routes.ready ? { data: routes.ready.data, drafts: routes.drafts } : null
      }
    >
      <div className="admin-page">
        <div className="admin-heading">
          <div>
            <h1>{appText.webAdminPageClanAdministration}</h1>
          </div>
          {session && (
            <div className="admin-account">
              <span>{session.displayName}</span>
              <button
                className="site-button"
                disabled={action.busy}
                onClick={() => {
                  void action.execute(async (signal) => {
                    await client.logout(session.csrfToken, signal);
                    if (!signal.aborted) signedOut();
                  });
                }}
              >
                {appText.webAdminPageSignOut}
              </button>
            </div>
          )}
        </div>
        {visibleAdminSession(access) && (
          <AdminNavigation
            path={path}
            onNavigate={onNavigate}
            session={session}
          />
        )}
        {routes.pending && session && (
          <aside
            className="admin-route-status"
            aria-label={appText.webAdminPagePageNavigation}
          >
            <p role={routes.pending.error ? 'alert' : 'status'}>
              {routes.pending.error ??
                appText.webAdminPageLoadingMessage(
                  adminRouteLabels[routes.pending.label] ??
                    routes.pending.label,
                )}
            </p>
            <div className="admin-actions">
              {routes.pending.codeFailure ? (
                <button
                  className="site-button"
                  onClick={() => window.location.reload()}
                >
                  {appText.webAdminPageReloadPage}
                </button>
              ) : (
                routes.pending.error && (
                  <button className="site-button" onClick={routes.retry}>
                    {appText.webAdminPageRetryNavigation}
                  </button>
                )
              )}
              <button className="site-button" onClick={routes.cancel}>
                {appText.webAdminPageCancelNavigation}
              </button>
            </div>
          </aside>
        )}
        {session?.role === 'admin' &&
          !session.mustChangePassword &&
          client.eventPageClient && (
            <EventPageAssignments
              key={session.username}
              client={client}
              session={session}
              onAccessLost={accessLost}
            />
          )}
        {session?.role === 'admin' &&
          !session.mustChangePassword &&
          client.catalogUpdateClient && (
            <CatalogUpdateNotice
              key={session.username}
              client={client}
              session={session}
              onAccessLost={accessLost}
            />
          )}
        {session &&
          !session.mustChangePassword &&
          routes.ready?.path === path &&
          routes.ready.data.kind === 'settings' &&
          canAccessStaffPage(
            session,
            path.endsWith('/hardcore') ? 'hardcore' : 'settings',
          ) &&
          (path === '/admin/settings' ||
            path === '/admin/settings/hardcore') && (
            <AdminSettings
              key={path}
              hardcore={path === '/admin/settings/hardcore'}
              client={client}
              session={session}
              onAccessLost={accessLost}
              onSaved={onSettingsSaved}
              onBrandingSaved={(value) =>
                onBrandingSaved(value, path === '/admin/settings/hardcore')
              }
            />
          )}
        {action.error && (
          <p role="alert" className="admin-error">
            {action.error}
          </p>
        )}
        {error ? (
          <section className="admin-panel">
            <h2>{appText.webAdminPageAdminAccessUnavailable}</h2>
            <p role="alert">{error}</p>
            <div className="admin-actions">
              <button
                className="site-button"
                onClick={() => setRefresh((v) => v + 1)}
              >
                {appText.webAdminPageRetryAdminAccess}
              </button>
            </div>
          </section>
        ) : access.phase === 'checking' ? (
          <p role="status">{appText.webAdminPageCheckingAdminAccess}</p>
        ) : access.phase === 'signed-out' || access.phase === 'expired' ? (
          <section className="admin-panel">
            <h2>
              {access.phase === 'expired'
                ? appText.webAdminPageAdminSessionExpired
                : appText.webAdminPageAdminSignInRequired}
            </h2>
            <p>
              {
                appText.webAdminPageSignInWithYourAdministratorOrModeratorAccount
              }
            </p>
            <form
              className="admin-credential-form"
              onSubmit={(event) => void logIn(event)}
            >
              <label htmlFor="admin-username">
                {appText.webAdminPageUsername}
              </label>
              <input
                id="admin-username"
                autoComplete="username"
                required
                maxLength={32}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
              <label htmlFor="admin-password">
                {appText.webAdminPagePassword}
              </label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                aria-describedby={
                  cooldown.seconds > 0 ? 'admin-login-cooldown' : undefined
                }
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                className="site-button"
                type="submit"
                disabled={loggingIn || cooldown.seconds > 0}
              >
                {loggingIn
                  ? appText.webAdminPageSigningIn
                  : appText.webAdminPageSignIn}
              </button>
            </form>
            {cooldown.seconds > 0 && (
              <p id="admin-login-cooldown" role="status" aria-live="polite">
                {appText.webAdminPageLoginCooldown(cooldown.seconds)}
              </p>
            )}
            {loginError && (
              <p role="alert" className="admin-error">
                {loginError}
              </p>
            )}
          </section>
        ) : !session ? null : routes.ready?.path !== path ? (
          <section
            className="admin-panel admin-route-shell"
            aria-busy={!routes.pending?.error}
          >
            <h2>
              {appText.webAdminPageLoadingMessage(
                adminRouteLabels[path] ?? appText.webAdminPageSubmissions,
              )}
            </h2>
            <p role="status">
              {appText.webAdminPagePreparingThisPageBeforeShowingItsForms}
            </p>
          </section>
        ) : !session.mustChangePassword &&
          path !== '/admin/account' &&
          !['/admin/accounts', '/admin/access-control'].includes(path) &&
          !canAccessStaffPage(
            session,
            staffPageForPath(path) ?? 'submissions',
          ) ? (
          <p role="alert">
            {appText.webAdminPageYourAccountIsNotAllowedToViewThisPage}
          </p>
        ) : routes.ready.data.kind === 'denied' ? (
          <p role="alert">{routes.ready.data.denial}</p>
        ) : session.mustChangePassword || path === '/admin/account' ? (
          <AccountSettings
            client={client}
            session={session}
            onSaved={(next) => {
              setAccess({ phase: 'authenticated', session: next });
              setError(undefined);
            }}
            onAccessLost={accessLost}
          />
        ) : path === '/admin/schedules' || path === '/admin/xp' ? (
          <AdminScheduling
            client={client}
            session={session}
            onAccessLost={accessLost}
            competitionClient={competitionClient}
          />
        ) : path === '/admin/runelite' ? (
          <section className="admin-panel">
            <h2>{appText.webAdminPageRuneLiteSubmissions}</h2>
            <RuneLiteReviewSettings
              client={client}
              session={session}
              onAccessLost={accessLost}
            />
          </section>
        ) : path === '/admin/access-control' && session.role === 'admin' ? (
          <AccessControlSettings
            client={client}
            session={session}
            onAccessLost={accessLost}
          />
        ) : path === '/admin/discord' ? (
          <DiscordBotSettings
            client={client}
            session={session}
            onAccessLost={accessLost}
          />
        ) : path === '/admin/accounts' ? (
          session.role === 'admin' ? (
            <AdminAccounts
              client={client}
              session={session}
              onAccessLost={accessLost}
            />
          ) : (
            <p role="alert">
              {
                appText.webAdminPageOnlyTheAdministratorCanCreateModeratorAccounts
              }
            </p>
          )
        ) : path === '/admin/settings' ||
          path === '/admin/settings/hardcore' ? null : path ===
          '/admin/catalog' ? (
          <AdminCatalogPage
            client={client}
            session={session}
            onAccessLost={accessLost}
          />
        ) : (
          <AdminQueue
            client={client}
            session={session}
            onAccessLost={accessLost}
          />
        )}
      </div>
    </AdminRouteContext.Provider>
  );
}
