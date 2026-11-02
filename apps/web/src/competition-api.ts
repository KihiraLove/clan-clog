import * as appText from '@clog/domain';
import {
  competitionScope,
  parseCompetitionDefinitions,
  parseCompetitionStandings,
  type CustomCompetitionMetric,
  type CompetitionMetricResolution,
  type CompetitionStanding,
  type CompetitionImportAction,
  type CompetitionKind,
  type CompetitionLifecycle,
  type WomCompetition,
} from '@clog/domain';
import {
  competitionUrl,
  identity,
  list,
  object,
  text,
  timestamp,
  unique,
  type ImportChange,
} from './xp-model.ts';
export interface CompetitionImportPreview {
  previewToken: string;
  expectedRevision: string;
  scheduleRevision: string;
  expiresAt: string;
  competition: WomCompetition;
  lifecycle: CompetitionLifecycle;
  action: CompetitionImportAction;
  scheduleStartsAt: string | null;
  pageIds: string[];
  pages: { id: string; name: string }[];
  participants: { playerId: number; displayName: string; gained: string }[];
  changes: ImportChange[];
  warnings: string[];
  standings?: CompetitionStanding[];
}
export interface CompetitionClient {
  saveMetrics?(
    resolution: CompetitionMetricResolution,
    definitions: CustomCompetitionMetric[],
    key: string,
    csrf: string,
    signal: AbortSignal,
  ): Promise<void>;
  activities(
    signal: AbortSignal,
  ): Promise<{ serverNow: string; competitions: WomCompetition[] }>;
  preview(
    url: string,
    csrf: string,
    signal: AbortSignal,
    pageIds?: string[],
  ): Promise<CompetitionImportPreview>;
  apply(
    preview: CompetitionImportPreview,
    csrf: string,
    key: string,
    acknowledged: boolean,
    signal: AbortSignal,
  ): Promise<{ outcome: 'applied' | 'unchanged' }>;
}
export function parseWomCompetition(value: unknown): WomCompetition {
  const c = object(value),
    id = identity(c.id),
    source = competitionUrl(text(c.sourceUrl));
  if (source.id !== id || !['SKILL', 'ACTIVITY'].includes(String(c.kind)))
    throw new Error(appText.webCompetitionApiInvalidCompetitionIdentityOrKind);
  const startsAt = timestamp(c.startsAt),
    endsAt = timestamp(c.endsAt),
    metrics = list(c.metrics).map(text);
  if (Date.parse(endsAt) <= Date.parse(startsAt) || !metrics.length)
    throw new Error(appText.webCompetitionApiInvalidCompetitionPeriodOrMetrics);
  unique(metrics);
  const definitions =
    c.metricDefinitions == null
      ? undefined
      : parseCompetitionDefinitions(c.metricDefinitions, metrics);
  if (competitionScope(metrics, definitions).kind !== c.kind)
    throw new Error(
      appText.webCompetitionApiCompetitionKindDoesNotMatchItsWomMetricScope,
    );
  return {
    id,
    kind: c.kind as CompetitionKind,
    title: text(c.title),
    sourceUrl: source.url,
    metrics,
    ...(definitions ? { metricDefinitions: definitions } : {}),
    ...(c.standings == null
      ? {}
      : {
          standings: parseCompetitionStandings(
            c.standings,
            metrics,
            definitions,
          ),
        }),
    startsAt,
    endsAt,
  };
}
export class CompetitionRequestError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export class LiveCompetitionClient implements CompetitionClient {
  private activityCache:
    | {
        etag: string | null;
        data: { serverNow: string; competitions: WomCompetition[] };
      }
    | undefined;
  async activities(signal: AbortSignal) {
    const response = await fetch('/api/v1/competitions/activities', {
      signal,
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: this.activityCache?.etag
        ? { 'If-None-Match': this.activityCache.etag }
        : {},
    });
    const clock = response.headers.get('X-Server-Now');
    if (
      this.activityCache &&
      (response.status === 304 ||
        (response.ok &&
          clock &&
          this.activityCache.etag &&
          response.headers.get('ETag') === this.activityCache.etag))
    ) {
      signal.throwIfAborted();
      if (!clock)
        throw new Error(
          appText.webCompetitionApiMissingCurrentCompetitionClock,
        );
      void response.body?.cancel();
      return { ...this.activityCache.data, serverNow: timestamp(clock) };
    }
    if (!response.ok)
      throw new CompetitionRequestError(
        response.status,
        appText.webCompetitionApiCompetitionsCouldNotBeRefreshed,
      );
    const value = object(await response.json());
    const competitions = list(value.competitions).map(parseWomCompetition);
    if (competitions.some((c) => c.kind !== 'ACTIVITY'))
      throw new Error(appText.webCompetitionApiInvalidActivityListing);
    unique(competitions.map((c) => c.id));
    const data = {
      serverNow: timestamp(clock ?? value.serverNow),
      competitions,
    };
    signal.throwIfAborted();
    this.activityCache = { etag: response.headers.get('ETag'), data };
    return data;
  }
  async preview(
    ...args: Parameters<CompetitionClient['preview']>
  ): Promise<CompetitionImportPreview> {
    return (await import('./competition-import-api.ts')).previewCompetition(
      ...args,
    );
  }
  async saveMetrics(
    ...args: Parameters<NonNullable<CompetitionClient['saveMetrics']>>
  ): Promise<void> {
    return (await import('./competition-import-api.ts')).saveCompetitionMetrics(
      ...args,
    );
  }
  async apply(
    ...args: Parameters<CompetitionClient['apply']>
  ): Promise<{ outcome: 'applied' | 'unchanged' }> {
    return (await import('./competition-import-api.ts')).applyCompetitionImport(
      ...args,
    );
  }
}
