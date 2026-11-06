import { useCallback, useEffect, useMemo, useState } from 'react';
import * as appText from '@clog/domain';
import {
  collectionHiScoreMetrics,
  collectionHiScoreName,
  parseCollectionHiScoreQuery,
  type CollectionHiScoreQuery,
} from '@clog/domain';
import {
  CollectionHiScoresClient,
  collectionHiScoresHref,
  collectionHiScoresKey,
} from './collection-hiscores-api.ts';
import { usePublicPolling } from './use-public-polling.ts';

const labels = [
  appText.hiscoresTotal,
  appText.hiscoresUnique,
  appText.hiscoresEvent,
  appText.hiscoresHardcore,
];
interface Props {
  search: string;
  visit: (href: string) => void;
  replaceSearch: (search: string) => void;
}
export function CollectionHiScoresPage({
  search,
  visit,
  replaceSearch,
}: Props) {
  const [client] = useState(() => new CollectionHiScoresClient());
  const selection = useMemo(() => {
    const params = new URLSearchParams(search);
    try {
      return {
        query: parseCollectionHiScoreQuery({
          metric: params.get('metric') ?? undefined,
          page: params.get('page') ?? undefined,
          player: params.get('player') ?? undefined,
        }),
        error: undefined,
      };
    } catch (error) {
      return {
        query: { metric: 'total', page: 1 } as CollectionHiScoreQuery,
        error: (error as Error).message,
      };
    }
  }, [search]);
  const [draft, setDraft] = useState(
      new URLSearchParams(search).get('player') ?? '',
    ),
    [invalid, setInvalid] = useState<string>();
  useEffect(() => {
    if (selection.query.player) setDraft(selection.query.player);
    setInvalid(undefined);
  }, [selection.query.player]);
  return (
    <HiScoresView
      key={collectionHiScoresKey(selection.query)}
      client={client}
      query={selection.query}
      visit={visit}
      replaceSearch={replaceSearch}
      draft={draft}
      setDraft={setDraft}
      invalid={invalid ?? selection.error}
      setInvalid={setInvalid}
    />
  );
}
function HiScoresView({
  client,
  query,
  visit,
  replaceSearch,
  draft,
  setDraft,
  invalid,
  setInvalid,
}: {
  client: CollectionHiScoresClient;
  query: CollectionHiScoreQuery;
  visit: Props['visit'];
  replaceSearch: Props['replaceSearch'];
  draft: string;
  setDraft: (value: string) => void;
  invalid: string | undefined;
  setInvalid: (value: string | undefined) => void;
}) {
  const read = useCallback(
    (signal: AbortSignal) => client.read(query, signal),
    [client, query],
  );
  const [initial] = useState(() => client.peek(query));
  const state = usePublicPolling(read, appText.hiscoresUnavailable, {
    initial,
  });
  const data = state.data,
    matched = invalid ? null : data?.match;
  const unavailable = data?.metric === 'hardcore' && !data.hardcoreEnabled;
  useEffect(() => {
    if (data && !invalid && data.page !== query.page)
      replaceSearch(
        new URL(
          collectionHiScoresHref({ ...query, page: data.page }),
          location.origin,
        ).search,
      );
  }, [data, query, replaceSearch, invalid]);
  const change = (next: CollectionHiScoreQuery) => {
    setInvalid(undefined);
    if (
      collectionHiScoresKey(next) === collectionHiScoresKey(query) &&
      location.pathname + location.search === collectionHiScoresHref(next)
    )
      state.retry();
    else visit(collectionHiScoresHref(next));
  };
  return (
    <section className="collection-hiscores" aria-label={appText.hiscoresTitle}>
      <div className="hiscores-scroll">
        <h1 data-page-heading>{appText.hiscoresTitle}</h1>
        <div
          className="hiscores-categories"
          role="group"
          aria-label={appText.hiscoresCategories}
        >
          {collectionHiScoreMetrics.map((metric, index) => (
            <button
              className="site-button"
              key={metric}
              type="button"
              aria-pressed={query.metric === metric}
              disabled={
                metric === 'hardcore' && data?.hardcoreEnabled === false
              }
              onClick={() => change({ metric, page: 1 })}
            >
              {labels[index]}
            </button>
          ))}
        </div>
        {state.loading && (
          <p className={data ? 'sr-only' : 'hiscores-loading'} role="status">
            {data ? appText.hiscoresRefreshing : appText.hiscoresLoading}
          </p>
        )}
        {state.error && (
          <p role="alert">
            {state.error}{' '}
            <button className="site-button" type="button" onClick={state.retry}>
              {appText.hiscoresRetry}
            </button>
          </p>
        )}
        {unavailable ? (
          <p role="status">{appText.hiscoresHardcoreDisabled}</p>
        ) : (
          <>
            <table className="hiscores-table">
              <caption className="sr-only">
                {labels[collectionHiScoreMetrics.indexOf(query.metric)]}
              </caption>
              <colgroup>
                <col className="hiscores-rank-column" />
                <col />
                <col className="hiscores-score-column" />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">{appText.hiscoresRank}</th>
                  <th scope="col">{appText.hiscoresName}</th>
                  <th scope="col">{appText.hiscoresScore}</th>
                </tr>
              </thead>
              <tbody>
                {data?.players.map((player) => (
                  <tr
                    key={player.rank}
                    className={
                      matched?.rank === player.rank
                        ? 'hiscores-row--matched'
                        : undefined
                    }
                    aria-current={
                      matched?.rank === player.rank ? 'true' : undefined
                    }
                  >
                    <td>{player.rank.toLocaleString()}</td>
                    <td>
                      {player.name}
                      {matched?.rank === player.rank && (
                        <span className="sr-only">
                          {' '}
                          {appText.hiscoresMatchedPlayer}
                        </span>
                      )}
                    </td>
                    <td>{BigInt(player.score).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data && !data.totalPlayers && <p>{appText.hiscoresEmpty}</p>}
          </>
        )}
        <p className="hiscores-page-number">
          {data &&
            appText.hiscoresPageLabel(
              data.page.toLocaleString(),
              data.totalPages.toLocaleString(),
            )}
        </p>
        <nav className="hiscores-paging" aria-label={appText.hiscoresTitle}>
          <button
            className="site-button hiscores-arrow hiscores-arrow--up"
            type="button"
            aria-label={appText.hiscoresPrevious}
            disabled={!data || data.page <= 1}
            onClick={() =>
              change({ metric: query.metric, page: data!.page - 1 })
            }
          >
            <span aria-hidden="true" />
          </button>
          <button
            className="site-button hiscores-arrow hiscores-arrow--down"
            type="button"
            aria-label={appText.hiscoresNext}
            disabled={!data || data.page >= data.totalPages}
            onClick={() =>
              change({ metric: query.metric, page: data!.page + 1 })
            }
          >
            <span aria-hidden="true" />
          </button>
        </nav>
      </div>
      <form
        className="hiscores-search"
        role="search"
        aria-label={appText.hiscoresTitle}
        onSubmit={(event) => {
          event.preventDefault();
          try {
            const player = collectionHiScoreName(draft);
            change({ ...query, page: data?.page ?? query.page, player });
          } catch (error) {
            setInvalid((error as Error).message);
          }
        }}
      >
        <label>
          {appText.hiscoresSearchName}
          <input
            className="admin-input"
            maxLength={80}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            autoComplete="off"
          />
        </label>
        <button className="site-button" type="submit" disabled={unavailable}>
          {appText.hiscoresSearch}
        </button>
        {invalid ? (
          <p role="alert">{invalid}</p>
        ) : (
          query.player &&
          data &&
          !unavailable && (
            <p role="status">
              {matched
                ? appText.hiscoresMatch(
                    matched.name,
                    matched.rank.toLocaleString(),
                  )
                : appText.hiscoresNotRanked}
            </p>
          )
        )}
      </form>
    </section>
  );
}
