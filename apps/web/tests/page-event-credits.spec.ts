import { test, expect } from './test.ts';
import { mockApi } from './mock-api.ts';
import { adminFixtures } from './admin-fixtures.ts';
import type { Credit } from '../src/model.ts';

test('a failed history chunk preserves the log and can be retried by reloading', async ({
  page,
}) => {
  const { admin } = await mockApi(page);
  const catalog = await admin.catalog(new AbortController().signal);
  const item = catalog.items.find((row) => row.name === 'Virtus mask')!;
  const target = catalog.pages.find((row) => row.itemIds.includes(item.id))!;
  await page.route('**/api/v1/collections', (route) =>
    route.fulfill({
      json: {
        revision: 'history-load',
        credits: [
          {
            submissionId: 'history',
            itemId: item.id,
            collectorName: 'Collector',
            collectedOn: '2026-10-20',
            hardcore: false,
            collectionType: 'regular',
            eventPageId: null,
          },
        ],
      },
    }),
  );
  await page.route('**/src/ItemMenu.tsx*', (route) => route.abort());
  await page.goto('/?page=' + encodeURIComponent(target.id));
  const slot = page.locator('.item-slot--collected').first();
  await slot.click();
  const failure = page
    .getByRole('alert')
    .filter({ hasText: 'Collection history could not be loaded' });
  await expect(failure).toBeVisible();
  await expect(slot).toBeVisible();
  await page.unroute('**/src/ItemMenu.tsx*');
  await failure.getByRole('button', { name: 'Retry', exact: true }).click();
  await slot.click();
  await expect(page.getByRole('tooltip')).toBeVisible();
});

test('shared item Event history and highlighting follow the selected page, keeping Regular history and canonical obtains', async ({
  page,
}, info) => {
  await mockApi(page);
  const catalog = {
    revision: 'page-events',
    items: [
      { id: 1, name: 'Shared trophy', iconPath: '/catalog/default.webp' },
    ],
    pages: [
      { id: 'a', name: 'Page A', category: 'bosses', itemIds: [1] },
      { id: 'b', name: 'Page B', category: 'bosses', itemIds: [1] },
    ],
  };
  let rows: Omit<Credit, 'status'>[] = [
    {
      submissionId: 'event-a',
      itemId: 1,
      collectorName: 'Alice on A',
      collectedOn: '2026-10-20',
      hardcore: false,
      collectionType: 'event',
      eventPageId: 'a',
    },
  ];
  await page.route('**/api/v1/catalog', (route) =>
    route.fulfill({ json: catalog }),
  );
  await page.route('**/api/v1/collections', (route) =>
    route.fulfill({
      json: { revision: 'credits-' + rows.length, credits: rows },
    }),
  );
  await page.goto('/');
  const slot = page.getByRole('button', { name: /^Shared trophy: collected/ }),
    menu = page.getByRole('tooltip');
  await expect(slot).toHaveClass(/item-slot--event/);
  await slot.click();
  await expect(menu.locator('.item-menu__event')).toContainText('Alice on A');
  await expect(menu.locator('.item-menu__regular')).toHaveCount(0);
  await page.getByRole('button', { name: 'Page B', exact: true }).click();
  await expect(menu).toHaveCount(0);
  await expect(slot).not.toHaveClass(/item-slot--event/);
  await slot.click();
  await expect(menu.locator('.item-menu__event')).toHaveCount(0);
  await expect(menu.locator('.item-menu__regular')).toContainText('Alice on A');
  await expect(menu.locator('.item-menu__regular')).toContainText('20/10/26');
  await expect(menu).not.toContainText('No Event credit for this page');
  await expect(slot.locator('.item-obtain-count')).toHaveCount(0);
  await expect(slot).toHaveAccessibleName('Shared trophy: collected');
  rows.push(
    {
      submissionId: 'regular',
      itemId: 1,
      collectorName: 'Regular collector',
      collectedOn: '2026-10-01',
      hardcore: false,
      collectionType: 'regular',
      eventPageId: null,
    },
    {
      submissionId: 'event-b',
      itemId: 1,
      collectorName: 'Bob on B',
      collectedOn: '2026-10-21',
      hardcore: false,
      collectionType: 'event',
      eventPageId: 'b',
    },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Page B', exact: true }).click();
  await expect(slot).toHaveClass(/item-slot--event/);
  await slot.click();
  await expect(menu.locator('.item-menu__event')).toContainText('Bob on B');
  await expect(menu.locator('.item-menu__event')).toContainText('21/10/26');
  await expect(menu.locator('.item-menu__event')).not.toContainText(
    'Alice on A',
  );
  await expect(menu.locator('.item-menu__regular p')).toHaveText([
    'Collected by Regular collector on 01/10/26',
    'Collected by Alice on A on 20/10/26',
  ]);
  await expect(slot.locator('.item-obtain-count')).toHaveText('3');
  await page.screenshot({ path: info.outputPath('event-page-b-desktop.png') });
  await page.setViewportSize({ width: 320, height: 900 });
  await page.getByRole('button', { name: 'Page A', exact: true }).click();
  await slot.click();
  await expect(menu.locator('.item-menu__event')).toContainText('Alice on A');
  await expect(menu.locator('.item-menu__event')).not.toContainText('Bob on B');
  await expect(menu.locator('.item-menu__regular')).toContainText('Bob on B');
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  await page.screenshot({ path: info.outputPath('event-page-a-mobile.png') });
  rows = rows.filter((r) => r.submissionId !== 'event-a');
  await page.reload();
  await page.getByRole('button', { name: 'Page A', exact: true }).click();
  await expect(slot).not.toHaveClass(/item-slot--event/);
  await slot.click();
  await expect(menu).not.toContainText('Alice on A');
  await expect(menu.locator('.item-menu__event')).toHaveCount(0);
  await expect(menu.locator('.item-menu__regular')).toContainText('Bob on B');
  await expect(menu).toContainText('Regular collector');
  await expect(slot.locator('.item-obtain-count')).toHaveText('2');
});

test('upgrade review never guesses a shared legacy page, survives cancellation and retries an uncertain choice exactly', async ({
  page,
}, info) => {
  await mockApi(page);
  const shared = {
    submissionId: '00000000-0000-4000-8000-000000000001',
    version: 1,
    itemId: 1,
    itemName: 'Shared legacy trophy',
    collectorName: 'Original Event collector',
    collectedOn: '2026-10-20',
    pages: [
      { id: 'a', name: 'Page A', available: true },
      { id: 'b', name: 'Page B', available: true },
    ],
    eligiblePageIds: ['a'],
    receivedAt: '2026-10-20T12:00:00Z',
  };
  const missing = {
    ...shared,
    submissionId: '00000000-0000-4000-8000-000000000002',
    itemId: 2,
    itemName: 'Missing membership trophy',
    pages: [],
    eligiblePageIds: [],
  };
  let assigned = false;
  const calls: { body: unknown; key: string | undefined }[] = [];
  await page.route('**/api/v1/admin/event-page-assignments', async (route) => {
    const req = route.request();
    if (req.method() === 'GET')
      return route.fulfill({
        json: {
          revision: 'event-pages-1-' + (assigned ? 'b' : 'a').repeat(64),
          total: assigned ? 1 : 2,
          credits: assigned ? [missing] : [shared, missing],
        },
      });
    expect(req.headers()['x-csrf-token']).toBe('test-admin');
    calls.push({
      body: req.postDataJSON(),
      key: req.headers()['idempotency-key'],
    });
    assigned = true;
    return route.fulfill(
      calls.length === 1
        ? { status: 503, json: {} }
        : { json: { assignedIds: [shared.submissionId] } },
    );
  });
  await page.goto('/admin/submissions');
  const dialog = page.getByRole('dialog', {
    name: 'Assign existing Event collections to pages',
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole('combobox', { name: 'Event page', exact: true }),
  ).toHaveValue('');
  await expect(dialog).toContainText('Original Event collector');
  await expect(dialog).toContainText('20/10/26');
  await expect(dialog).toContainText('Originally eligible pages: a');
  await expect(dialog).toContainText('Repair its catalog membership');
  await dialog
    .getByRole('button', { name: 'Choose later', exact: true })
    .click();
  expect(calls).toHaveLength(0);
  await page.reload();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Review Event page assignments', exact: true })
    .click();
  await dialog
    .getByRole('combobox', { name: 'Event page', exact: true })
    .selectOption('b');
  await page.setViewportSize({ width: 320, height: 900 });
  expect(await dialog.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(
    true,
  );
  await page.screenshot({
    path: info.outputPath('legacy-event-page-mobile.png'),
  });
  await dialog
    .getByRole('button', { name: 'Save page assignments', exact: true })
    .click();
  await expect(
    dialog.getByRole('button', { name: 'Retry page assignments', exact: true }),
  ).toBeEnabled();
  await expect(
    dialog.getByRole('combobox', { name: 'Event page', exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole('button', { name: 'Choose later', exact: true }),
  ).toBeDisabled();
  await dialog
    .getByRole('button', { name: 'Retry page assignments', exact: true })
    .click();
  await expect(dialog).not.toContainText('Shared legacy trophy');
  await expect(dialog).toContainText('Missing membership trophy');
  expect(calls).toHaveLength(2);
  expect(calls[1]).toEqual(calls[0]);
  expect(calls[0]!.body).toMatchObject({
    assignments: [
      {
        submissionId: shared.submissionId,
        expectedVersion: 1,
        eventPageId: 'b',
      },
    ],
  });
  await expect(
    dialog.getByRole('button', { name: 'Save page assignments', exact: true }),
  ).toBeDisabled();
  await page.reload();
  await expect(dialog).toContainText('Missing membership trophy');
  await expect(dialog).not.toContainText('Shared legacy trophy');
});

test('pending shared Event review requires one page and shows the occupied page without occupying another', async ({
  page,
}) => {
  const { admin } = await mockApi(page);
  const signal = new AbortController().signal,
    catalog = await admin.catalog(signal),
    item = catalog.items.find((i) => i.name === 'Virtus mask')!;
  const pages = catalog.pages.filter((p) => p.itemIds.includes(item.id));
  expect(pages.length).toBeGreaterThan(1);
  const fields = {
    itemId: item.id,
    collectorName: 'Existing page collector',
    collectedOn: '2026-10-20',
    collectionType: 'event' as const,
    hardcore: false,
    approve: true,
    eventPageId: pages[0]!.id,
  };
  await admin.addManual(fields, crypto.randomUUID(), 'test-admin', signal);
  const pending = await admin.addManual(
    {
      itemId: item.id,
      collectorName: 'Pending page collector',
      collectedOn: '2026-10-21',
      collectionType: 'event',
      hardcore: false,
      approve: false,
    },
    crypto.randomUUID(),
    'test-admin',
    signal,
  );
  await page.goto('/admin/submissions');
  await page
    .getByRole('button', {
      name: 'Review Pending page collector · Virtus mask',
      exact: true,
    })
    .click();
  const editor = page.locator('.submission-editor'),
    choice = editor.getByRole('combobox', { name: 'Event page', exact: true });
  await expect(choice).toHaveValue('');
  await expect(
    editor.getByRole('option', {
      name: pages[0]!.name + ' — Event already collected',
      exact: true,
    }),
  ).toHaveCount(1);
  await choice.selectOption(pages[1]!.id);
  await editor
    .getByRole('checkbox', { name: /^I verified this manual claim/ })
    .check();
  const write = page.waitForRequest(
    (r) =>
      r.method() === 'POST' && r.url().endsWith('/' + pending.id + '/approve'),
  );
  await editor
    .getByRole('button', { name: 'Approve submission', exact: true })
    .click();
  expect((await write).postDataJSON().flags.eventPageId).toBe(pages[1]!.id);
  await expect
    .poll(
      async () => (await admin.detail(pending.id, signal)).submission.status,
    )
    .toBe('approved');
  const saved = await admin.detail(pending.id, signal);
  expect(saved.submission.eventPageId).toBe(pages[1]!.id);
});

test('ambiguous frozen eligibility still requires a choice after another current membership disappears', async ({
  page,
}) => {
  const { admin } = await mockApi(page);
  const signal = new AbortController().signal;
  const catalog = await admin.catalog(signal);
  const queue = await admin.queue('pending', undefined, signal);
  const row = queue.submissions.find(
    (r) =>
      !r.hardcore &&
      catalog.pages.filter((p) => p.itemIds.includes(r.itemId!)).length > 1,
  )!;
  const pages = catalog.pages.filter((p) => p.itemIds.includes(row.itemId!));
  const detail = await admin.detail(row.id, signal);
  await page.route('**/api/v1/admin/catalog', (route) =>
    route.fulfill({
      json: {
        ...catalog,
        pages: catalog.pages.map((p) =>
          p.id === pages[0]!.id
            ? p
            : { ...p, itemIds: p.itemIds.filter((id) => id !== row.itemId) },
        ),
      },
    }),
  );
  await page.route('**/api/v1/admin/submissions/' + row.id, (route) =>
    route.fulfill({
      json: {
        ...detail,
        submission: {
          ...detail.submission,
          collectionType: 'event',
          collectionReason: 'timed_event',
          eventPageId: null,
          eligibleEventPageIds: pages.map((p) => p.id),
        },
      },
    }),
  );
  await page.goto('/admin/submissions');
  await page
    .getByRole('button', {
      name: `Review ${row.collectorName} · ${catalog.items.find((i) => i.id === row.itemId)!.name}`,
      exact: true,
    })
    .click();
  const editor = page.locator('.submission-editor');
  const choice = editor.getByRole('combobox', {
    name: 'Event page',
    exact: true,
  });
  await expect(choice).toHaveValue('');
  const acknowledged = editor.getByRole('checkbox', { name: /^I checked/ });
  await acknowledged.check();
  await expect(
    editor.getByRole('button', { name: 'Approve submission', exact: true }),
  ).toBeDisabled();
  await choice.selectOption(pages[0]!.id);
  await acknowledged.check();
  await expect(
    editor.getByRole('button', { name: 'Approve submission', exact: true }),
  ).toBeEnabled();
});

test('RuneLite submissions keeps one retryable Event assignment notice through session refreshes', async ({
  page,
}) => {
  await mockApi(page);
  const fixture = await adminFixtures();
  let displayName = fixture.session.displayName;
  await page.route('**/api/v1/auth/session', (route) =>
    route.fulfill({ json: { ...fixture.session, displayName } }),
  );
  let reads = 0,
    available = false;
  await page.route('**/api/v1/admin/event-page-assignments', (route) => {
    reads++;
    return route.fulfill(
      available
        ? { json: fixture.eventPageAssignments }
        : { status: 503, json: {} },
    );
  });
  await page.clock.install();
  await page.goto('/admin/runelite');
  const notice = page.getByRole('heading', {
    name: 'Assign existing Event collections to pages',
    exact: true,
  });
  const settings = page.getByLabel('In-game clan name 1', {
    exact: true,
  });
  await expect(settings).toBeVisible();
  await expect(notice.first()).toBeVisible();
  for (const refresh of [1, 2, 3]) {
    displayName = `Administrator ${refresh}`;
    await Promise.all([
      page.waitForResponse('**/api/v1/auth/session'),
      page.clock.fastForward(25000),
    ]);
    await expect(page.locator('.admin-account')).toContainText(displayName);
    await expect(
      page.getByRole('complementary', { name: 'Page navigation' }),
    ).toHaveCount(0);
    await expect(notice).toHaveCount(1);
    expect(reads).toBe(1);
  }
  available = true;
  await page.getByRole('button', { name: 'Reload page assignments' }).click();
  await expect(notice).toHaveCount(0);
  await expect(settings).toBeVisible();
  expect(reads).toBe(2);
});

test('fresh installs show no upgrade prompt and moderators make no migration review reads', async ({
  page,
  context,
}) => {
  await mockApi(page);
  const [assignments] = await Promise.all([
    page.waitForResponse('**/api/v1/admin/event-page-assignments'),
    page.goto('/admin/submissions'),
  ]);
  expect(assignments.ok()).toBe(true);
  await expect(
    page.getByRole('heading', { name: 'Submissions', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: 'Review Event page assignments',
      exact: true,
    }),
  ).toHaveCount(0);
  await page.close();

  // Isolate the moderator's requests from any outstanding administrator reads.
  const moderator = await context.newPage();
  await mockApi(moderator);
  const fixture = await adminFixtures();
  let privateReads = 0;
  await moderator.route('**/api/v1/auth/session', (route) =>
    route.fulfill({ json: { ...fixture.session, role: 'moderator' } }),
  );
  await moderator.route('**/api/v1/admin/event-page-assignments', (route) => {
    privateReads++;
    return route.fulfill({ status: 403, json: {} });
  });
  await moderator.goto('/admin/submissions');
  await expect(
    moderator.getByRole('heading', { name: 'Submissions', exact: true }),
  ).toBeVisible();
  await expect(
    moderator.getByRole('button', {
      name: 'Review Event page assignments',
      exact: true,
    }),
  ).toHaveCount(0);
  expect(privateReads).toBe(0);
});
