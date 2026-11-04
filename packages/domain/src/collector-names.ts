import * as appText from './text.js';
import { normalizePlayerName } from './runelite-rules.js';
export interface CollectorIdentity {
  id: string;
  name: string;
  version: string;
  historyVersion: string;
}
export type CollectorCounts = Record<
  'pending' | 'approved' | 'rejected' | 'revoked',
  number
>;
export interface CollectorNamePreview {
  token: string;
  operation: 'rename' | 'merge' | 'noop';
  source: CollectorIdentity;
  target: CollectorIdentity | null;
  newName: string;
  counts: CollectorCounts;
}
export interface CollectorNameResult {
  operationId: string;
  operation: 'rename' | 'merge';
  sourceId: string;
  targetId: string;
  originalName: string;
  newName: string;
  counts: CollectorCounts;
}
export function collectorDisplayName(value: unknown): string {
  if (typeof value !== 'string') throw Error(appText.collectorNameInvalid);
  const name = value.trim().replace(/\s+/gu, ' ');
  if (
    !normalizePlayerName(name) ||
    name.length > 80 ||
    Array.from(name).some(
      (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
    )
  )
    throw Error(appText.collectorNameInvalid);
  return name;
}
