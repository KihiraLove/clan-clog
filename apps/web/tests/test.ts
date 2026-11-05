/** Fixture icons are intercepted by tests and never copied to the public site. */
import { test as base, expect, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { basename } from 'node:path';
import { readFile } from 'node:fs/promises';
export * from '@playwright/test';

export async function openSiteMenu(page: Page) {
  const trigger = page.getByRole('button', { name: 'Menu', exact: true });
  await expect(trigger).toBeEnabled();
  if ((await trigger.getAttribute('aria-expanded')) !== 'true')
    await trigger.click();
  return page.getByRole('group', { name: 'Menu options', exact: true });
}
export async function openSubmissionHelp(page: Page) {
  const menu = await openSiteMenu(page);
  await menu
    .getByRole('button', { name: 'How to submit', exact: true })
    .click();
}

export async function itemAssets(page: Page) {
  await page.route('**/fixture-items/*.webp', (route) => {
    const name = new URL(route.request().url()).pathname.split('/').at(-1)!;
    if (!/^\d+\.webp$/.test(name)) return route.abort();
    return route.fulfill({
      path: fileURLToPath(new URL('./support/items/' + name, import.meta.url)),
      contentType: 'image/webp',
    });
  });
}
export const test = base.extend({
  page: async ({ page }, use) => {
    await itemAssets(page);
    await use(page);
  },
});

/** In-memory bytes keep intercepted multipart requests complete in Chromium. */
export async function pngFile(path: string) {
  return {
    name: basename(path).replace(/\.webp$/u, '.png'),
    mimeType: 'image/png',
    buffer: await sharp(path).png().toBuffer(),
  };
}

/** Preserve original WebP bytes in intercepted multipart requests. */
export async function webpFile(path: string) {
  return {
    name: basename(path),
    mimeType: 'image/webp',
    buffer: await readFile(path),
  };
}
