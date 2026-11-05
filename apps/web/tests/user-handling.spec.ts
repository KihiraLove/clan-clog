import { expect, test, type Page } from './test.ts';
import { mockApi } from './mock-api.ts';
import type { GameMode } from '@clog/domain';
const id = '00000000-0000-4000-8000-000000000151';
async function fixture(page: Page) {
  await mockApi(page);
  const state = {
    mode: null as GameMode | null,
    version: 1,
    failure: '' as '' | 'uncertain' | 'conflict' | 'expired',
    writes: [] as { fields: unknown; key: string }[],
    receipts: new Map<string, unknown>(),
  };
  const profile = () => ({
    collectorId: id,
    collectorName: 'Collector',
    gameMode: state.mode,
    revision:
      'collector-mode-' + id + '-' + state.version + '-' + state.version,
  });
  await page.route('**/api/v1/admin/collectors?*', (route) =>
    route.fulfill({
      json: {
        collectors: [
          {
            id,
            name: 'Collector',
            version: '1',
            historyVersion: '1',
            gameMode: state.mode,
          },
        ],
        hasMore: false,
      },
    }),
  );
  await page.route('**/api/v1/admin/collectors/*/game-mode', (route) => {
    if (state.failure === 'expired')
      return route.fulfill({ status: 401, json: {} });
    if (route.request().method() === 'GET')
      return route.fulfill({ json: profile() });
    const fields = route.request().postDataJSON(),
      key = route.request().headers()['idempotency-key']!;
    state.writes.push({ fields, key });
    expect(route.request().headers()['x-csrf-token']).toBeTruthy();
    const saved = state.receipts.get(key);
    if (saved) return route.fulfill({ json: saved });
    if (state.failure === 'conflict') {
      state.failure = '';
      state.version++;
      state.mode = 'ironman';
      return route.fulfill({
        status: 409,
        json: {
          error:
            'Collector identity or game mode changed. Reload before saving.',
        },
      });
    }
    state.version++;
    state.mode = fields.gameMode;
    const result = { ...profile(), operationId: crypto.randomUUID() };
    state.receipts.set(key, result);
    if (state.failure === 'uncertain') {
      state.failure = '';
      return route.abort();
    }
    return route.fulfill({ json: result });
  });
  await page.goto('/admin/submissions');
  const handling = page.locator('.name-changes-panel');
  const search = handling.getByLabel(
    'Search collectors for game mode changes',
    { exact: true },
  );
  await search.fill('Collector');
  const people = handling.getByRole('combobox', {
    name: 'Collector to change game mode',
    exact: true,
  });
  await expect(people.locator('option[value="' + id + '"]')).toHaveCount(1);
  await people.selectOption(id);
  const panel = handling.locator('.collector-mode-editor');
  await expect(panel.getByRole('combobox')).toBeEnabled();
  return { state, handling, search, people, panel };
}
test('User Handling groups matching subtitles and changes a collector mode without opening a submission', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 850 });
  const { state, handling, search, panel } = await fixture(page);
  await expect(handling.getByRole('heading', { level: 2 })).toHaveText(
    'User Handling',
  );
  await expect(handling.getByRole('heading', { level: 3 })).toHaveText([
    'Name Changes',
    'Game Mode Changes',
  ]);
  const regular = page.getByRole('heading', {
    name: 'Filter out regular duplicates',
    exact: true,
  });
  for (const heading of await handling.getByRole('heading', { level: 3 }).all())
    expect(await heading.evaluate((node) => getComputedStyle(node).font)).toBe(
      await regular.evaluate((node) => getComputedStyle(node).font),
    );
  const mode = panel.getByRole('combobox');
  await mode.selectOption('ironman');
  await expect(search).toBeDisabled();
  await panel.getByRole('button', { name: 'Discard', exact: true }).click();
  await expect(mode).toHaveValue('');
  expect(state.writes).toHaveLength(0);
  await mode.selectOption('hardcore_group_ironman');
  await panel
    .getByRole('button', { name: 'Save game mode', exact: true })
    .click();
  await expect(panel.getByRole('status')).toHaveText('Game mode saved.');
  expect(state.mode).toBe('hardcore_group_ironman');
  await expect(search).toBeEnabled();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await handling
    .getByRole('heading', { name: 'Game Mode Changes', exact: true })
    .click();
  await handling.screenshot({
    path: test.info().outputPath('user-handling-320.png'),
  });
});
test('uncertain collector mode saves freeze their request and recover with the same key', async ({
  page,
}) => {
  const { state, panel, people } = await fixture(page);
  state.failure = 'uncertain';
  await panel.getByRole('combobox').selectOption('ultimate_ironman');
  await panel
    .getByRole('button', { name: 'Save game mode', exact: true })
    .click();
  await expect(panel.getByRole('alert')).toContainText(
    'Retry the same game mode change',
  );
  await expect(people).toBeDisabled();
  await expect(panel.getByRole('combobox')).toBeDisabled();
  await panel
    .getByRole('button', { name: 'Retry game mode save', exact: true })
    .click();
  await expect(panel.getByRole('status')).toHaveText('Game mode saved.');
  expect(state.writes).toHaveLength(2);
  expect(state.writes[0]).toEqual(state.writes[1]);
});
test('stale collector modes require a reload and an explicit new choice', async ({
  page,
}) => {
  const { state, panel } = await fixture(page);
  state.failure = 'conflict';
  await panel.getByRole('combobox').selectOption('normal');
  await panel
    .getByRole('button', { name: 'Save game mode', exact: true })
    .click();
  await expect(panel.getByRole('alert')).toContainText('Reload before saving');
  await expect(
    panel.getByRole('button', { name: 'Save game mode', exact: true }),
  ).toBeDisabled();
  await panel
    .getByRole('button', { name: 'Reload game mode', exact: true })
    .click();
  await expect(panel.getByRole('combobox')).toHaveValue('ironman');
  expect(state.writes).toHaveLength(1);
  await panel.getByRole('combobox').selectOption('normal');
  await panel
    .getByRole('button', { name: 'Save game mode', exact: true })
    .click();
  await expect(panel.getByRole('status')).toHaveText('Game mode saved.');
});
