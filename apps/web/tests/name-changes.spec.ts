import { test, expect, type Page } from './test.ts';
import { mockApi } from './mock-api.ts';
import {
  normalizePlayerName,
  collectorNamesChanged,
  type CollectorIdentity,
  type CollectorNamePreview,
  type CollectorNameResult,
} from '@clog/domain';
const alice = '00000000-0000-4000-8000-000000000001',
  bob = '00000000-0000-4000-8000-000000000002';
async function fixture(page: Page) {
  const { admin } = await mockApi(page);
  const people = new Map<string, CollectorIdentity>([
    [alice, { id: alice, name: 'Alice', version: '1', historyVersion: '3' }],
    [bob, { id: bob, name: 'Bob', version: '1', historyVersion: '1' }],
  ]);
  const aliases = new Map<string, string>(),
    previews = new Map<string, CollectorNamePreview>(),
    receipts = new Map<string, CollectorNameResult>();
  const state = {
    people,
    previews,
    requests: [] as { token: string; key: string }[],
    previewCount: 0,
    failApply: '' as '' | 'conflict' | 'uncertain',
    failSearch: false,
    expire: false,
    wait: undefined as Promise<void> | undefined,
  };
  await page.route('**/api/v1/admin/collectors?*', (route) => {
    if (state.failSearch) {
      state.failSearch = false;
      return route.fulfill({ status: 503, json: {} });
    }
    const q = normalizePlayerName(
      new URL(route.request().url()).searchParams.get('search') ?? '',
    );
    return route.fulfill({
      json: {
        collectors: [...people.values()].filter((r) =>
          normalizePlayerName(r.name).startsWith(q),
        ),
        hasMore: false,
      },
    });
  });
  await page.route(
    '**/api/v1/admin/collector-name-changes/preview',
    (route) => {
      state.previewCount++;
      if (state.expire) return route.fulfill({ status: 401, json: {} });
      const fields = route.request().postDataJSON() as {
          sourceId: string;
          newName: string;
        },
        source = people.get(fields.sourceId)!;
      const target =
        [...people.values()].find(
          (r) =>
            r.id !== source.id &&
            normalizePlayerName(r.name) === normalizePlayerName(fields.newName),
        ) ?? null;
      const value: CollectorNamePreview = {
        token: crypto.randomUUID(),
        operation: target
          ? 'merge'
          : source.name === fields.newName
            ? 'noop'
            : 'rename',
        source: { ...source },
        target: target ? { ...target } : null,
        newName: target?.name ?? fields.newName,
        counts: { pending: 0, approved: 1, rejected: 0, revoked: 0 },
      };
      previews.set(value.token, value);
      return route.fulfill({ json: value });
    },
  );
  await page.route(
    '**/api/v1/admin/collector-name-changes/apply',
    async (route) => {
      const { token } = route.request().postDataJSON() as { token: string },
        key = route.request().headers()['idempotency-key']!;
      state.requests.push({ token, key });
      expect(route.request().headers()['x-csrf-token']).toBeTruthy();
      if (state.wait) await state.wait;
      const old = receipts.get(key);
      if (old) return route.fulfill({ json: old });
      const p = previews.get(token)!;
      if (state.failApply === 'conflict') {
        state.failApply = '';
        people.get(bob)!.name = p.newName;
        return route.fulfill({
          status: 409,
          json: { error: collectorNamesChanged },
        });
      }
      const result: CollectorNameResult = {
        operationId: crypto.randomUUID(),
        operation: p.operation as 'rename' | 'merge',
        sourceId: p.source.id,
        targetId: p.target?.id ?? p.source.id,
        originalName: p.source.name,
        newName: p.newName,
        counts: p.counts,
      };
      if (result.operation === 'merge') {
        people.delete(result.sourceId);
        aliases.set(result.sourceId, result.targetId);
      } else people.get(result.sourceId)!.name = result.newName;
      receipts.set(key, result);
      if (state.failApply === 'uncertain') {
        state.failApply = '';
        return route.fulfill({ status: 503, json: {} });
      }
      return route.fulfill({ json: result });
    },
  );
  await page.route('**/api/v1/catalog', (route) =>
    route.fulfill({
      json: {
        revision: 'name-catalog',
        items: [
          { id: 1, name: 'Name trophy', iconPath: '/catalog/default.webp' },
        ],
        pages: [{ id: 'a', name: 'Page A', category: 'bosses', itemIds: [1] }],
      },
    }),
  );
  await page.route('**/api/v1/collections', (route) =>
    route.fulfill({
      json: {
        revision: 'names-' + [...people.values()].map((p) => p.name).join('-'),
        repeatCollectorPolicy: 'merge',
        credits: [alice, bob].map((id, index) => ({
          submissionId: id,
          itemId: 1,
          collectorName: people.get(aliases.get(id) ?? id)!.name,
          collectedOn: index ? '2026-10-02' : '2026-10-01',
          hardcore: false,
          collectionType: 'regular',
        })),
      },
    }),
  );
  return { state, admin };
}
async function select(page: Page, name: string) {
  const panel = page.locator('.name-changes-panel');
  await panel.getByLabel('Search collectors', { exact: true }).fill('Ali');
  const source = panel.getByRole('combobox', {
    name: 'Existing collector',
    exact: true,
  });
  await expect(
    source.getByRole('option', { name: 'Alice', exact: true }),
  ).toHaveCount(1);
  await source.selectOption(alice);
  await panel.getByLabel('New name', { exact: true }).fill(name);
  return panel;
}
test('expired permission removes the name-change draft without applying it', async ({
  page,
}) => {
  const { state } = await fixture(page);
  await page.goto('/admin/submissions');
  const panel = await select(page, 'Alice New');
  state.expire = true;
  await panel.getByRole('button', { name: 'Change name', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Admin session expired', exact: true }),
  ).toBeVisible();
  await expect(panel).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(state.requests).toHaveLength(0);
});
test('Name Changes is separate; exact rename preview is inert, cancels safely and restores focus before explicit apply', async ({
  page,
}, info) => {
  const { state } = await fixture(page);
  await page.goto('/admin/submissions');
  const panel = await select(page, 'Alice New'),
    button = panel
      .locator('form')
      .getByRole('button', { name: 'Change name', exact: true });
  expect(
    await panel.evaluate((e) =>
      e.previousElementSibling?.classList.contains('duplicate-handling-panel'),
    ),
  ).toBe(true);
  await button.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', {
      name: 'Name Changes',
      exact: true,
    }),
    cancel = dialog.getByRole('button', { name: 'Cancel', exact: true });
  await expect(dialog.locator('.collector-name-confirmation')).toHaveText(
    'Are you sure you want to change user Alice to Alice New?\nThis action cannot be reversed.',
  );
  await expect(cancel).toBeFocused();
  expect(state.requests).toHaveLength(0);
  await page.keyboard.press('Shift+Tab');
  await expect(
    dialog.getByRole('button', { name: 'Change name', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(cancel).toBeFocused();
  expect(
    await button.evaluate((el) => {
      el.focus();
      return document.activeElement === el;
    }),
  ).toBe(false);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(button).toBeFocused();
  expect(state.requests).toHaveLength(0);
  await button.click();
  await cancel.click();
  await expect(button).toBeFocused();
  expect(state.requests).toHaveLength(0);
  await button.click();
  await dialog.screenshot({ path: info.outputPath('rename-desktop.png') });
  let release!: () => void;
  state.wait = new Promise<void>((r) => {
    release = r;
  });
  await dialog
    .getByRole('button', { name: 'Change name', exact: true })
    .evaluate((el) => {
      el.click();
      el.click();
    });
  await expect(cancel).toBeDisabled();
  await expect.poll(() => state.requests.length).toBe(1);
  release();
  await expect(dialog).toHaveCount(0);
  await expect(panel.getByRole('status')).toHaveText(
    'Changed Alice to Alice New.',
  );
  await expect(button).toBeFocused();
  await page.goto('/');
  await page.getByRole('button', { name: /^Name trophy: collected/ }).click();
  await expect(page.getByRole('tooltip')).toContainText(
    'Collected by Alice New on 01/10/26',
  );
});
test('normalized existing target uses exact merge confirmation and grouped obtains remain visible at 320px', async ({
  page,
}, info) => {
  await fixture(page);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/admin/submissions');
  const panel = await select(page, ' bOB ');
  await panel.getByRole('button', { name: 'Change name', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Name Changes' });
  await expect(dialog.locator('.collector-name-confirmation')).toHaveText(
    'Are you sure you want to merge user Alice to existing Bob?\nThis action cannot be reversed.',
  );
  const box = (await dialog.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  await dialog.screenshot({ path: info.outputPath('merge-mobile.png') });
  await dialog
    .getByRole('button', { name: 'Merge users', exact: true })
    .click();
  await expect(panel.getByRole('status')).toHaveText('Merged Alice into Bob.');
  await page.goto('/');
  await page.getByRole('button', { name: /^Name trophy: collected/ }).click();
  await expect(page.getByRole('tooltip')).toContainText(
    'Collected 2x by Bob first on 01/10/26',
  );
});
test('stale preview requires fresh confirmation and never silently changes a rename into a merge', async ({
  page,
}) => {
  const { state } = await fixture(page);
  state.failApply = 'conflict';
  await page.goto('/admin/submissions');
  const panel = await select(page, 'New Target');
  await panel.getByRole('button', { name: 'Change name', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Name Changes' });
  await dialog
    .getByRole('button', { name: 'Change name', exact: true })
    .click();
  await expect(dialog.getByRole('alert')).toContainText(
    'Preview the operation again',
  );
  await expect(
    dialog.getByRole('button', { name: 'Merge users', exact: true }),
  ).toHaveCount(0);
  expect(state.requests).toHaveLength(1);
  await dialog
    .getByRole('button', { name: 'Preview again', exact: true })
    .click();
  await expect(dialog.locator('.collector-name-confirmation')).toHaveText(
    'Are you sure you want to merge user Alice to existing New Target?\nThis action cannot be reversed.',
  );
  expect(state.requests).toHaveLength(1);
  await dialog
    .getByRole('button', { name: 'Merge users', exact: true })
    .click();
  await expect(panel.getByRole('status')).toHaveText(
    'Merged Alice into New Target.',
  );
  expect(state.requests).toHaveLength(2);
});
test('uncertain committed save retains the same token/key through dismissal and recovers its durable result', async ({
  page,
}) => {
  const { state } = await fixture(page);
  state.failApply = 'uncertain';
  await page.goto('/admin/submissions');
  const panel = await select(page, 'Alice New');
  await panel.getByRole('button', { name: 'Change name', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Name Changes' });
  await dialog
    .getByRole('button', { name: 'Change name', exact: true })
    .click();
  await expect(dialog.getByRole('alert')).toHaveText(
    'The result is not confirmed. Retry confirmation to recover the saved result.',
  );
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(panel.getByLabel('New name', { exact: true })).toBeDisabled();
  await panel
    .getByRole('button', { name: 'Retry confirmation', exact: true })
    .click();
  await dialog
    .getByRole('button', { name: 'Retry confirmation', exact: true })
    .click();
  await expect(panel.getByRole('status')).toHaveText(
    'Changed Alice to Alice New.',
  );
  expect(state.previewCount).toBe(1);
  expect(state.requests).toHaveLength(2);
  expect(state.requests[0]).toEqual(state.requests[1]);
});
test('search recovery, no-op feedback, escaped names and moderator permissions remain safe', async ({
  page,
}) => {
  const { state, admin } = await fixture(page);
  state.failSearch = true;
  await page.goto('/admin/submissions');
  const panel = page.locator('.name-changes-panel');
  await panel.getByLabel('Search collectors', { exact: true }).fill('Ali');
  await expect(panel.getByRole('alert')).toBeVisible();
  await panel
    .getByRole('button', { name: 'Reload collectors', exact: true })
    .click();
  await expect(
    panel
      .getByRole('combobox', { name: 'Existing collector', exact: true })
      .getByRole('option', { name: 'Alice', exact: true }),
  ).toHaveCount(1);
  await panel
    .getByRole('combobox', { name: 'Existing collector', exact: true })
    .selectOption(alice);
  await panel.getByLabel('New name', { exact: true }).fill('___');
  const button = panel.getByRole('button', {
    name: 'Change name',
    exact: true,
  });
  await expect(button).toBeDisabled();
  await panel.getByLabel('New name', { exact: true }).fill('Alice');
  await button.click();
  await expect(panel.getByRole('status')).toHaveText(
    'This collector already uses that name. No changes were made.',
  );
  await expect(page.getByRole('dialog')).toHaveCount(0);
  state.people.get(alice)!.name = '<img src=x>';
  await panel.getByLabel('New name', { exact: true }).fill('A&B');
  await button.click();
  const dialog = page.getByRole('dialog', { name: 'Name Changes' });
  await expect(dialog.locator('.collector-name-confirmation')).toContainText(
    'change user <img src=x> to A&B?',
  );
  await expect(dialog.locator('img')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  const session = await admin.session(new AbortController().signal);
  await page.route('**/api/v1/auth/session', (route) =>
    route.fulfill({
      json: { authenticated: true, ...session, role: 'moderator' },
    }),
  );
  await panel.getByLabel('New name', { exact: true }).fill('');
  await page.reload();
  await expect(panel).toContainText(
    'Only the administrator can change collector names.',
  );
  await expect(panel.getByLabel('New name', { exact: true })).toHaveCount(0);
  expect(state.requests).toHaveLength(0);
});
