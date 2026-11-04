import * as appText from './text.js';
export const gameModes = [
  'normal',
  'ironman',
  'ultimate_ironman',
  'hardcore_ironman',
  'group_ironman',
  'hardcore_group_ironman',
  'unranked_group_ironman',
] as const;
export type GameMode = (typeof gameModes)[number];
export const isGameMode = (value: unknown): value is GameMode =>
  typeof value === 'string' && gameModes.includes(value as GameMode);
export function parseGameMode(value: unknown): GameMode | null {
  if (value === null || isGameMode(value)) return value;
  throw Error(appText.gameModeInvalid);
}
export interface CollectorGameMode {
  collectorId: string;
  collectorName: string;
  gameMode: GameMode | null;
  revision: string;
}
export interface CollectorGameModeChange {
  collectorId: string;
  expectedRevision: string;
  gameMode: GameMode | null;
}
export interface CollectorGameModeResult extends CollectorGameMode {
  operationId: string;
}
