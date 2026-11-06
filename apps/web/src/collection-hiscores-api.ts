import * as appText from '@clog/domain';
import {
  collectionHiScoreMetrics,
  collectionHiScorePage,
  normalizePlayerName,
  type CollectionHiScoreQuery,
  type CollectionHiScores,
} from '@clog/domain';

export function collectionHiScoresKey(query: CollectionHiScoreQuery) {
  return JSON.stringify([
    query.metric,
    query.page,
    query.player ? normalizePlayerName(query.player) : null,
  ]);
}
export function collectionHiScoresHref(query: CollectionHiScoreQuery) {
  const params = new URLSearchParams({
    metric: query.metric,
    page: String(query.page),
  });
  if (query.player) params.set('player', query.player);
  return '/collections/hiscores?' + params.toString();
}
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error(appText.hiscoresUnavailable);
  return value as Record<string, unknown>;
};
const integer = (value: unknown, min: number) => {
  if (!Number.isSafeInteger(value) || Number(value) < min)
    throw Error(appText.hiscoresUnavailable);
  return Number(value);
};
export function parseCollectionHiScores(value: unknown): CollectionHiScores {
  const r = record(value);
  if (
    typeof r.revision !== 'string' ||
    !/^hiscores-[0-9]+-[0-9]+-[01]$/u.test(r.revision) ||
    !collectionHiScoreMetrics.includes(
      r.metric as CollectionHiScores['metric'],
    ) ||
    r.pageSize !== 25 ||
    typeof r.hardcoreEnabled !== 'boolean' ||
    !Array.isArray(r.players)
  )
    throw Error(appText.hiscoresUnavailable);
  const page = integer(r.page, 1),
    totalPlayers = integer(r.totalPlayers, 0),
    totalPages = integer(r.totalPages, 1);
  if (
    totalPages !== Math.max(1, Math.ceil(totalPlayers / 25)) ||
    page > totalPages ||
    r.players.length !== Math.min(25, totalPlayers - (page - 1) * 25)
  )
    throw Error(appText.hiscoresUnavailable);
  const players = r.players.map((value, index) => {
    const row = record(value);
    if (
      row.rank !== (page - 1) * 25 + index + 1 ||
      typeof row.name !== 'string' ||
      !row.name ||
      row.name.length > 80 ||
      typeof row.score !== 'string' ||
      !/^[1-9][0-9]{0,18}$/u.test(row.score)
    )
      throw Error(appText.hiscoresUnavailable);
    return { rank: Number(row.rank), name: row.name, score: row.score };
  });
  const match = r.match === null ? null : record(r.match);
  if (
    match &&
    (typeof match.name !== 'string' ||
      !players.some(
        (row) => row.name === match.name && row.rank === match.rank,
      ) ||
      collectionHiScorePage(Number(match.rank)) !== page)
  )
    throw Error(appText.hiscoresUnavailable);
  if (r.metric === 'hardcore' && !r.hardcoreEnabled && totalPlayers)
    throw Error(appText.hiscoresUnavailable);
  return {
    revision: r.revision,
    metric: r.metric as CollectionHiScores['metric'],
    page,
    pageSize: 25,
    totalPlayers,
    totalPages,
    hardcoreEnabled: r.hardcoreEnabled,
    players,
    match: match
      ? { name: String(match.name), rank: Number(match.rank) }
      : null,
  };
}
/** Only the last selection is cached, plus its clamped/search-result URL alias. */
export class CollectionHiScoresClient {
  private last?: {
    key: string;
    canonical: string;
    etag: string | null;
    data: CollectionHiScores;
  };
  private cached(query: CollectionHiScoreQuery) {
    const key = collectionHiScoresKey(query);
    return this.last && (this.last.key === key || this.last.canonical === key)
      ? this.last
      : undefined;
  }
  peek(query: CollectionHiScoreQuery) {
    return this.cached(query)?.data;
  }
  async read(
    query: CollectionHiScoreQuery,
    signal: AbortSignal,
  ): Promise<CollectionHiScores> {
    const cached = this.cached(query),
      key = collectionHiScoresKey(query);
    const response = await fetch('/api/v1' + collectionHiScoresHref(query), {
      signal,
      cache: 'no-cache',
      headers: cached?.etag ? { 'If-None-Match': cached.etag } : {},
    });
    signal.throwIfAborted();
    if (response.status === 304 && cached) return cached.data;
    if (!response.ok) throw Error(appText.hiscoresUnavailable);
    const data = parseCollectionHiScores(await response.json());
    signal.throwIfAborted();
    if (
      data.metric !== query.metric ||
      (data.match &&
        (!query.player ||
          normalizePlayerName(data.match.name) !==
            normalizePlayerName(query.player)))
    )
      throw Error(appText.hiscoresUnavailable);
    this.last = {
      key,
      canonical: collectionHiScoresKey({ ...query, page: data.page }),
      etag: response.headers.get('ETag'),
      data,
    };
    return data;
  }
}
