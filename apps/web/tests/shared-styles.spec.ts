/** World identity must not change the shared shell, log surfaces or page backdrop. */
import sharp from 'sharp';
import { defaultSiteCopy } from '@clog/domain';
import {
  openSiteMenu,
  openSubmissionHelp,
  expect,
  test,
  type Page,
} from './test.ts';
import { mockApi } from './mock-api.ts';

async function shell(page: Page) {
  return page.evaluate(() => {
    const geometry = (selector: string) => {
      const box = document.querySelector(selector)!.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    };
    const style = getComputedStyle(document.querySelector('.site-shell')!);
    return {
      header: geometry('.site-header'),
      navigation: geometry('.public-navigation-bar'),
      headingTop: geometry('[data-page-heading]').y,
      padding: style.padding,
      width: style.width,
    };
  });
}

async function logSurfaces(page: Page) {
  return page.evaluate(() =>
    [
      '.log-help',
      '.game-window',
      '.game-body',
      '.game-content',
      '.page-heading',
      '.page-list button',
      '.game-tabs button[aria-selected="true"]',
    ].map((selector) => {
      const node = document.querySelector(selector)!;
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return {
        selector,
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        background: style.background,
        border: style.border,
        padding: style.padding,
        gap: style.gap,
        font: style.font,
      };
    }),
  );
}

async function backdrop(page: Page, name: string) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo(0, 0);
  });
  const links = page.locator('.public-navigation a');
  const first = (await links.nth(0).boundingBox())!,
    second = (await links.nth(1).boundingBox())!;
  const screenshot = await page.screenshot({
    path: test.info().outputPath(name + '.png'),
  });
  // The gap between the centered navigation buttons exposes the page gradient
  // at identical viewport coordinates, even when the pair is hidden in hardcore.
  return Array.from(
    await sharp(screenshot)
      .extract({
        left: Math.floor((first.x + first.width + second.x) / 2) - 1,
        top: Math.floor(first.y + first.height / 2),
        width: 2,
        height: 2,
      })
      .removeAlpha()
      .raw()
      .toBuffer(),
  );
}

for (const viewport of [
  { width: 1440, height: 810 },
  { width: 740, height: 900 },
  { width: 320, height: 850 },
]) {
  test(
    'normal, hardcore and XP share stable surfaces and backdrop at ' +
      viewport.width,
    async ({ page }) => {
      await page.setViewportSize(viewport);
      const { admin } = await mockApi(page, {
        scenario: 'hardcore',
        xpSamples: true,
      });
      const signal = new AbortController().signal;
      const settings = await admin.settings(signal);
      await admin.saveSettings(
        true,
        settings.revision,
        'test-admin',
        signal,
        'Example clan',
        defaultSiteCopy,
        {
          clanName: 'Hardcore clan',
          copy: {
            ...defaultSiteCopy,
            collectionCaption: 'Our hardcore collections',
          },
        },
      );
      await page.goto('/');
      await expect(page.locator('.page-heading h3')).toHaveText('Vardorvis');
      const normalBackdrop = await backdrop(page, 'normal-' + viewport.width);
      const normalShell = await shell(page);
      const normalLog = await logSurfaces(page);
      const skull = page.getByRole('button', {
        name: 'Hardcore worlds',
        exact: true,
      });
      await skull.click();
      await expect(skull).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.clan-name')).toHaveText('Hardcore clan');
      await expect(page.locator('.log-help')).toHaveText(
        'Our hardcore collections Hardcore worlds',
      );
      expect(await backdrop(page, 'hardcore-' + viewport.width)).toEqual(
        normalBackdrop,
      );
      expect(await shell(page)).toEqual(normalShell);
      expect(await logSurfaces(page)).toEqual(normalLog);
      const hcItem = page.getByRole('button', {
        name: 'Virtus mask: collected, hardcore',
        exact: true,
      });
      await expect(hcItem).not.toHaveClass(/item-slot--event/);
      await expect(hcItem.locator('img')).toHaveCSS(
        'filter',
        /hardcore-outline/,
      );
      await hcItem.click();
      await expect(page.getByRole('tooltip')).toHaveClass(
        /item-menu--hardcore/,
      );
      await expect(
        page.getByRole('tooltip').locator('.item-menu__regular p'),
      ).toHaveText('Collected by KihiraVD on 05/10/26');
      await expect(page.locator('.item-menu__event')).toHaveCount(0);
      await page.keyboard.press('Escape');
      await skull.click();
      await page.getByRole('link', { name: 'Xp tracker', exact: true }).click();
      await expect(page.locator('#xp-tracker')).toBeVisible();
      expect(await backdrop(page, 'xp-' + viewport.width)).toEqual(
        normalBackdrop,
      );
      expect(await shell(page)).toEqual(normalShell);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    },
  );
}

// A shared edit must reach lazy staff routes, body portals and native top-layer
// dialogs in either navigation order, without a feature copying the theme.
for (const width of [1440, 320]) {
  for (const firstRoute of ['/', '/admin/settings']) {
    test(`shared tokens reach controls, portals and dialogs at ${width} starting on ${firstRoute}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      const { admin } = await mockApi(page, {
        scenario: 'hardcore',
        xpSamples: true,
      });
      const signal = new AbortController().signal;
      const settings = await admin.settings(signal);
      await admin.saveSettings(true, settings.revision, 'test-admin', signal);
      await page.goto(firstRoute);
      await expect(page.locator('.clan-name')).toBeVisible();
      await page.evaluate(() => {
        const tokens = {
          '--surface-panel': '#182736',
          '--surface-field': '#203040',
          '--surface-tooltip': '#304050',
          '--control-background': '#405060',
          '--text-heading': '#f0dfab',
          '--focus-ring': '#aabbcc',
          '--feedback-error': '#ee8899',
        };
        for (const [name, value] of Object.entries(tokens))
          document.documentElement.style.setProperty(name, value);
      });
      const staff = async () => {
        await expect(page.locator('.admin-panel').first()).toHaveCSS(
          'background-color',
          'rgb(24, 39, 54)',
        );
        await expect(page.locator('.admin-panel h2').first()).toHaveCSS(
          'color',
          'rgb(240, 223, 171)',
        );
        await expect(
          page.locator('.admin-panel input:not([type="checkbox"])').first(),
        ).toHaveCSS('background-color', 'rgb(32, 48, 64)');
      };
      if (firstRoute !== '/') {
        await staff();
        await page
          .getByRole('link', { name: 'Main site', exact: true })
          .click();
      }
      const help = page.getByRole('button', {
        name: 'Menu',
        exact: true,
      });
      await expect(help).toHaveCSS('background-color', 'rgb(64, 80, 96)');
      await expect(help).toBeEnabled();
      await page.keyboard.press('Tab');
      await help.focus();
      await expect(help).toHaveCSS('outline-color', 'rgb(170, 187, 204)');
      const item = page.locator('.item-slot--collected').first();
      await item.click();
      const tooltip = page.getByRole('tooltip');
      await expect(tooltip).toHaveCSS('background-color', 'rgb(48, 64, 80)');
      expect(
        await tooltip.evaluate((node) => node.parentElement === document.body),
      ).toBe(true);
      await page.keyboard.press('Escape');
      await openSubmissionHelp(page);
      const helpDialog = page.getByRole('dialog', {
        name: 'How to submit',
        exact: true,
      });
      await expect(helpDialog).toHaveCSS('background-color', 'rgb(24, 39, 54)');
      expect(
        await helpDialog.evaluate(
          (node) => getComputedStyle(node, '::backdrop').backgroundColor,
        ),
      ).toBe('rgba(0, 0, 0, 0.733)');
      await page.keyboard.press('Escape');
      const hardcore = page.getByRole('button', {
        name: 'Hardcore worlds',
        exact: true,
      });
      await hardcore.click();
      await page.locator('.item-slot--hardcore').first().click();
      await expect(tooltip).toHaveCSS('background-color', 'rgb(48, 64, 80)');
      await page.keyboard.press('Escape');
      await hardcore.click();
      await page.getByRole('link', { name: 'Xp tracker', exact: true }).click();
      await page.locator('.skill-cell').first().focus();
      await expect(page.locator('.xp-tooltip')).toHaveCSS(
        'background-color',
        'rgb(48, 64, 80)',
      );
      await page.keyboard.press('Escape');
      await openSiteMenu(page);
      await page
        .getByRole('link', { name: 'Admin panel', exact: true })
        .click();
      await page
        .getByRole('link', { name: 'Site settings', exact: true })
        .click();
      await staff();
      const hex = page
        .getByRole('group', { name: 'Event collection highlight', exact: true })
        .getByLabel('HEX', { exact: true });
      await hex.fill('invalid');
      await expect(hex).toHaveCSS('border-top-color', 'rgb(238, 136, 153)');
      await expect(page.locator('.admin-error').first()).toHaveCSS(
        'color',
        'rgb(238, 136, 153)',
      );
      // Invalid form feedback and the disabled control state share the same
      // primitives inside a lazy staff route as on public dialogs.
      const save = page.getByRole('button', {
        name: 'Save site settings',
        exact: true,
      });
      await expect(save).toBeDisabled();
      await save.hover();
      await expect(save).toHaveCSS('background-color', 'rgb(64, 80, 96)');
      await expect(save).toHaveCSS('opacity', '0.5');
      await page
        .getByRole('button', { name: 'Discard changes', exact: true })
        .click();
      await page
        .getByRole('link', { name: 'Submissions', exact: true })
        .click();
      await page
        .getByRole('button', { name: /^Review / })
        .first()
        .click();
      const review = page.getByRole('dialog', {
        name: 'Submission review',
        exact: true,
      });
      await expect(review).toHaveCSS('background-color', 'rgb(24, 39, 54)');
      await expect(
        review.locator('input:not([type="checkbox"])').first(),
      ).toHaveCSS('background-color', 'rgb(32, 48, 64)');
      const box = (await review.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(box.y + box.height).toBeLessThanOrEqual(900);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    });
  }
}
