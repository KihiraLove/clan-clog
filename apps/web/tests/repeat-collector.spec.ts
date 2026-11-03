import { test, expect } from './test.ts';
import { mockApi } from './mock-api.ts';
import type { Credit } from '../src/model.ts';
test('repeat policy has its own section, preserves broad filtering and persists at desktop and mobile widths', async ({
  page,
}, info) => {
  const { admin } = await mockApi(page);
  const signal = new AbortController().signal;
  await page.goto('/admin/submissions');
  const panel = page.locator('.repeat-collector-panel'),
    choice = panel.getByRole('combobox', {
      name: 'Repeat collections by username',
      exact: true,
    });
  await expect(choice).toHaveValue('separate');
  await expect(choice.getByRole('option')).toHaveCount(3);
  expect(
    await panel.evaluate((e) =>
      e.previousElementSibling?.classList.contains('submission-filter-panel'),
    ),
  ).toBe(true);
  await page
    .getByRole('switch', { name: 'Filter out regular duplicates', exact: true })
    .click();
  await expect(
    page.getByRole('switch', {
      name: 'Filter out regular duplicates',
      exact: true,
    }),
  ).toHaveAttribute('aria-checked', 'true');
  await choice.selectOption('merge');
  await panel
    .getByRole('button', { name: 'Save repeat collection policy', exact: true })
    .click();
  await expect(panel.getByRole('status')).toHaveText(
    'Repeat collection policy saved.',
  );
  expect(
    (await admin.queue('pending', undefined, signal)).filters,
  ).toMatchObject({ filterCollected: true, repeatCollectorPolicy: 'merge' });
  for (const width of [1100, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await choice.scrollIntoViewIfNeeded();
    await expect(panel).toContainText(
      'Filter out regular duplicates takes precedence',
    );
    const box = (await choice.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    await panel.screenshot({
      path: info.outputPath(`repeat-policy-${width}.png`),
    });
  }
  await page.reload();
  await expect(choice).toHaveValue('merge');
  await expect(
    page.getByRole('switch', {
      name: 'Filter out regular duplicates',
      exact: true,
    }),
  ).toHaveAttribute('aria-checked', 'true');
});
test('failed and stale policy writes keep the draft and moderators have a read-only choice', async ({
  page,
}) => {
  const { admin } = await mockApi(page);
  const signal = new AbortController().signal;
  let fail = true;
  const writes: Record<string, unknown>[] = [];
  await page.route('**/api/v1/admin/submission-filters', (route) => {
    writes.push(route.request().postDataJSON());
    if (fail) {
      fail = false;
      return route.fulfill({ status: 500, json: {} });
    }
    return route.fallback();
  });
  await page.goto('/admin/submissions');
  const panel = page.locator('.repeat-collector-panel');
  const choice = panel.getByRole('combobox', {
      name: 'Repeat collections by username',
      exact: true,
    }),
    save = panel.getByRole('button', {
      name: 'Save repeat collection policy',
      exact: true,
    });
  await choice.selectOption('merge');
  await save.click();
  await expect(panel.getByRole('alert')).toBeVisible();
  await expect(choice).toHaveValue('merge');
  const current = (await admin.queue('pending', undefined, signal)).filters!;
  await admin.saveSubmissionFilters(
    true,
    current.revision,
    'test-admin',
    signal,
    'reject',
  );
  await save.click();
  await expect(panel.getByRole('alert')).toBeVisible();
  await expect(choice).toHaveValue('merge');
  await expect(save).toBeEnabled();
  await save.click();
  await expect(panel.getByRole('status')).toHaveText(
    'Repeat collection policy saved.',
  );
  expect(writes.at(-1)).toMatchObject({
    filterCollected: true,
    repeatCollectorPolicy: 'merge',
  });
  const session = await admin.session(signal);
  await page.route('**/api/v1/auth/session', (route) =>
    route.fulfill({
      json: { authenticated: true, ...session, role: 'moderator' },
    }),
  );
  await page.reload();
  await expect(choice).toHaveValue('merge');
  await expect(choice).toBeDisabled();
  await expect(save).toHaveCount(0);
  await expect(panel).toContainText(
    'Only the administrator can change this policy.',
  );
});
test('merged hover summaries keep the requested wording, all dates, Event prominence, canonical counts and live refresh', async ({
  page,
}, info) => {
  const { admin } = await mockApi(page);
  const signal = new AbortController().signal;
  const settings = await admin.settings(signal);
  await admin.saveSettings(true, settings.revision, 'test-admin', signal);
  let mode = 'separate',
    revision = 1;
  let rows: Omit<Credit, 'status'>[] = [
    {
      submissionId: 'regular-1',
      itemId: 1,
      collectorName: 'Alice Smith',
      collectedOn: '2026-10-01',
      hardcore: false,
      collectionType: 'regular',
    },
    {
      submissionId: 'regular-2',
      itemId: 1,
      collectorName: ' ALICE__SMITH ',
      collectedOn: '2026-10-01',
      hardcore: false,
      collectionType: 'regular',
    },
    {
      submissionId: 'event',
      itemId: 1,
      collectorName: 'alice\u00a0smith',
      collectedOn: '2026-10-20',
      hardcore: false,
      collectionType: 'event',
      eventPageId: 'a',
    },
    {
      submissionId: 'bob',
      itemId: 1,
      collectorName: 'Bob',
      collectedOn: '2026-09-01',
      hardcore: false,
      collectionType: 'regular',
    },
    {
      submissionId: 'hardcore',
      itemId: 1,
      collectorName: 'Alice Smith',
      collectedOn: '2026-09-02',
      hardcore: true,
      collectionType: 'regular',
    },
  ];
  await page.route('**/api/v1/catalog', (route) =>
    route.fulfill({
      json: {
        revision: 'repeat-catalog',
        items: [
          { id: 1, name: 'Shared trophy', iconPath: '/catalog/default.webp' },
        ],
        pages: [
          { id: 'a', name: 'Page A', category: 'bosses', itemIds: [1] },
          { id: 'b', name: 'Page B', category: 'bosses', itemIds: [1] },
        ],
      },
    }),
  );
  await page.route('**/api/v1/collections', (route) =>
    route.fulfill({
      json: {
        revision: 'repeat-' + revision,
        repeatCollectorPolicy: mode,
        credits: rows,
      },
    }),
  );
  const refresh = async () => {
    revision++;
    await page.evaluate(() =>
      document.dispatchEvent(new Event('visibilitychange')),
    );
  };
  await page.goto('/');
  const slot = page.getByRole('button', { name: /^Shared trophy: collected/ }),
    menu = page.getByRole('tooltip');
  await slot.click();
  await expect(menu.locator('.item-menu__event')).toHaveCount(1);
  await expect(menu.locator('.item-menu__regular p')).toHaveCount(3);
  mode = 'merge';
  await refresh();
  await expect(menu.locator('.item-menu__event > p')).toHaveText(
    'Collected 3x by Alice Smith first on 01/10/26',
  );
  await expect(menu.locator('.item-menu__regular > p')).toHaveText([
    'Collected by Bob on 01/09/26',
  ]);
  await expect(slot.locator('.item-obtain-count')).toHaveText('4');
  await menu.locator('summary').click();
  await expect(menu.locator('details p')).toHaveText([
    'Regular collection — 01/10/26',
    'Regular collection — 01/10/26',
    'First event collection — 20/10/26',
  ]);
  await page.setViewportSize({ width: 320, height: 900 });
  await expect
    .poll(async () => (await menu.boundingBox())?.width ?? 0)
    .toBeGreaterThanOrEqual(200);
  const box = (await menu.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(8);
  expect(box.x + box.width).toBeLessThanOrEqual(312);
  await page.screenshot({ path: info.outputPath('merged-history-mobile.png') });
  await page.getByRole('button', { name: 'Page B', exact: true }).click();
  await slot.click();
  await expect(menu.locator('.item-menu__event')).toHaveCount(0);
  await expect(menu.locator('.item-menu__regular > p')).toHaveText([
    'Collected by Bob on 01/09/26',
    'Collected 3x by Alice Smith first on 01/10/26',
  ]);
  rows = rows.filter((r) => r.submissionId !== 'event');
  await refresh();
  await expect(menu).toContainText(
    'Collected 2x by Alice Smith first on 01/10/26',
  );
  rows = rows.filter((r) => r.submissionId !== 'regular-1');
  await refresh();
  await expect(menu).not.toContainText('Collected 2x');
  await expect(menu).toContainText('Collected by ALICE__SMITH on 01/10/26');
  await expect(slot.locator('.item-obtain-count')).toHaveText('2');
  await page
    .getByRole('button', { name: 'Hardcore worlds', exact: true })
    .click();
  await slot.click();
  await expect(menu).toContainText('Collected by Alice Smith on 02/09/26');
  await expect(menu).not.toContainText('first on');
  await expect(menu).not.toContainText('Bob');
});
test('manual repeat rejection is a saved rejected result with the policy reason', async ({
  page,
}) => {
  const { admin } = await mockApi(page);
  const signal = new AbortController().signal;
  const item = (await admin.catalog(signal)).items.find(
    (i) => i.name === 'Virtus mask',
  )!;
  await admin.addManual(
    {
      itemId: item.id,
      collectorName: 'Alice Smith',
      collectedOn: '2026-10-01',
      hardcore: false,
      collectionType: 'regular',
      approve: true,
    },
    crypto.randomUUID(),
    'test-admin',
    signal,
  );
  const filters = (await admin.queue('pending', undefined, signal)).filters!;
  await admin.saveSubmissionFilters(
    false,
    filters.revision,
    'test-admin',
    signal,
    'reject',
  );
  await page.goto('/admin/submissions');
  await page
    .getByRole('button', { name: 'Add manual submission', exact: true })
    .click();
  const form = page
    .locator('form')
    .filter({ has: page.locator('.manual-submission-columns') });
  await form.getByLabel('Collector name', { exact: true }).fill('alice_smith');
  await form
    .getByLabel('Canonical item', { exact: true })
    .selectOption(String(item.id));
  await form
    .getByRole('button', { name: 'Create manual submission', exact: true })
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Repeat-collector policy:' }),
  ).toBeVisible();
  await page
    .getByRole('button', {
      name: 'Review alice_smith · Virtus mask',
      exact: true,
    })
    .click();
  await expect(page.locator('.submission-editor')).toContainText(
    'Repeat-collector policy:',
  );
});
