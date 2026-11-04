import { test, expect, type Page } from './test.ts';
import { mockApi } from './mock-api.ts';
import * as text from '@clog/domain';
async function fixture(page: Page) {
  const base = await mockApi(page);
  const state = {
    enabled: true,
    error: '',
    uncertain: false,
    requests: [] as { key: string; oldName: string; newName: string }[],
  };
  await page.route('**/api/v1/collector-name-changes', async (route) => {
    if (route.request().method() === 'GET')
      return route.fulfill({ json: { enabled: state.enabled } });
    const fields = route.request().postDataJSON() as {
      oldName: string;
      newName: string;
    };
    state.requests.push({
      ...fields,
      key: route.request().headers()['idempotency-key']!,
    });
    if (state.uncertain) {
      state.uncertain = false;
      return route.abort();
    }
    if (state.error)
      return route.fulfill({ status: 422, json: { error: state.error } });
    return route.fulfill({
      json: {
        status: 'changed',
        operationId: '00000000-0000-4000-8000-000000000123',
        ...fields,
      },
    });
  });
  return { ...base, state };
}
async function open(page: Page) {
  await page.getByRole('button', { name: 'Change name', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Change name', exact: true });
  await dialog.getByLabel('Old name', { exact: true }).fill('Old Name');
  await dialog.getByLabel('New name', { exact: true }).fill('New Name');
  return dialog;
}
test('public button sits below help; exact errors and WOM link stay inside the same dialog, then success closes it', async ({
  page,
}, info) => {
  const { state } = await fixture(page);
  await page.goto('/');
  const help = await page
      .getByRole('button', { name: 'How to submit', exact: true })
      .boundingBox(),
    button = await page
      .getByRole('button', { name: 'Change name', exact: true })
      .boundingBox();
  expect(button!.y).toBeGreaterThanOrEqual(help!.y + help!.height);
  expect(button!.width).toBe(help!.width);
  const dialog = await open(page);
  state.error = text.publicNamesWomFirst;
  await dialog.getByRole('button', { name: 'Change', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText(
    text.publicNamesWomFirst,
  );
  await expect(dialog.getByRole('link')).toHaveAttribute(
    'href',
    'https://wiseoldman.net/players/Old%20Name?dialog=submit-name',
  );
  state.error = text.publicNamesStaffRequired;
  await dialog.getByRole('button', { name: 'Change', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText(
    text.publicNamesStaffRequired,
  );
  await expect(dialog.getByRole('link')).toHaveCount(0);
  await expect(dialog.getByLabel('Old name', { exact: true })).toHaveValue(
    'Old Name',
  );
  await page.screenshot({ path: info.outputPath('public-name-error.png') });
  state.error = '';
  await dialog.getByRole('button', { name: 'Change', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText(text.publicNamesSuccess);
  expect(state.requests).toHaveLength(3);
  expect(new Set(state.requests.map((r) => r.key)).size).toBe(3);
});
test('uncertain save keeps the same names and key through dismissal and a retry', async ({
  page,
}) => {
  const { state } = await fixture(page);
  state.uncertain = true;
  await page.goto('/');
  let dialog = await open(page);
  await dialog.getByRole('button', { name: 'Change', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText(text.publicNamesUncertain);
  await expect(dialog.getByLabel('Old name', { exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'Change name', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Change', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.requests).toHaveLength(2);
  expect(state.requests[0]).toEqual(state.requests[1]);
});
test('mobile dialog fits, traps keyboard focus, restores the opener and cancels without mutation', async ({
  page,
}, info) => {
  const { state } = await fixture(page);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  const dialog = await open(page);
  const box = await dialog.boundingBox();
  expect(box!.width).toBeLessThanOrEqual(320);
  expect(box!.x).toBeGreaterThanOrEqual(0);
  const first = dialog.getByLabel('Old name', { exact: true }),
    last = dialog.getByRole('button', { name: 'Change', exact: true });
  await first.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(last).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(first).toBeFocused();
  await page.screenshot({ path: info.outputPath('public-name-mobile.png') });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Change name', exact: true }),
  ).toBeFocused();
  expect(state.requests).toHaveLength(0);
});
test('admin toggle is directly under Name Changes and hides or enables the public action', async ({
  page,
}) => {
  await mockApi(page);
  await page.goto('/admin/submissions');
  const panel = page.locator('.name-changes-panel'),
    toggle = panel.getByRole('switch', { name: text.userNameChangesToggle });
  await expect(toggle).not.toBeChecked();
  expect(
    await toggle.evaluate(
      (el) =>
        el.closest('.user-name-setting')?.previousElementSibling?.textContent,
    ),
  ).toBe('Name Changes');
  await toggle.check();
  await expect(toggle).toBeChecked();
  await page.getByRole('link', { name: 'Main site', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Change name', exact: true }),
  ).toBeVisible();
  await page.goto('/admin/submissions');
  await panel
    .getByRole('switch', { name: text.userNameChangesToggle })
    .uncheck();
  await page.getByRole('link', { name: 'Main site', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Change name', exact: true }),
  ).toHaveCount(0);
});
