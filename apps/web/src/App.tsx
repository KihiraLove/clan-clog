import * as appText from '@clog/domain';
/** Public entry keeps staff screens behind explicit route preparation. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { SiteApp } from './SiteApp.tsx';
import { useRouteNavigation } from './use-route-navigation.ts';
import { LiveAdminClient } from './admin-api.ts';
import { LiveXpClient } from './xp-api.ts';
import { LiveCompetitionClient } from './competition-api.ts';
import { prepareAppRoute } from './prepare-app-route.ts';
import { isAdminPath } from './admin-route-data.ts';
import type { AppRuntime } from './app-runtime.ts';

export function App() {
  const [live] = useState<AppRuntime>(() => ({
    admin: new LiveAdminClient(),
    xp: new LiveXpClient(),
    competition: new LiveCompetitionClient(),
  }));
  const visible = useRef({ runtime: live, admin: false });
  const prepare = useCallback(
    (route: { path: string }, signal: AbortSignal) =>
      prepareAppRoute(route, visible.current, live, signal),
    [live],
  );
  const navigation = useRouteNavigation(prepare);
  const resources = navigation.route.resources;
  useEffect(() => {
    if (!resources) return;
    visible.current = {
      runtime: resources.runtime,
      admin: isAdminPath(navigation.route.path),
    };
  }, [resources, navigation.route.path, live]);
  const pending = navigation.pending;
  return (
    <>
      {pending && (
        <aside
          className="admin-route-status"
          aria-label={appText.webAppPageNavigation}
        >
          <p role={pending.error ? 'alert' : 'status'}>
            {pending.error ?? appText.webAppLoadingPage}
          </p>
          {pending.codeFailure ? (
            <button
              className="site-button"
              onClick={() => window.location.reload()}
            >
              {appText.webAppReloadPage}
            </button>
          ) : (
            pending.error && (
              <button className="site-button" onClick={pending.retry}>
                {appText.webAppRetryNavigation}
              </button>
            )
          )}
          {resources && (
            <button className="site-button" onClick={pending.cancel}>
              {appText.webAppCancelNavigation}
            </button>
          )}
        </aside>
      )}
      {resources ? (
        <SiteApp navigation={navigation} resources={resources} />
      ) : (
        <main className="site-shell">
          <h1>{appText.webAppClanCollectionLog}</h1>
          <p>
            {isAdminPath(navigation.route.path)
              ? appText.webAppCheckingAdminAccess
              : appText.webAppPreparingThisPageBeforeShowingItsForms}
          </p>
        </main>
      )}
    </>
  );
}
