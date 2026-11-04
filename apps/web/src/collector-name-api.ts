/** Loaded with the staff interface; validates previews and durable apply receipts. */
import type {
  CollectorIdentity,
  CollectorCounts,
  CollectorNamePreview,
  CollectorNameResult,
  UserNameChangeSettings,
} from '@clog/domain';
import * as appText from '@clog/domain';
import { AdminRequestError } from './admin-api.ts';
import { object, list, text } from './xp-model.ts';
const uuid =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/iu;
const id = (value: unknown) => {
  const v = text(value);
  if (!uuid.test(v)) throw Error(appText.collectorNamesUnavailable);
  return v;
};
const version = (v: unknown) => {
  const s = text(v);
  if (!/^[1-9][0-9]*$/u.test(s)) throw Error(appText.collectorNamesUnavailable);
  return s;
};
function collector(value: unknown): CollectorIdentity {
  const r = object(value);
  return {
    id: id(r.id),
    name: text(r.name),
    version: version(r.version),
    historyVersion: version(r.historyVersion),
  };
}
function counts(value: unknown): CollectorCounts {
  const r = object(value),
    result = { pending: 0, approved: 0, rejected: 0, revoked: 0 };
  for (const status of [
    'pending',
    'approved',
    'rejected',
    'revoked',
  ] as const) {
    if (!Number.isSafeInteger(r[status]) || Number(r[status]) < 0)
      throw Error(appText.collectorNamesUnavailable);
    result[status] = Number(r[status]);
  }
  return result;
}
export function parseCollectorPreview(value: unknown): CollectorNamePreview {
  const r = object(value),
    source = collector(r.source),
    target = r.target === null ? null : collector(r.target);
  if (
    !['rename', 'merge', 'noop'].includes(text(r.operation)) ||
    (r.operation === 'merge') !== (target !== null) ||
    target?.id === source.id
  )
    throw Error(appText.collectorNamesUnavailable);
  return {
    token: id(r.token),
    operation: r.operation as CollectorNamePreview['operation'],
    source,
    target,
    newName: text(r.newName),
    counts: counts(r.counts),
  };
}
async function request(
  path: string,
  signal: AbortSignal,
  init: RequestInit = {},
) {
  const response = await fetch('/api/v1/admin' + path, {
    ...init,
    signal,
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (!response.ok) {
    const reason = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new AdminRequestError(response.status, reason.error);
  }
  return response.json();
}
function settings(value: unknown): UserNameChangeSettings {
  const r = object(value);
  if (
    typeof r.enabled !== 'boolean' ||
    !/^collector-name-settings-[1-9][0-9]*$/u.test(text(r.revision))
  )
    throw Error(appText.userNameChangesUnavailable);
  return { enabled: r.enabled, revision: text(r.revision) };
}
export async function userSettings(signal: AbortSignal) {
  return settings(await request('/collector-name-settings', signal));
}
export async function saveUserSettings(
  current: UserNameChangeSettings,
  enabled: boolean,
  csrf: string,
  signal: AbortSignal,
) {
  return settings(
    await request('/collector-name-settings', signal, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify({ enabled, expectedRevision: current.revision }),
    }),
  );
}
export async function collectors(search: string, signal: AbortSignal) {
  const r = object(
    await request('/collectors?search=' + encodeURIComponent(search), signal),
  );
  const rows = list(r.collectors).map(collector);
  if (
    rows.length > 50 ||
    new Set(rows.map((r) => r.id)).size !== rows.length ||
    typeof r.hasMore !== 'boolean'
  )
    throw Error(appText.collectorNamesUnavailable);
  return { collectors: rows, hasMore: r.hasMore };
}
export async function preview(
  sourceId: string,
  newName: string,
  csrf: string,
  signal: AbortSignal,
) {
  const result = parseCollectorPreview(
    await request('/collector-name-changes/preview', signal, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify({ sourceId, newName }),
    }),
  );
  if (result.source.id !== sourceId)
    throw Error(appText.collectorNamesUnavailable);
  return result;
}
export async function apply(
  preview: CollectorNamePreview,
  key: string,
  csrf: string,
  signal: AbortSignal,
): Promise<CollectorNameResult> {
  const r = object(
    await request('/collector-name-changes/apply', signal, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrf,
        'Idempotency-Key': key,
      },
      body: JSON.stringify({ token: preview.token }),
    }),
  );
  const savedCounts = counts(r.counts);
  if (
    preview.operation === 'noop' ||
    r.operation !== preview.operation ||
    r.sourceId !== preview.source.id ||
    r.targetId !== (preview.target?.id ?? preview.source.id) ||
    r.originalName !== preview.source.name ||
    r.newName !== preview.newName ||
    Object.keys(savedCounts).some(
      (k) =>
        savedCounts[k as keyof CollectorCounts] !==
        preview.counts[k as keyof CollectorCounts],
    )
  )
    throw Error(appText.collectorNamesUncertain);
  return {
    operationId: id(r.operationId),
    operation: preview.operation,
    sourceId: id(r.sourceId),
    targetId: id(r.targetId),
    originalName: text(r.originalName),
    newName: text(r.newName),
    counts: savedCounts,
  };
}
