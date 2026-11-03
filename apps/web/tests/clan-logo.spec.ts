import { mockApi } from './mock-api.ts';
import { expect, test } from './test.ts';
import sharp from 'sharp';
import { adminFixtures } from './admin-fixtures.ts';

test('root and deep-link HTML declare a PNG icon before delayed branding; metadata keeps mobile and tab artwork consistent', async ({
  page,
}) => {
  await mockApi(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const id = '00000000-0000-4000-8000-000000000001';
  const branded = {
    revision: 'branding-2',
    logoPath: `/api/v1/branding/${id}.webp`,
    faviconPath: `/api/v1/branding/${id}/favicon.webp`,
  };
  const png = await sharp({
    create: { width: 180, height: 180, channels: 4, background: '#ff00ff' },
  })
    .png()
    .toBuffer();
  await page.route('**/*apple-touch-icon.png*', (route) =>
    route.fulfill({
      body: png,
      contentType: 'image/png',
      headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' },
    }),
  );
  await page.route('**/api/v1/branding', async (route) => {
    await gate;
    await route.fulfill({ json: branded });
  });
  for (const path of ['/', '/xp']) {
    const html = await (await page.request.get(path)).text();
    expect(html).toMatch(/rel="icon"[^>]+type="image\/png"/);
    expect(html).toMatch(
      /rel="apple-touch-icon"[^>]+href="\/apple-touch-icon.png"/,
    );
    expect(html).not.toContain('alternate icon');
  }
  await page.goto('/xp');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
    'href',
    /\/apple-touch-icon\.png/,
  );
  // Discovery retrieves the configured artwork while the JSON metadata is held.
  const pixel = await page.evaluate(async () => {
    const response = await fetch('/apple-touch-icon.png');
    const bitmap = await createImageBitmap(await response.blob());
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 180;
    const context = canvas.getContext('2d')!;
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    return {
      type: response.headers.get('Content-Type'),
      pixel: [...context.getImageData(90, 90, 1, 1).data],
    };
  });
  expect(pixel).toEqual({ type: 'image/png', pixel: [255, 0, 255, 255] });
  release();
  const path = `/api/v1/branding/${id}/apple-touch-icon.png`;
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', path);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    'href',
    path,
  );
});

test('admin uploads GIF and animated WebP logos, updates the website icon and restores the default', async ({
  page,
}) => {
  await mockApi(page);
  await page.goto('/admin/settings');
  const logo = page.locator('.clan-logo').first();
  await expect(logo).toHaveAttribute('src', '/brand/clan-logo.webp');
  const webp = await sharp(Buffer.from([255, 0, 0, 255, 0, 0, 255, 255]), {
    raw: { width: 1, height: 2, pageHeight: 1, channels: 4 },
  })
    .webp({ lossless: true, delay: [120, 230] })
    .toBuffer();
  for (const [name, mimeType, buffer] of [
    [
      'logo.gif',
      'image/gif',
      await sharp(webp, { animated: true }).gif().toBuffer(),
    ],
    ['logo.webp', 'image/webp', webp],
  ] as const) {
    await page
      .getByLabel('Logo image', { exact: true })
      .setInputFiles({ name, mimeType, buffer });
    await page
      .getByRole('button', { name: 'Save site settings', exact: true })
      .click();
    await expect(page.getByText('Site settings saved.')).toBeVisible();
    await expect(logo).toHaveAttribute('src', /\/api\/v1\/branding\//);
    const paths = await page.evaluate(() => ({
      logo: document.querySelector<HTMLImageElement>('.clan-logo')!.src,
      favicon:
        document.querySelector<HTMLLinkElement>('link[rel="icon"]')!.href,
      touch: document.querySelector<HTMLLinkElement>(
        'link[rel="apple-touch-icon"]',
      )!.href,
    }));
    expect(paths.favicon).toMatch(/\/api\/v1\/branding\//);
    expect(paths.touch).toBe(paths.favicon);
    const formats = await page.evaluate(
      async ({ logo, favicon }) => ({
        logo: (await fetch(logo)).headers.get('Content-Type'),
        favicon: (await fetch(favicon)).headers.get('Content-Type'),
      }),
      paths,
    );
    expect(formats).toEqual({ logo: 'image/webp', favicon: 'image/png' });
  }
  await page.setViewportSize({ width: 320, height: 850 });
  await expect(
    page.getByRole('button', { name: 'Restore default logo' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .locator('.clan-logo-settings')
    .screenshot({ path: test.info().outputPath('clan-logo-controls.png') });
  await page.getByRole('button', { name: 'Restore default logo' }).click();
  await page
    .getByRole('button', { name: 'Save site settings', exact: true })
    .click();
  await expect(logo).toHaveAttribute('src', '/brand/clan-logo.webp');
  expect(await page.locator('link[rel="icon"]').getAttribute('href')).toBe(
    '/apple-touch-icon.png?v=branding-4',
  );
});

test('live branding changes the public logo and icon; moderator accounts have no logo controls or private branding reads', async ({
  page,
}) => {
  const fixture = await adminFixtures();
  await page.route('**/*apple-touch-icon.png*', async (route) =>
    route.fulfill({
      body: await sharp({
        create: { width: 180, height: 180, channels: 4, background: '#ff00ff' },
      })
        .png()
        .toBuffer(),
      contentType: 'image/png',
    }),
  );
  let privateReads = 0;
  const id = '00000000-0000-4000-8000-000000000001';
  const branding = {
    revision: 'branding-2',
    logoPath: `/api/v1/branding/${id}.webp`,
    faviconPath: `/api/v1/branding/${id}/favicon.webp`,
  };
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/v1/branding') return route.fulfill({ json: branding });
    if (path === '/api/v1/admin/branding') privateReads++;
    if (path === '/api/v1/auth/session')
      return route.fulfill({ json: { ...fixture.session, role: 'moderator' } });
    if (path === '/api/v1/settings')
      return route.fulfill({
        json: {
          revision: 'settings-1',
          clanName: 'Example clan',
          hardcoreEnabled: false,
        },
      });
    if (path === '/api/v1/admin/catalog')
      return route.fulfill({ json: fixture.catalog });
    if (path === '/api/v1/admin/submissions')
      return route.fulfill({ json: fixture.pending });
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto('/admin');
  await expect(page.locator('.clan-logo').first()).toHaveAttribute(
    'src',
    branding.logoPath,
  );
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
    'href',
    branding.faviconPath.replace('favicon.webp', 'apple-touch-icon.png'),
  );
  await expect(
    page.getByRole('heading', { name: 'Submissions', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Logo image', { exact: true })).toHaveCount(0);
  expect(privateReads).toBe(0);
});
