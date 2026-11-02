import { expect, test } from './test.ts';
import { mockApi } from './mock-api.ts';

test('canonical initial title and rich footer preserve wording while saved world copy and help survive reload', async ({
  page,
}) => {
  const { admin } = await mockApi(page);
  const html = await page.request.get('/');
  expect(await html.text()).toContain('<title>Clan Collection Log</title>');
  const signal = new AbortController().signal;
  const current = await admin.settings(signal);
  await admin.saveSettings(
    true,
    current.revision,
    'test-admin',
    signal,
    'Clan <A&B>',
    {
      collectionTitle: 'Regular <clan> & friends',
      collectionCaption: 'Regular proof',
      xpTitle: 'Regular XP',
    },
    {
      clanName: 'Hardcore <A&B>',
      copy: {
        collectionTitle: 'Hardcore <clan> & friends',
        collectionCaption: 'Hardcore proof',
        xpTitle: 'Hardcore XP',
      },
    },
    '## Saved clan rules\n\nKeep **proof** & ask staff.',
  );
  await page.goto('/');
  await expect(page.locator('.clan-subtitle')).toHaveText(
    'Regular <clan> & friends',
  );
  await expect(
    page.getByRole('heading', { name: 'Regular proof', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.clan-name')).toHaveText('Clan <A&B>');
  await expect(page.locator('.clan-name').locator('a, b')).toHaveCount(0);
  await expect(
    page.getByRole('navigation', { name: 'Public pages' }).getByRole('link'),
  ).toHaveText(['Collection log', 'Xp tracker']);
  await expect(page.locator('.footer-catalog')).toContainText(
    'Catalog data: TempleOSRS and OSRS Wiki',
  );
  await expect(
    page.locator('.footer-catalog').getByRole('link', { name: 'TempleOSRS' }),
  ).toHaveAttribute('href', 'https://templeosrs.com/api_doc.php');
  await page.screenshot({
    path: '../../.data/text-checks/regular-copy.png',
    fullPage: true,
  });
  await page
    .getByRole('button', { name: 'Hardcore worlds', exact: true })
    .click();
  await expect(page.locator('.clan-subtitle')).toHaveText(
    'Hardcore <clan> & friends',
  );
  await page.reload();
  await expect(page.locator('.clan-subtitle')).toHaveText(
    'Hardcore <clan> & friends',
  );
  await expect(
    page.getByRole('heading', {
      name: 'Hardcore proof Hardcore worlds',
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator('.clan-name')).toHaveText('Hardcore <A&B>');
  await page
    .getByRole('button', { name: 'How to submit', exact: true })
    .click();
  const help = page.getByRole('dialog', { name: 'How to submit', exact: true });
  await expect(
    help.getByRole('heading', { name: 'Saved clan rules' }),
  ).toBeVisible();
  await expect(help.locator('strong')).toHaveText('proof');
  await expect(help).toContainText('Keep proof & ask staff.');
  await page.screenshot({
    path: '../../.data/text-checks/hardcore-help.png',
    fullPage: true,
  });
});
