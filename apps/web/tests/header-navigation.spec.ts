import { openSiteMenu, expect, test, type Locator } from './test.ts';
import { mockApi } from './mock-api.ts';

async function geometry(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return Object.fromEntries(
    Object.entries(box!).map(([key, value]) => [
      key,
      Math.round(value * 100) / 100,
    ]),
  );
}

for (const width of [1440, 740, 580, 390, 320]) {
  test(
    'Menu aligns with the visible log and preserves access across views at ' +
      width,
    async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const { admin } = await mockApi(page, { scenario: 'hardcore' });
      const signal = new AbortController().signal;
      let privateReads = 0;
      page.on('request', (request) => {
        const path = new URL(request.url()).pathname;
        if (
          path.startsWith('/api/v1/admin/') ||
          path === '/api/v1/auth/session'
        )
          privateReads++;
      });
      await page.goto('/');
      const trigger = page.getByRole('button', { name: 'Menu', exact: true });
      await expect(trigger).toBeEnabled();
      await page.evaluate(() => document.fonts.ready);
      const aligned = async () => {
        await expect(trigger).toBeEnabled();
        await expect(page.locator('.game-window')).toBeVisible();
        await expect
          .poll(async () =>
            page.evaluate(() => {
              const game = document
                  .querySelector('.game-window')!
                  .getBoundingClientRect(),
                viewport = document
                  .querySelector('.log-viewport')!
                  .getBoundingClientRect(),
                button = document
                  .querySelector('.site-menu > button')!
                  .getBoundingClientRect();
              return Math.abs(
                button.right - Math.min(game.right, viewport.right),
              );
            }),
          )
          .toBeLessThan(1);
      };
      await aligned();
      expect(privateReads).toBe(0);
      await expect(
        page.getByRole('button', { name: 'How to submit', exact: true }),
      ).toHaveCount(0);
      const original = await geometry(trigger);
      await trigger.focus();
      await expect(trigger).toHaveCSS('outline-width', '2px');
      await trigger.press('Enter');
      const menu = page.getByRole('group', {
        name: 'Menu options',
        exact: true,
      });
      await expect(menu).toBeVisible();
      await page.keyboard.press('Tab');
      await expect(
        menu.getByRole('link', { name: 'Admin panel', exact: true }),
      ).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(trigger).toBeFocused();
      await expect(menu).toBeHidden();
      await openSiteMenu(page);
      await page.locator('.log-help').click();
      await expect(menu).toBeHidden();
      const settings = await admin.settings(signal);
      await admin.saveSettings(true, settings.revision, 'test-admin', signal);
      await page.reload();
      const skull = page.getByRole('button', {
        name: 'Hardcore worlds',
        exact: true,
      });
      await expect(skull).toBeVisible();
      await aligned();
      expect(await geometry(trigger)).toEqual(original);
      await skull.click();
      await aligned();
      expect(await geometry(trigger)).toEqual(original);
      if (width < 1050) {
        await page.locator('.log-viewport').evaluate((node) => {
          node.scrollLeft = node.scrollWidth;
        });
        await aligned();
        await page.locator('.log-viewport').evaluate((node) => {
          node.scrollLeft = 0;
        });
        await aligned();
      }
      await openSiteMenu(page);
      const options = await menu.boundingBox(),
        button = await trigger.boundingBox();
      expect(options!.x + options!.width).toBeCloseTo(
        button!.x + button!.width,
        1,
      );
      await page.screenshot({
        path: test.info().outputPath('menu-' + width + '.png'),
      });
      await menu
        .getByRole('link', { name: 'Admin panel', exact: true })
        .click();
      const home = page.getByRole('link', { name: 'Main site', exact: true });
      await expect(home).toHaveAttribute('href', '/?hardcore=1');
      await home.click();
      await expect(skull).toHaveAttribute('aria-pressed', 'true');
      await aligned();
      await skull.click();
      await page.getByRole('link', { name: 'Xp tracker', exact: true }).click();
      await openSiteMenu(page);
      await menu
        .getByRole('button', { name: 'How to submit', exact: true })
        .click();
      await expect(
        page.getByRole('dialog', { name: 'How to submit', exact: true }),
      ).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(trigger).toBeFocused();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    },
  );
}

test('Main site preserves a schedule draft when leaving is cancelled', async ({
  page,
}) => {
  await mockApi(page);
  await page.goto('/admin/schedules');
  const draft = page.getByLabel('Schedule name', { exact: true });
  await draft.fill('Unsaved schedule');
  page.once('dialog', async (d) => {
    expect(d.message()).toContain('Discard unsaved changes');
    await d.dismiss();
  });
  await page.getByRole('link', { name: 'Main site', exact: true }).click();
  await expect(draft).toHaveValue('Unsaved schedule');
  page.once('dialog', async (d) => {
    await d.accept();
  });
  await page.getByRole('link', { name: 'Main site', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
});
test('Main site waits for a pending scheduling save without cancelling the write', async ({
  page,
}) => {
  await mockApi(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let writes = 0;
  await page.route('**/api/v1/admin/schedules/settings', async (route) => {
    writes++;
    await held;
    await route.fallback();
  });
  try {
    await page.goto('/admin/schedules');
    await page
      .getByRole('switch', { name: 'Collection log scheduling' })
      .click();
    await expect.poll(() => writes).toBe(1);
    await page.getByRole('link', { name: 'Main site', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText(
      'Wait for the current staff operation',
    );
    release();
    await expect(page.getByRole('status')).toContainText('Scheduling enabled.');
    await page.getByRole('link', { name: 'Main site', exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    expect(writes).toBe(1);
  } finally {
    release();
  }
});

test('public admin entry remains available when public settings cannot load', async ({
  page,
}) => {
  await mockApi(page);
  await page.route('**/api/v1/settings', (route) =>
    route.fulfill({ status: 503 }),
  );
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Hardcore worlds', exact: true }),
  ).toHaveCount(0);
  await openSiteMenu(page);
  await page.getByRole('link', { name: 'Admin panel', exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole('link', { name: 'Main site', exact: true }),
  ).toBeVisible();
});
test('failed deferred Menu leaves the log and admin entry usable', async ({
  page,
}) => {
  await mockApi(page);
  await page.route('**/src/PublicMenu.tsx*', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('.game-window')).toBeVisible();
  await page.getByRole('link', { name: 'Admin panel', exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
});
