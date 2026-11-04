import { test, expect, type Page } from './test.ts';
import { mockApi } from './mock-api.ts';
import { gameModes, gameModeLabel, type GameMode } from '@clog/domain';
const collectorId = '00000000-0000-4000-8000-000000000133';
async function reviewFixture(page: Page) {
  const base = await mockApi(page);
  const state = {
    mode: null as GameMode | null,
    version: 1,
    failure: '' as '' | 'conflict' | 'uncertain' | 'expired',
    writes: [] as {
      fields: {
        collectorId: string;
        expectedRevision: string;
        gameMode: GameMode | null;
      };
      key: string;
    }[],
    receipts: new Map<string, unknown>(),
  };
  const profile = () => ({
    collectorId,
    collectorName: 'Collector',
    gameMode: state.mode,
    revision:
      'collector-mode-' +
      collectorId +
      '-' +
      state.version +
      '-' +
      state.version,
  });
  await page.route('**/api/v1/admin/submissions/*/game-mode', (route) => {
    if (state.failure === 'expired')
      return route.fulfill({ status: 401, json: {} });
    if (route.request().method() === 'GET')
      return route.fulfill({ json: profile() });
    const fields = route
        .request()
        .postDataJSON() as (typeof state.writes)[number]['fields'],
      key = route.request().headers()['idempotency-key']!;
    state.writes.push({ fields, key });
    expect(route.request().headers()['x-csrf-token']).toBeTruthy();
    const prior = state.receipts.get(key);
    if (prior) return route.fulfill({ json: prior });
    if (state.failure === 'conflict') {
      state.failure = '';
      state.mode = 'ironman';
      state.version++;
      return route.fulfill({
        status: 409,
        json: {
          error:
            'Collector identity or game mode changed. Reload before saving.',
        },
      });
    }
    state.mode = fields.gameMode;
    state.version++;
    const result = { ...profile(), operationId: crypto.randomUUID() };
    state.receipts.set(key, result);
    if (state.failure === 'uncertain') {
      state.failure = '';
      return route.abort();
    }
    return route.fulfill({ json: result });
  });
  await page.goto('/admin/submissions');
  await page
    .getByRole('button', { name: /^Review / })
    .first()
    .click();
  return { ...base, state, panel: page.locator('.collector-mode-editor') };
}
test('mode save/discard is separate from proof, claim corrections and decisions, with every canonical choice', async ({
  page,
}, info) => {
  const { state, panel } = await reviewFixture(page);
  const choice = panel.getByRole('combobox', {
    name: 'Game mode',
    exact: true,
  });
  await expect(choice).toHaveValue('');
  await expect(choice.getByRole('option')).toHaveCount(8);
  for (const mode of gameModes)
    await expect(
      choice.getByRole('option', { name: gameModeLabel(mode), exact: true }),
    ).toHaveCount(1);
  const row = page.locator('.submission-editor'),
    item = row.getByLabel('Collector name', { exact: true });
  const before = await item.inputValue();
  await choice.selectOption('ultimate_ironman');
  await panel.getByRole('button', { name: 'Discard', exact: true }).click();
  await expect(choice).toHaveValue('');
  expect(state.writes).toHaveLength(0);
  await choice.selectOption('hardcore_group_ironman');
  await panel
    .getByRole('button', { name: 'Save game mode', exact: true })
    .click();
  await expect(panel.getByRole('status')).toHaveText('Game mode saved.');
  await expect(choice).toHaveValue('hardcore_group_ironman');
  expect(state.writes).toHaveLength(1);
  await expect(item).toHaveValue(before);
  await expect(row.getByLabel(/^I checked the screenshot/)).not.toBeChecked();
  await page.setViewportSize({ width: 320, height: 820 });
  await panel.scrollIntoViewIfNeeded();
  const box = await choice.boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  await panel.screenshot({
    path: info.outputPath('game-mode-review-mobile.png'),
  });
});
test('moderators with Submissions access can save a mode independently of administrator tools', async ({
  page,
}) => {
  const { admin, state, panel } = await reviewFixture(page),
    session = await admin.session(new AbortController().signal);
  await page.route('**/api/v1/auth/session', (route) =>
    route.fulfill({
      json: {
        authenticated: true,
        ...session,
        role: 'moderator',
        moderatorPages: ['submissions'],
      },
    }),
  );
  await page.reload();
  await page
    .getByRole('button', { name: /^Review / })
    .first()
    .click();
  const choice = panel.getByRole('combobox', {
    name: 'Game mode',
    exact: true,
  });
  await expect(choice).toBeEnabled();
  await choice.selectOption('ironman');
  await panel
    .getByRole('button', { name: 'Save game mode', exact: true })
    .click();
  await expect(panel.getByRole('status')).toHaveText('Game mode saved.');
  expect(state.writes).toHaveLength(1);
});
test('stale mode saves retain the draft until reload; expired access removes the review', async ({
  page,
}) => {
  const { state, panel } = await reviewFixture(page),
    choice = panel.getByRole('combobox', { name: 'Game mode', exact: true });
  await expect(choice).toBeEnabled();
  state.failure = 'conflict';
  await choice.selectOption('normal');
  await panel
    .getByRole('button', { name: 'Save game mode', exact: true })
    .click();
  await expect(panel).toContainText(
    'Collector identity or game mode changed. Reload before saving.',
  );
  await expect(choice).toHaveValue('normal');
  await panel
    .getByRole('button', { name: 'Reload game mode', exact: true })
    .click();
  await expect(choice).toHaveValue('ironman');
  await expect(panel.getByRole('alert')).toHaveCount(0);
  state.failure = 'expired';
  await page.evaluate(() =>
    document.dispatchEvent(new Event('visibilitychange')),
  );
  await expect(
    page.getByRole('dialog', { name: 'Submission review' }),
  ).toHaveCount(0);
});
test('uncertain committed save survives dismissal and reuses its exact key and profile revision', async ({
  page,
}) => {
  const { state, panel } = await reviewFixture(page),
    choice = panel.getByRole('combobox', { name: 'Game mode', exact: true });
  await expect(choice).toBeEnabled();
  state.failure = 'uncertain';
  await choice.selectOption('group_ironman');
  await panel
    .getByRole('button', { name: 'Save game mode', exact: true })
    .click();
  await expect(panel).toContainText(
    'The result could not be confirmed. Retry the same game mode change.',
  );
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Close review', exact: true }).click();
  await page
    .getByRole('button', { name: /^Review / })
    .first()
    .click();
  await panel
    .getByRole('button', { name: 'Retry game mode save', exact: true })
    .click();
  await expect(panel.getByRole('status')).toHaveText('Game mode saved.');
  expect(state.writes).toHaveLength(2);
  expect(state.writes[1]).toEqual(state.writes[0]);
});
test('all six local helmets align with current Event/Regular names, group once, and refresh in an open mobile menu without changing totals', async ({
  page,
}, info) => {
  await mockApi(page);
  let mode: 'separate' | 'merge' = 'separate',
    revision = 1,
    current: 'ironman' | 'unranked_group_ironman' = 'ironman';
  await page.route('**/api/v1/catalog', (route) =>
    route.fulfill({
      json: {
        revision: 'modes',
        items: [{ id: 1, name: 'Trophy', iconPath: '/catalog/default.webp' }],
        pages: [{ id: 'a', name: 'A', category: 'bosses', itemIds: [1] }],
      },
    }),
  );
  await page.route('**/api/v1/collections', (route) => {
    const credits = gameModes.map((gameMode, index) => ({
      submissionId: 'mode-' + index,
      itemId: 1,
      collectorName:
        gameMode === 'ironman' ? 'Repeated Collector' : gameMode + ' collector',
      gameMode: gameMode === 'ironman' ? current : gameMode,
      collectedOn: '2026-10-01',
      hardcore: false,
      collectionType: 'regular',
    }));
    return route.fulfill({
      json: {
        revision: 'modes-' + revision,
        repeatCollectorPolicy: mode,
        credits: [
          ...credits,
          { ...credits[1], submissionId: 'repeat', collectedOn: '2026-10-02' },
          {
            ...credits[1],
            submissionId: 'event',
            collectionType: 'event',
            eventPageId: 'a',
          },
          {
            ...credits[0],
            submissionId: 'unknown',
            collectorName: 'Unknown collector',
            gameMode: null,
          },
        ],
      },
    });
  });
  await page.goto('/');
  const slot = page.getByRole('button', { name: /^Trophy: collected/ }),
    menu = page.getByRole('tooltip');
  await slot.click();
  await expect(menu.getByRole('img')).toHaveCount(8);
  for (const gameMode of gameModes.filter((m) => m !== 'normal'))
    await expect(
      menu
        .getByRole('img', { name: gameModeLabel(gameMode), exact: true })
        .first(),
    ).toHaveAttribute('src', '/game-modes/' + gameMode + '.webp');
  await expect(
    menu.locator('p').filter({ hasText: 'normal collector' }).locator('img'),
  ).toHaveCount(0);
  await expect(
    menu.locator('p').filter({ hasText: 'Unknown collector' }).locator('img'),
  ).toHaveCount(0);
  const total = await slot.locator('.item-obtain-count').textContent();
  mode = 'merge';
  revision++;
  await page.evaluate(() =>
    document.dispatchEvent(new Event('visibilitychange')),
  );
  await expect(menu.getByRole('img')).toHaveCount(7);
  await expect(menu).toContainText(
    'Collected 2x by Repeated Collector first on 01/10/26',
  );
  current = 'unranked_group_ironman';
  revision++;
  await page.evaluate(() =>
    document.dispatchEvent(new Event('visibilitychange')),
  );
  await expect(
    menu.getByRole('img', {
      name: 'Unranked Group Ironman (UGIM)',
      exact: true,
    }),
  ).toHaveCount(3);
  await expect(slot.locator('.item-obtain-count')).toHaveText(total!);
  await page.setViewportSize({ width: 320, height: 820 });
  const box = await menu.boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(312);
  await menu.screenshot({ path: info.outputPath('helmet-menu-mobile.png') });
});
