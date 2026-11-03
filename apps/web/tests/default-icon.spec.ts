import { test, expect, pngFile, webpFile, type Page } from './test.ts';
import { mockApi } from './mock-api.ts';

async function form(page: Page, name: string, id = '1900000001') {
  await page.goto('/admin/catalog');
  await page.getByRole('button', { name: '+ Add item', exact: true }).click();
  await page.getByRole('button', { name: 'Add new item', exact: true }).click();
  await page.getByLabel('Item name', { exact: true }).fill(name);
  await page.getByLabel('In-game item ID (required)', { exact: true }).fill(id);
  return page.getByRole('button', { name: 'Create item', exact: true });
}
function requests(page: Page) {
  const state = {
    uploads: 0,
    creates: [] as { body: Record<string, unknown>; key: string | undefined }[],
  };
  page.on('request', (request) => {
    if (request.method() !== 'POST') return;
    const path = new URL(request.url()).pathname;
    if (path === '/api/v1/admin/catalog/icons') state.uploads++;
    if (path === '/api/v1/admin/catalog/items')
      state.creates.push({
        body: request.postDataJSON(),
        key: request.headers()['idempotency-key'],
      });
  });
  return state;
}

test('default item icon is shared by creation, catalog, both public worlds and reload; edits can replace it', async ({
  page,
}, info) => {
  const { admin } = await mockApi(page);
  const signal = new AbortController().signal;
  await admin.saveSettings(
    true,
    (await admin.settings(signal)).revision,
    'test-admin',
    signal,
  );
  const state = requests(page),
    name = 'Default artwork trophy';
  const save = await form(page, name);
  const preview = page.getByAltText('Default item icon preview');
  await expect(preview).toBeVisible();
  await expect
    .poll(() =>
      preview.evaluate((image: HTMLImageElement) => [
        image.naturalWidth,
        image.naturalHeight,
      ]),
    )
    .toEqual([26, 26]);
  await page.screenshot({
    path: info.outputPath('default-icon-form.png'),
    fullPage: true,
  });
  await save.click();
  const row = page.locator('.catalog-item').filter({
    has: page.getByRole('button', {
      name: 'Reorder item ' + name,
      exact: true,
    }),
  });
  await expect(row).toHaveCount(1);
  await expect(row.locator('img')).toHaveAttribute(
    'src',
    '/catalog/default.webp',
  );
  await expect(page.locator('.admin-created img')).toHaveAttribute(
    'src',
    '/catalog/default.webp',
  );
  expect(state.uploads).toBe(0);
  expect(state.creates).toHaveLength(1);
  expect(state.creates[0]!.body).not.toHaveProperty('iconAssetId');
  await page.goto('/');
  const slot = page.getByRole('button', {
    name: name + ': not collected',
    exact: true,
  });
  await expect(slot.locator('img')).toHaveAttribute(
    'src',
    '/catalog/default.webp',
  );
  await page
    .getByRole('button', { name: 'Hardcore worlds', exact: true })
    .click();
  await expect(slot.locator('img')).toHaveAttribute(
    'src',
    '/catalog/default.webp',
  );
  await page.reload();
  await expect(slot.locator('img')).toHaveAttribute(
    'src',
    '/catalog/default.webp',
  );
  await page.goto('/admin/catalog');
  await page
    .getByRole('button', { name: 'Edit item ' + name, exact: true })
    .click();
  await page.getByLabel('Item name', { exact: true }).fill(name + ' renamed');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByText('Changes saved.', { exact: true })).toBeVisible();
  expect(state.uploads).toBe(0);
  await page
    .getByLabel('Replace item icon', { exact: true })
    .setInputFiles(await webpFile('public/skills/sailing.webp'));
  await expect(page.getByAltText('New item icon preview')).toBeVisible();
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Save changes', exact: true }),
  ).toBeDisabled();
  await expect(
    page
      .locator('.catalog-item')
      .filter({
        has: page.getByRole('button', {
          name: 'Reorder item ' + name + ' renamed',
          exact: true,
        }),
      })
      .locator('img'),
  ).not.toHaveAttribute('src', '/catalog/default.webp');
  expect(state.uploads).toBe(1);
});

test('invalid and pending icon files cannot fall back; explicitly clearing selection restores the default', async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    const decode = window.createImageBitmap.bind(window);
    Object.defineProperty(window, 'createImageBitmap', {
      value: async (blob: Blob) => {
        await new Promise<void>((resolve) =>
          Reflect.set(window, 'releaseIconValidation', resolve),
        );
        const bitmap = await decode(blob);
        Reflect.set(window, 'iconValidationFinished', true);
        return bitmap;
      },
    });
  });
  await page.setViewportSize({ width: 320, height: 900 });
  await mockApi(page);
  const state = requests(page);
  const save = await form(page, 'Cleared file trophy');
  const picker = page.getByLabel('Item icon (optional)', { exact: true });
  await picker.setInputFiles({
    name: 'spoof.png',
    mimeType: 'image/png',
    buffer: Buffer.from('<svg/>'),
  });
  await expect(page.locator('.icon-picker').getByRole('alert')).toBeVisible();
  await expect(page.getByAltText('Default item icon preview')).toHaveCount(0);
  await save.click();
  await expect(
    page.locator('.item-creator').getByRole('alert').first(),
  ).toContainText('Choose a valid item icon');
  expect(state.creates).toHaveLength(0);
  expect(state.uploads).toBe(0);
  await page
    .getByRole('button', { name: 'Remove selected icon', exact: true })
    .click();
  await expect(page.getByAltText('Default item icon preview')).toBeVisible();
  await picker.setInputFiles(await pngFile('public/skills/sailing.webp'));
  await page.waitForFunction(
    () => typeof Reflect.get(window, 'releaseIconValidation') === 'function',
  );
  await expect(save).toBeDisabled();
  await page
    .locator('.item-creator form')
    .evaluate((form: HTMLFormElement) => form.requestSubmit());
  await expect(
    page.locator('.item-creator').getByRole('alert').first(),
  ).toContainText('Choose a valid item icon');
  expect(state.creates).toHaveLength(0);
  await page
    .getByRole('button', { name: 'Remove selected icon', exact: true })
    .click();
  await page.evaluate(() => Reflect.get(window, 'releaseIconValidation')());
  await page.waitForFunction(
    () => Reflect.get(window, 'iconValidationFinished') === true,
  );
  await expect(page.getByAltText('Default item icon preview')).toBeVisible();
  await expect(save).toBeEnabled();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  expect(
    await picker.evaluate((input: HTMLInputElement) => input.files!.length),
  ).toBe(0);
  await page.screenshot({
    path: info.outputPath('optional-icon-mobile.png'),
    fullPage: true,
  });
  await save.click();
  await expect(page.locator('.admin-created')).toContainText(
    'Cleared file trophy',
  );
  expect(state.uploads).toBe(0);
  expect(state.creates).toHaveLength(1);
  expect(state.creates[0]!.body).not.toHaveProperty('iconAssetId');
});

for (const format of ['PNG', 'WebP'])
  test(
    'a selected valid ' + format + ' icon is uploaded and remains custom',
    async ({ page }) => {
      await mockApi(page);
      const state = requests(page);
      const save = await form(page, format + ' artwork trophy');
      const file =
        format === 'PNG'
          ? await pngFile('public/skills/sailing.webp')
          : await webpFile('public/catalog/default.webp');
      await page
        .getByLabel('Item icon (optional)', { exact: true })
        .setInputFiles(file);
      await expect(page.getByAltText('New item icon preview')).toBeVisible();
      await save.click();
      await expect(page.locator('.admin-created')).toContainText(
        format + ' artwork trophy',
      );
      expect(state.uploads).toBe(1);
      expect(state.creates).toHaveLength(1);
      expect(state.creates[0]!.body.iconAssetId).toBeTruthy();
      await expect(page.locator('.admin-created img')).not.toHaveAttribute(
        'src',
        '/catalog/default.webp',
      );
    },
  );

test('an uncertain no-icon create retries the same omitted field and key without duplicating identity', async ({
  page,
}) => {
  const { admin } = await mockApi(page);
  const state = requests(page);
  let writes = 0;
  await page.route('**/api/v1/admin/catalog/items', async (route) => {
    const request = route.request();
    const result = await admin.create(
      request.postDataJSON(),
      request.headers()['idempotency-key']!,
      'test-admin',
      new AbortController().signal,
    );
    await route.fulfill(
      ++writes === 1
        ? { status: 503, json: {} }
        : { status: 201, json: result },
    );
  });
  await (await form(page, 'Uncertain default trophy')).click();
  await expect(
    page.getByRole('button', { name: 'Retry item save', exact: true }),
  ).toBeEnabled();
  await expect(page.getByLabel('Item name', { exact: true })).toBeDisabled();
  await page
    .getByRole('button', { name: 'Retry item save', exact: true })
    .click();
  await expect(page.locator('.admin-created')).toContainText(
    'Uncertain default trophy',
  );
  expect(state.uploads).toBe(0);
  expect(state.creates).toHaveLength(2);
  expect(state.creates[1]).toEqual(state.creates[0]);
  expect(state.creates[0]!.body).not.toHaveProperty('iconAssetId');
  expect(
    (await admin.catalog(new AbortController().signal)).items.filter(
      (i) => i.name === 'Uncertain default trophy',
    ),
  ).toHaveLength(1);
});
