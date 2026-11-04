/** Read-only WOM verification. No player update or name-change submission requests. */
import { normalizePlayerName } from '@clog/domain';
export interface WomNameChange {
  id: number;
  playerId: number;
  oldName: string;
  newName: string;
  status: 'approved';
  resolvedAt: string;
}
export interface WomNameVerification {
  playerId: number;
  username: string;
  changes: WomNameChange[];
  verifiedAt: string;
}
export type WomNameCheck =
  | { kind: 'verified'; evidence: WomNameVerification }
  | { kind: 'wom_first' | 'staff_required' };
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const positive = (v: unknown): v is number =>
  Number.isSafeInteger(v) && Number(v) > 0;
const name = (v: unknown): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= 12;
const date = (v: unknown): v is string =>
  typeof v === 'string' && Number.isFinite(Date.parse(v));
const profile = (
  v: unknown,
  key: string,
): v is Record<string, unknown> & { id: number; username: string } =>
  record(v) &&
  positive(v.id) &&
  name(v.username) &&
  normalizePlayerName(v.username) === key &&
  ['active', 'unranked', 'flagged'].includes(String(v.status));
async function read(path: string, signal: AbortSignal, request: typeof fetch) {
  const url = 'https://api.wiseoldman.net/v2/players/' + path;
  const response = await request(url, {
    method: 'GET',
    redirect: 'error',
    signal,
    headers: { Accept: 'application/json' },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw Error();
  const length = Number(response.headers.get('content-length'));
  if (length > 512 * 1024) throw Error();
  // Bound streamed responses too, including chunked or missing Content-Length.
  const reader = response.body?.getReader();
  if (!reader) throw Error();
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const next = await reader.read();
    if (next.done) break;
    size += next.value.byteLength;
    if (size > 512 * 1024) {
      await reader.cancel();
      throw Error();
    }
    chunks.push(next.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}
export async function verifyWomNameChange(
  oldName: string,
  newName: string,
  cancellation?: AbortSignal,
  request: typeof fetch = fetch,
): Promise<WomNameCheck> {
  const signal = AbortSignal.any([
    AbortSignal.timeout(6000),
    ...(cancellation ? [cancellation] : []),
  ]);
  const oldKey = normalizePlayerName(oldName),
    newKey = normalizePlayerName(newName);
  try {
    const target = await read(encodeURIComponent(newKey), signal, request);
    if (profile(target, newKey)) {
      const raw = await read(
        encodeURIComponent(newKey) + '/names',
        signal,
        request,
      );
      if (!Array.isArray(raw) || raw.length > 2000) throw Error();
      const changes = raw
        .map((row): WomNameChange => {
          if (
            !record(row) ||
            !positive(row.id) ||
            row.playerId !== target.id ||
            !name(row.oldName) ||
            !name(row.newName) ||
            row.status !== 'approved' ||
            !date(row.resolvedAt)
          )
            throw Error();
          return {
            id: row.id,
            playerId: target.id as number,
            oldName: row.oldName,
            newName: row.newName,
            status: 'approved',
            resolvedAt: row.resolvedAt,
          };
        })
        .sort(
          (a, b) =>
            Date.parse(a.resolvedAt) - Date.parse(b.resolvedAt) || a.id - b.id,
        );
      if (new Set(changes.map((c) => c.id)).size !== changes.length)
        throw Error();
      // Ordered reachability handles A -> B -> C while retaining actual approved evidence.
      const paths = new Map<string, WomNameChange[]>([[oldKey, []]]);
      for (const change of changes) {
        const before = normalizePlayerName(change.oldName),
          after = normalizePlayerName(change.newName),
          path = paths.get(before);
        if (path && !path.some((c) => c.id === change.id)) {
          const next = [...path, change];
          paths.set(after, next);
          if (after === newKey) {
            // A recycled old name now owned by another WOM player needs staff review.
            const old = await read(encodeURIComponent(oldKey), signal, request);
            if (old !== null && (!profile(old, oldKey) || old.id !== target.id))
              return { kind: 'staff_required' };
            return {
              kind: 'verified',
              evidence: {
                playerId: target.id,
                username: target.username,
                changes: next,
                verifiedAt: new Date().toISOString(),
              },
            };
          }
        }
      }
    } else if (target !== null) throw Error();
    const old = await read(encodeURIComponent(oldKey), signal, request);
    if (old === null) return { kind: 'staff_required' };
    if (!profile(old, oldKey)) return { kind: 'staff_required' };
    return { kind: 'wom_first' };
  } catch {
    return { kind: 'staff_required' };
  }
}
