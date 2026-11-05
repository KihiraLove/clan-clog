import * as appText from '@clog/domain';
import {
  parseGameMode,
  type CollectorGameMode,
  type CollectorGameModeChange,
  type CollectorGameModeResult,
} from '@clog/domain';
import { AdminRequestError } from './admin-api.ts';
import { object, text as string } from './xp-model.ts';
const uuid =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/iu;
export function parseCollectorMode(value: unknown): CollectorGameMode {
  const r = object(value),
    id = string(r.collectorId),
    revision = string(r.revision);
  if (
    !uuid.test(id) ||
    !new RegExp(
      '^collector-mode-' + id + '-[1-9][0-9]*-[1-9][0-9]*$',
      'iu',
    ).test(revision)
  )
    throw Error(appText.gameModeUnavailable);
  return {
    collectorId: id,
    collectorName: string(r.collectorName),
    revision,
    gameMode: parseGameMode(r.gameMode),
  };
}
async function request(
  id: string,
  signal: AbortSignal,
  init: RequestInit = {},
  byCollector = false,
) {
  const response = await fetch(
    '/api/v1/admin/' +
      (byCollector ? 'collectors/' : 'submissions/') +
      encodeURIComponent(id) +
      '/game-mode',
    { ...init, signal, cache: 'no-store', credentials: 'same-origin' },
  );
  if (!response.ok) {
    const r = (await response.json().catch(() => ({}))) as { error?: string };
    throw new AdminRequestError(response.status, r.error);
  }
  return response.json();
}
export async function load(
  id: string,
  signal: AbortSignal,
  byCollector = false,
) {
  return parseCollectorMode(await request(id, signal, {}, byCollector));
}
export async function save(
  id: string,
  fields: CollectorGameModeChange,
  key: string,
  csrf: string,
  signal: AbortSignal,
  byCollector = false,
): Promise<CollectorGameModeResult> {
  const r = object(
      await request(
        id,
        signal,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrf,
            'Idempotency-Key': key,
          },
          body: JSON.stringify(fields),
        },
        byCollector,
      ),
    ),
    profile = parseCollectorMode(r),
    operationId = string(r.operationId);
  if (
    !uuid.test(operationId) ||
    profile.collectorId !== fields.collectorId ||
    profile.gameMode !== fields.gameMode ||
    profile.revision === fields.expectedRevision
  )
    throw Error(appText.gameModeUncertain);
  return { ...profile, operationId };
}
