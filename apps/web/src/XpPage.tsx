import * as appText from '@clog/domain';
/** Event sidebar and skill grid; totals and all events arrive as one validated snapshot. */
import { useEffect, useState } from 'react';
import {
  publicPoller,
  publicRead,
  reportPublicFailure,
} from './public-polling.ts';
import { XpAmount } from './XpAmount.tsx';
import { XpPodium } from './XpPodium.tsx';
import { skills, type XpClient } from './xp-model.ts';
import { eventTotals, sumXp, type XpTracker } from './xp-tracker.ts';
import { defaultSiteCopy, competitionUnit, type SiteCopy } from '@clog/domain';
import {
  CompetitionMetrics,
  CompetitionBreakdown,
} from './CompetitionMetrics.tsx';
export function XpPage({
  client,
  copy = defaultSiteCopy,
}: {
  client: XpClient;
  copy?: SiteCopy;
}) {
  const [data, setData] = useState<XpTracker>();
  const [selected, setSelected] = useState<number>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    const subscription = publicPoller.subscribe(async (signal) => {
      if (active) setLoading(true);
      try {
        const value = await publicRead(client.tracker(signal), signal);
        if (active && !signal.aborted) {
          setData(value);
          setError(undefined);
        }
      } catch {
        if (active && reportPublicFailure(signal))
          setError(appText.webXpPageXpCouldNotBeRefreshedTryAgainShortly);
      } finally {
        if (active && reportPublicFailure(signal)) setLoading(false);
      }
    }, true);
    return () => {
      active = false;
      subscription.stop();
    };
  }, [client, refresh]);
  useEffect(() => {
    setData(undefined);
    setSelected(undefined);
  }, [client]);
  const event = data?.events.find((entry) => entry.id === selected);
  const missing = selected !== undefined && !event;
  const totals =
    data && !missing ? (event ? eventTotals(event) : data.totals) : undefined;
  return (
    <section
      className="event-tracker"
      id="xp-tracker"
      aria-label={copy.xpTitle}
    >
      <h1 data-page-heading>{copy.xpTitle}</h1>
      {error && (
        <p role="alert">
          {error}{' '}
          <button onClick={() => setRefresh((n) => n + 1)}>
            {appText.webXpPageRetryXp}
          </button>
        </p>
      )}
      {loading && !data && (
        <p role="status">{appText.webXpPageLoadingClanXp}</p>
      )}
      <div className="event-tracker__layout">
        <nav className="event-sidebar" aria-label={appText.webXpPageXpEvents}>
          <button
            className="event-choice event-choice--total"
            aria-current={selected === undefined ? 'true' : undefined}
            onClick={() => setSelected(undefined)}
          >
            {appText.webXpPageTotal}
          </button>
          <div className="event-list">
            {data?.events.map((entry) => (
              <button
                className="event-choice"
                key={entry.id}
                aria-current={selected === entry.id ? 'true' : undefined}
                onClick={() => setSelected(entry.id)}
              >
                {entry.title}
              </button>
            ))}
            {data && !data.events.length && (
              <p>{appText.webXpPageNoEventsAddedYet}</p>
            )}
          </div>
        </nav>
        <div className="event-skills">
          {event?.competition && (
            <CompetitionMetrics competition={event.competition} />
          )}
          <div className="skill-panel">
            <div
              className="skill-grid"
              role="group"
              aria-label={appText.webXpPageEventSkillXp}
            >
              {skills.map(([id, name]) => (
                <XpAmount
                  key={id}
                  skill={id}
                  label={name}
                  xp={totals?.[id] ?? null}
                />
              ))}
            </div>
            <div className="skill-panel__total">
              <span>{appText.webXpPageTotalXpGained}</span>
              <XpAmount
                xp={totals ? sumXp(totals) : null}
                label={appText.webXpPageAllSkills}
              />
            </div>
          </div>
          {missing && (
            <div className="event-source">
              <p role="status">
                {
                  appText.webXpPageThisEventIsNoLongerAvailableChooseTotalOrAnother
                }
              </p>
            </div>
          )}
          {event?.competition?.standings && (
            <CompetitionBreakdown players={event.competition.standings} />
          )}
        </div>
        <XpPodium
          players={
            missing
              ? []
              : event
                ? (event.competition?.standings ?? event.podium ?? [])
                : (data?.podium ?? [])
          }
          title={
            event?.title ??
            (missing
              ? appText.webXpPageUnavailableEvent
              : appText.webXpPageTotal)
          }
          sourceUrl={event?.sourceUrl}
          unit={
            event?.competition?.standings
              ? competitionUnit(event.competition)
              : appText.domainDisplayXpUnit
          }
        />
      </div>
    </section>
  );
}
