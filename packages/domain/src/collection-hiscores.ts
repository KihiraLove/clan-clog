import * as appText from './text.js';
import { collectorDisplayName } from './collector-names.js';
import { normalizePlayerName } from './runelite-rules.js';

export const collectionHiScoreMetrics = [
  'total',
  'unique',
  'event',
  'hardcore',
] as const;
export type CollectionHiScoreMetric = (typeof collectionHiScoreMetrics)[number];
export const collectionHiScorePageSize = 25;
export interface CollectionHiScoreQuery {
  metric: CollectionHiScoreMetric;
  page: number;
  player?: string;
}
export interface CollectionHiScoreRow {
  rank: number;
  name: string;
  /** Decimal obtain count: never round a bigint through JSON numbers. */
  score: string;
}
export interface CollectionHiScores {
  revision: string;
  metric: CollectionHiScoreMetric;
  page: number;
  pageSize: 25;
  totalPlayers: number;
  totalPages: number;
  hardcoreEnabled: boolean;
  players: CollectionHiScoreRow[];
  match: { name: string; rank: number } | null;
}
export function collectionHiScoreName(value: unknown): string {
  try {
    if (typeof value !== 'string' || value.length > 80) throw Error();
    const name = collectorDisplayName(value);
    if (!normalizePlayerName(name)) throw Error();
    return name;
  } catch {
    throw Error(appText.hiscoresInvalidName);
  }
}
export function parseCollectionHiScoreQuery(value: {
  metric?: unknown;
  page?: unknown;
  player?: unknown;
}): CollectionHiScoreQuery {
  const metric = value.metric === undefined ? 'total' : value.metric,
    page = value.page === undefined ? '1' : value.page;
  if (
    !collectionHiScoreMetrics.includes(metric as CollectionHiScoreMetric) ||
    !/^[1-9][0-9]{0,8}$/u.test(String(page))
  )
    throw Error(appText.hiscoresInvalidSelection);
  return {
    metric: metric as CollectionHiScoreMetric,
    page: Number(page),
    ...(value.player === undefined
      ? {}
      : { player: collectionHiScoreName(value.player) }),
  };
}
export function collectionHiScorePage(rank: number) {
  if (!Number.isSafeInteger(rank) || rank < 1)
    throw Error(appText.hiscoresInvalidSelection);
  return Math.floor((rank - 1) / collectionHiScorePageSize) + 1;
}
