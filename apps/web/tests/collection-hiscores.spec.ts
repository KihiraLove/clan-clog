import { expect, test, type Page } from './test.ts';
import { mockApi } from './mock-api.ts';
import {
  normalizePlayerName,
  type CollectionHiScoreMetric,
} from '@clog/domain';

async function fixture(page: Page) {
  const base = await mockApi(page, { scenario: 'hardcore', xpSamples: true });
  const make = (count: number, prefix: string) =>
    Array.from({ length: count }, (_, i) => ({
      name:
        i === count - 1
          ? 'KihiraVD'
          : `${prefix} ${String(i + 1).padStart(4, '0')}`,
      score: String(count - i + 100),
    }));
  const state = {
    enabled: true,
    revision: 1,
    fail: false,
    rows: {
      total: make(1925, 'Player'),
      unique: make(3, 'Unique'),
      event: make(51, 'Event'),
      hardcore: make(26, 'Hardcore'),
    } as Record<CollectionHiScoreMetric, { name: string; score: string }[]>,
    hold: undefined as
      { page?: number; player?: string; promise: Promise<void> } | undefined,
    requests: [] as string[],
  };
  await page.route('**/api/v1/collections/hiscores?*', async (route) => {
    const url = new URL(route.request().url()),
      metric = url.searchParams.get('metric') as CollectionHiScoreMetric,
      requested = Number(url.searchParams.get('page')),
      name = url.searchParams.get('player');
    state.requests.push(url.search);
    if (
      state.hold &&
      metric === 'total' &&
      ((state.hold.player !== undefined && name === state.hold.player) ||
        (requested === state.hold.page && !name))
    )
      await state.hold.promise;
    if (state.fail)
      return route.fulfill({ status: 503, json: { error: 'Unavailable' } });
    const rows =
      metric === 'hardcore' && !state.enabled ? [] : state.rows[metric];
    const found = name
      ? rows.findIndex(
          (row) => normalizePlayerName(row.name) === normalizePlayerName(name),
        )
      : -1;
    const pages = Math.max(1, Math.ceil(rows.length / 25)),
      current =
        found >= 0 ? Math.floor(found / 25) + 1 : Math.min(requested, pages);
    const etag =
      '"' +
      [
        state.revision,
        metric,
        current,
        name ? normalizePlayerName(name) : '',
      ].join('-') +
      '"';
    if (route.request().headers()['if-none-match'] === etag)
      return route.fulfill({ status: 304, headers: { ETag: etag } });
    await route
      .fulfill({
        headers: { ETag: etag },
        json: {
          revision: `hiscores-${state.revision}-1-${state.enabled ? 1 : 0}`,
          metric,
          page: current,
          pageSize: 25,
          totalPlayers: rows.length,
          totalPages: pages,
          hardcoreEnabled: state.enabled,
          players: rows
            .slice((current - 1) * 25, current * 25)
            .map((row, i) => ({ ...row, rank: (current - 1) * 25 + i + 1 })),
          match:
            found < 0 ? null : { name: rows[found]!.name, rank: found + 1 },
        },
      })
      .catch(() => {});
  });
  return { ...base, state };
}
const rows = (page: Page) => page.locator('.hiscores-table tbody tr');
const category = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true });
async function ready(page: Page) {
  await expect(rows(page)).toHaveCount(25);
}

test('three public links prepare a dedicated page with correct title, active link and remembered collection selection', async ({
  page,
}) => {
  await fixture(page);
  await page.goto('/?page=duke-sucellus');
  const nav = page.getByRole('navigation', {
    name: 'Public pages',
    exact: true,
  });
  await expect(nav.getByRole('link')).toHaveText([
    'Collection log',
    'Collection HiScores',
    'Xp tracker',
  ]);
  await nav
    .getByRole('link', { name: 'Collection HiScores', exact: true })
    .click();
  await ready(page);
  await expect(page).toHaveURL(/\/collections\/hiscores$/);
  await expect(page).toHaveTitle(/Collection HiScores/);
  await expect(nav.locator('[aria-current="page"]')).toHaveText(
    'Collection HiScores',
  );
  await nav.getByRole('link', { name: 'Collection log', exact: true }).click();
  await expect(page.locator('.page-heading h3')).toHaveText('Duke Sucellus');
  await page.goBack();
  await ready(page);
  await page.goForward();
  await expect(page.locator('.page-heading h3')).toHaveText('Duke Sucellus');
});
test('four rankings and 25-player pages have stable ranks and disabled boundaries', async ({
  page,
}) => {
  await fixture(page);
  await page.goto('/collections/hiscores');
  await ready(page);
  await expect(
    page
      .getByRole('group', { name: 'Collection rankings' })
      .getByRole('button'),
  ).toHaveText([
    'Total collections',
    'Unique collections',
    'Event collections',
    'Hardcore worlds',
  ]);
  await expect(category(page, 'Total collections')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(
    page.getByRole('button', { name: 'Previous 25 players' }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Next 25 players' }).click();
  await expect(rows(page).first().locator('td').first()).toHaveText('26');
  await expect(rows(page).last().locator('td').first()).toHaveText('50');
  await category(page, 'Event collections').click();
  await ready(page);
  await expect(rows(page).first()).toContainText('Event 0001');
  await page.getByRole('button', { name: 'Next 25 players' }).click();
  await expect(rows(page).first()).toContainText('Event 0026');
  await page.getByRole('button', { name: 'Next 25 players' }).click();
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first().locator('td').first()).toHaveText('51');
  await expect(
    page.getByRole('button', { name: 'Next 25 players' }),
  ).toBeDisabled();
  await category(page, 'Hardcore worlds').click();
  await ready(page);
  await expect(rows(page).first()).toContainText('Hardcore 0001');
  await page.getByRole('button', { name: 'Next 25 players' }).click();
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first().locator('td').first()).toHaveText('26');
  await page.getByLabel('Player name').fill('KihiraVD');
  await category(page, 'Search').click();
  await expect(page).toHaveURL(/metric=hardcore&page=2.*player=KihiraVD/);
  await expect(page.locator('.hiscores-row--matched td').first()).toHaveText(
    '26',
  );
});
test('keyboard users can change category, page and search with an announced match', async ({
  page,
}) => {
  await fixture(page);
  await page.goto('/collections/hiscores');
  await ready(page);
  await category(page, 'Total collections').focus();
  await page.keyboard.press('Tab');
  await expect(category(page, 'Unique collections')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(rows(page)).toHaveCount(3);
  await expect(category(page, 'Unique collections')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await category(page, 'Event collections').focus();
  await page.keyboard.press('Enter');
  await ready(page);
  const next = page.getByRole('button', { name: 'Next 25 players' });
  await next.focus();
  await page.keyboard.press('Enter');
  await expect(rows(page).first().locator('td').first()).toHaveText('26');
  const search = page.getByRole('search', { name: 'Collection HiScores' });
  const input = search.getByRole('textbox', { name: 'Player name' });
  await input.focus();
  await input.fill('KihiraVD');
  await page.keyboard.press('Tab');
  await expect(search.getByRole('button', { name: 'Search' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(rows(page)).toHaveCount(1);
  await expect(page.locator('.hiscores-row--matched')).toHaveAttribute(
    'aria-current',
    'true',
  );
  await expect(search.getByRole('status')).toHaveText(
    'KihiraVD found at rank 51.',
  );
  await expect(page.getByRole('columnheader')).toHaveText([
    'Rank',
    'Name',
    'Score',
  ]);
});
test('a late search cannot replace a newer searched player', async ({
  page,
}) => {
  const { state } = await fixture(page);
  await page.goto('/collections/hiscores');
  await ready(page);
  let release!: () => void;
  state.hold = {
    player: 'Player 0026',
    promise: new Promise((resolve) => {
      release = resolve;
    }),
  };
  await page.getByLabel('Player name').fill('Player 0026');
  await category(page, 'Search').click();
  await expect
    .poll(() =>
      state.requests.some((query) => query.includes('player=Player+0026')),
    )
    .toBe(true);
  await page.getByLabel('Player name').fill('KihiraVD');
  await category(page, 'Search').click();
  await expect(page.locator('.hiscores-row--matched')).toContainText(
    'KihiraVD',
  );
  release();
  await expect(page).toHaveURL(/page=77.*player=KihiraVD/);
  await expect(page.locator('.hiscores-row--matched')).toContainText(
    'KihiraVD',
  );
});
test('invalid direct-link state recovers through a normal category selection', async ({
  page,
}) => {
  await fixture(page);
  await page.goto('/collections/hiscores?metric=unknown&page=0');
  await expect(page.getByRole('alert')).toHaveText(
    'Choose a supported ranking and a valid page.',
  );
  await ready(page);
  await category(page, 'Total collections').click();
  await expect(page).toHaveURL(/metric=total&page=1$/);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await ready(page);
});
test('search jumps to page 77, highlights the final player and preserves input and URL across history/reload', async ({
  page,
}) => {
  await fixture(page);
  await page.goto('/collections/hiscores');
  await ready(page);
  const name = page.getByLabel('Player name', { exact: true });
  await name.fill('kIhIrAvD');
  await name.press('Enter');
  await expect(page).toHaveURL(/page=77.*player=kIhIrAvD/);
  await expect(rows(page)).toHaveCount(25);
  await expect(rows(page).last().locator('td').first()).toHaveText('1,925');
  const match = page.locator('.hiscores-row--matched');
  await expect(match).toHaveCount(1);
  await expect(match).toContainText('KihiraVD');
  await expect(match).toHaveCSS('background-color', 'rgb(184, 217, 148)');
  await expect(page.getByRole('status')).toContainText(
    'KihiraVD found at rank 1,925.',
  );
  await expect(name).toHaveValue('kIhIrAvD');
  await page.screenshot({
    path: test.info().outputPath('hiscores-search-page77.png'),
    fullPage: true,
  });
  await page.reload();
  await expect(match).toContainText('KihiraVD');
  await category(page, 'Unique collections').click();
  await expect(rows(page)).toHaveCount(3);
  await expect(match).toHaveCount(0);
  await expect(page).toHaveURL(/metric=unique&page=1$/);
  await page.goBack();
  await expect(match).toContainText('KihiraVD');
  await page.goForward();
  await expect(rows(page)).toHaveCount(3);
});
test('exact normalized name search covers page starts/ends, no rank and invalid input without an unrelated highlight', async ({
  page,
}) => {
  await fixture(page);
  await page.goto('/collections/hiscores');
  await ready(page);
  const name = page.getByLabel('Player name', { exact: true });
  for (const [value, rank] of [
    ['PLAYER_0026', '26'],
    ['Player 0050', '50'],
  ]) {
    await name.fill(value!);
    await category(page, 'Search').click();
    await expect(page.locator('.hiscores-row--matched td').first()).toHaveText(
      rank!,
    );
    await ready(page);
  }
  await name.fill('Missing');
  await category(page, 'Search').click();
  await expect(page.getByRole('status')).toHaveText(
    'That player is not ranked in this category.',
  );
  await expect(page.locator('.hiscores-row--matched')).toHaveCount(0);
  await expect(rows(page).first().locator('td').first()).toHaveText('26');
  await name.fill('Player 0026');
  await category(page, 'Search').click();
  await expect(page.locator('.hiscores-row--matched')).toHaveCount(1);
  await name.fill('___');
  await category(page, 'Search').click();
  await expect(page.getByRole('alert')).toContainText(
    'Enter a valid player name',
  );
  await expect(page.locator('.hiscores-row--matched')).toHaveCount(0);
  await ready(page);
});
test('stale page responses cannot replace a newer category and visible refresh follows/clamps a searched player', async ({
  page,
}) => {
  const { state } = await fixture(page);
  await page.goto('/collections/hiscores');
  await ready(page);
  let release!: () => void;
  state.hold = {
    page: 2,
    promise: new Promise((resolve) => {
      release = resolve;
    }),
  };
  await page.getByRole('button', { name: 'Next 25 players' }).click();
  await expect
    .poll(() => state.requests.some((query) => query.includes('page=2')))
    .toBe(true);
  await category(page, 'Event collections').click();
  await ready(page);
  await expect(rows(page).first()).toContainText('Event 0001');
  release();
  await expect(rows(page).first()).toContainText('Event 0001');
  await category(page, 'Total collections').click();
  await ready(page);
  await page.getByLabel('Player name').fill('KihiraVD');
  await category(page, 'Search').click();
  await expect(page).toHaveURL(/page=77/);
  await page.getByLabel('Player name').fill('Draft new search');
  state.rows.total = [{ name: 'KihiraVD', score: '42' }];
  state.revision++;
  await page.evaluate(() =>
    document.dispatchEvent(new Event('visibilitychange')),
  );
  await expect(rows(page)).toHaveCount(1);
  await expect(page).toHaveURL(/page=1.*player=KihiraVD/);
  await expect(page.locator('.hiscores-row--matched td').first()).toHaveText(
    '1',
  );
  await expect(page.getByLabel('Player name')).toHaveValue('Draft new search');
});
test('Hardcore visibility applies to direct list/search, and empty/failed/out-of-range reads recover', async ({
  page,
}) => {
  const { state } = await fixture(page);
  state.enabled = false;
  await page.goto(
    '/collections/hiscores?metric=hardcore&page=77&player=KihiraVD',
  );
  await expect(page.getByRole('status')).toHaveText(
    'Hardcore-world HiScores are currently disabled.',
  );
  await expect(rows(page)).toHaveCount(0);
  await expect(category(page, 'Hardcore worlds')).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Next 25 players' }),
  ).toBeDisabled();
  await category(page, 'Total collections').click();
  await ready(page);
  state.fail = true;
  await page.evaluate(() =>
    document.dispatchEvent(new Event('visibilitychange')),
  );
  await expect(page.getByRole('alert')).toContainText('could not be loaded');
  await ready(page);
  state.fail = false;
  await category(page, 'Retry HiScores').click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  state.rows.event = [];
  state.revision++;
  await category(page, 'Event collections').click();
  await expect(
    page.getByText('No players are ranked in this category yet.', {
      exact: true,
    }),
  ).toBeVisible();
  await page.goto('/collections/hiscores?metric=total&page=999999999');
  await expect(page).toHaveURL(/page=77/);
  await ready(page);
});
for (const width of [1440, 740, 320])
  test(
    'parchment, centered columns and search fit at ' + width,
    async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      const { state } = await fixture(page);
      state.rows.unique = [
        {
          name: 'LongCollectorNameWithoutSpaces'.repeat(2),
          score: '9007199254740993',
        },
      ];
      await page.goto('/collections/hiscores?metric=total&page=2');
      await ready(page);
      await page.evaluate(() => document.fonts.ready);
      const scroll = (await page.locator('.hiscores-scroll').boundingBox())!,
        search = (await page.locator('.hiscores-search').boundingBox())!;
      if (width > 740)
        expect(search.x).toBeGreaterThan(scroll.x + scroll.width);
      else expect(search.y + search.height).toBeLessThan(scroll.y);
      for (const heading of await page.locator('.hiscores-table th').all())
        await expect(heading).toHaveCSS('text-align', 'center');
      const arrow = (await page
        .getByRole('button', { name: 'Next 25 players' })
        .boundingBox())!;
      expect(arrow.x + arrow.width).toBeLessThanOrEqual(width);
      expect(arrow.x).toBeGreaterThan(scroll.x + scroll.width - 40);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: test.info().outputPath('hiscores-' + width + '.png'),
        fullPage: true,
      });
      await category(page, 'Unique collections').click();
      await expect(rows(page)).toHaveCount(1);
      await expect(rows(page).locator('td').last()).toHaveText(
        '9,007,199,254,740,993',
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    },
  );
test('a failed deferred ranking module leaves the current public page usable', async ({
  page,
}) => {
  await fixture(page);
  await page.goto('/');
  await expect(page.locator('.game-window')).toBeVisible();
  await page.route('**/src/CollectionHiScoresPage.tsx*', (route) =>
    route.abort(),
  );
  await page
    .getByRole('link', { name: 'Collection HiScores', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Reload page', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.game-window')).toBeVisible();
});
