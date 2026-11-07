import { mockApi } from './mock-api.ts';
import { expect, test } from './test.ts';

test('RuneLite policies, independent clan matching and whitelist save on desktop and mobile', async ({
  page,
}) => {
  await mockApi(page);
  await page.goto('/admin/runelite');
  const names = page.getByRole('group', {
    name: 'In-game clan names for matching',
  });
  const firstName = names.getByLabel('In-game clan name 1', { exact: true });
  const secondName = names.getByLabel('In-game clan name 2', { exact: true });
  const add = names.getByRole('button', { name: 'Add clan name' });
  const save = page.getByRole('button', { name: 'Save review settings' });
  const discard = page.getByRole('button', { name: 'Discard changes' });
  const saved = page.getByText('RuneLite review settings saved.', {
    exact: true,
  });
  await expect(
    page.getByLabel('Match Clan name or API', { exact: true }),
  ).toBeEnabled();
  await expect(
    page
      .getByLabel('Match Clan name or API', { exact: true })
      .locator('option'),
  ).toHaveText(['Clan name', 'API key', 'Both']);
  await expect(firstName).toHaveValue('Clan name');
  await names.getByRole('button', { name: 'Remove clan name 1' }).click();
  await expect(names.getByRole('alert')).toContainText('Add at least one');
  await expect(save).toBeDisabled();
  await discard.click();
  await expect(firstName).toHaveValue('Clan name');
  for (const label of [
    'Free to play worlds submissions',
    'PVP worlds submissions',
  ]) {
    const select = page.getByLabel(label, { exact: true });
    await expect(select.locator('option')).toHaveText([
      'Reject',
      'Send to review',
      'Auto allow',
    ]);
    await select.selectOption(
      label === 'Free to play worlds submissions' ? 'reject' : 'allow',
    );
  }
  for (const label of [
    'Members worlds submissions',
    'Hardcore worlds submissions',
  ]) {
    const select = page.getByLabel(label, { exact: true });
    await expect(select.locator('option')).toHaveText([
      'Send to review',
      'Auto allow',
    ]);
    await select.selectOption('allow');
  }
  await firstName.fill(' Game Clan ');
  await add.click();
  await expect(names.getByRole('alert')).toContainText(
    'Enter 1 to 80 characters',
  );
  await expect(save).toBeDisabled();
  await secondName.fill(' game clan ');
  await expect(names.getByRole('alert')).toContainText('must be unique');
  await expect(save).toBeDisabled();
  await secondName.fill(' Sister Clan ');
  await expect(names.getByRole('alert')).toHaveCount(0);
  await page
    .getByLabel('Match Clan name or API', { exact: true })
    .selectOption('name');
  await page
    .getByLabel('Player whitelist', { exact: true })
    .fill('Trusted_Player\ntrusted player\nSecond Player');
  await save.click();
  await expect(saved).toBeVisible();
  await expect(
    page.getByLabel('Player whitelist', { exact: true }),
  ).toHaveValue('trusted player\nSecond Player');
  await expect(firstName).toHaveValue('Game Clan');
  await expect(secondName).toHaveValue('Sister Clan');
  await page
    .getByLabel('Match Clan name or API', { exact: true })
    .selectOption('key');
  await save.click();
  await expect(saved).toBeVisible();
  await expect(save).toBeDisabled();
  await page.getByRole('link', { name: 'Site settings', exact: true }).click();
  await expect(
    page.getByLabel('Displayed clan name', { exact: true }),
  ).toHaveValue('Clan name');
  await page
    .getByRole('link', { name: 'RuneLite submissions', exact: true })
    .click();
  await expect(
    page.getByLabel('Match Clan name or API', { exact: true }),
  ).toHaveValue('key');
  await expect(firstName).toHaveValue('Game Clan');
  await expect(secondName).toHaveValue('Sister Clan');
  await names.getByRole('button', { name: 'Remove clan name 1' }).click();
  await firstName.fill('Renamed Clan');
  await save.click();
  await expect(saved).toBeVisible();
  await expect(save).toBeDisabled();
  await page.reload();
  await expect(firstName).toHaveValue('Renamed Clan');
  await expect(secondName).toHaveCount(0);
  await expect(
    page.getByLabel('Free to play worlds submissions', { exact: true }),
  ).toHaveValue('reject');
  await page.setViewportSize({ width: 320, height: 850 });
  await page
    .getByLabel('Player whitelist', { exact: true })
    .scrollIntoViewIfNeeded();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: test.info().outputPath('runelite-review-mobile.png'),
    fullPage: true,
  });
});
