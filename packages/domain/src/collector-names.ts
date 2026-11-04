import * as appText from './text.js';
import { normalizePlayerName } from './runelite-rules.js';
export interface CollectorIdentity {
  gameMode?: import('./game-modes.js').GameMode | null;
  id: string;
  name: string;
  version: string;
  historyVersion: string;
}
export interface UserNameChangeSettings {
  revision: string;
  enabled: boolean;
}
export interface PublicNameChangeInput {
  oldName: string;
  newName: string;
}
export interface PublicNameChangeResult {
  status: 'changed';
  operationId: string;
  oldName: string;
  newName: string;
}
export function publicNameChangeInput(
  value: PublicNameChangeInput,
): PublicNameChangeInput {
  const oldName = collectorDisplayName(value.oldName),
    newName = collectorDisplayName(value.newName);
  if (
    [oldName, newName].some(
      (name) => name.length > 12 || !/^[a-zA-Z0-9 _-]+$/u.test(name),
    ) ||
    oldName === newName
  )
    throw Error(appText.collectorNameInvalid);
  return { oldName, newName };
}
export type CollectorCounts = Record<
  'pending' | 'approved' | 'rejected' | 'revoked',
  number
>;
export interface CollectorNamePreview {
  modeResolutionRequired?: boolean;
  gameMode?: import('./game-modes.js').GameMode | null;
  token: string;
  operation: 'rename' | 'merge' | 'noop';
  source: CollectorIdentity;
  target: CollectorIdentity | null;
  newName: string;
  counts: CollectorCounts;
}
export interface CollectorNameResult {
  gameMode?: import('./game-modes.js').GameMode | null;
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
