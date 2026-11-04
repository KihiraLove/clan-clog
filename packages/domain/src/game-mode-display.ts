import * as appText from './text.js';
import type { GameMode } from './game-modes.js';
export const gameModeLabels: Record<GameMode, string> = {
  normal: appText.gameModeNormal,
  ironman: appText.gameModeIronman,
  ultimate_ironman: appText.gameModeUltimate,
  hardcore_ironman: appText.gameModeHardcore,
  group_ironman: appText.gameModeGroup,
  hardcore_group_ironman: appText.gameModeHardcoreGroup,
  unranked_group_ironman: appText.gameModeUnrankedGroup,
};
export const gameModeLabel = (mode: GameMode | null) =>
  mode === null ? appText.gameModeUnassigned : gameModeLabels[mode];
export const gameModeIcon = (mode: GameMode | null) =>
  mode === null || mode === 'normal' ? null : '/game-modes/' + mode + '.webp';
