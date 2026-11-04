import assert from 'node:assert/strict';
import test from 'node:test';
import { gameModes, isGameMode, parseGameMode } from './game-modes.js';
import { gameModeLabel, gameModeIcon } from './game-mode-display.js';
test('one canonical enum distinguishes explicit Normal, unassigned and all six helmet modes', () => {
  assert.equal(gameModes.length, 7);
  assert.equal(new Set(gameModes).size, 7);
  assert.equal(parseGameMode(null), null);
  assert.equal(gameModeIcon(null), null);
  assert.equal(gameModeIcon('normal'), null);
  const icons = gameModes
    .filter((mode) => mode !== 'normal')
    .map((mode) => {
      assert.equal(parseGameMode(mode), mode);
      assert.ok(gameModeLabel(mode));
      return gameModeIcon(mode);
    });
  assert.equal(new Set(icons).size, 6);
  assert.ok(
    icons.every(
      (icon) => icon?.startsWith('/game-modes/') && icon.endsWith('.webp'),
    ),
  );
  for (const value of [
    undefined,
    'unknown',
    'gim',
    'group_ironman_5',
    'NORMAL',
    '',
    [],
    ['ironman'],
    {},
    false,
  ]) {
    assert.equal(isGameMode(value), false);
    assert.throws(() => parseGameMode(value));
  }
});
