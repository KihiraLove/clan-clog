import * as appText from '@clog/domain';
import type { PodiumPlayer } from './xp-tracker.ts';
import { formatCompetitionAmount } from '@clog/domain';
export function XpPodium({
  players,
  title,
  sourceUrl,
  unit = appText.domainDisplayXpUnit,
}: {
  players: PodiumPlayer[];
  title: string;
  sourceUrl?: string | undefined;
  unit?: string;
}) {
  return (
    <aside
      className="xp-podium"
      aria-label={appText.webXpPodiumXpPodiumFor(title)}
    >
      <h2>{appText.webXpPodiumTopPlayers}</h2>
      {!players.length ? (
        <p>{appText.webXpPodiumNoFinishedResultsYet}</p>
      ) : (
        <ol className="xp-podium__places">
          {players.map((p, i) => (
            <li
              className={'xp-podium__place xp-podium__place--' + (i + 1)}
              key={p.playerId}
            >
              <span
                className="xp-podium__name"
                title={formatCompetitionAmount(p.gained) + ' ' + unit}
              >
                {p.displayName}
              </span>
              <span className="xp-podium__step">
                <span className="sr-only">{appText.webXpPodiumPlace}</span>
                {i + 1}
              </span>
            </li>
          ))}
        </ol>
      )}
      {sourceUrl && (
        <div className="event-source">
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
            {appText.webXpPodiumViewEventOnWiseOldMan}
          </a>
        </div>
      )}
    </aside>
  );
}
