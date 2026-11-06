import { expect, test, type Page } from './test.ts';
import { adminFixtures } from './admin-fixtures.ts';
import { defaultBranding } from '../src/branding.ts';
import { defaultRuneLiteRules } from '@clog/domain';

async function mockAccounts(
  page: Page,
  role: 'admin' | 'moderator' = 'admin',
  firstLogin = false,
) {
  const fixture = await adminFixtures();
  const state = {
    authenticated: false,
    username: role === 'admin' ? 'admin' : 'reviewer',
    mustChangePassword: firstLogin,
    csrfToken: 'before-change',
    privateReads: 0,
    submitted: {} as Record<string, unknown>,
    accounts: [
      {
        id: 'admin-id',
        username: 'admin',
        role: 'admin',
        mustChangePassword: false,
      },
    ],
  };
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    const session = () => ({
      ...fixture.session,
      username: state.username,
      displayName: state.username,
      role,
      mustChangePassword: state.mustChangePassword,
      csrfToken: state.csrfToken,
    });
    if (path === '/api/v1/auth/session')
      return route.fulfill({
        json: state.authenticated ? session() : { authenticated: false },
      });
    if (path === '/api/v1/auth/login') {
      state.submitted = route.request().postDataJSON();
      state.authenticated = true;
      return route.fulfill({ json: session() });
    }
    if (path === '/api/v1/auth/account') {
      const fields = route.request().postDataJSON();
      expect(route.request().headers()['x-csrf-token']).toBe(state.csrfToken);
      state.submitted = fields;
      if (fields.currentPassword === 'incorrect')
        return route.fulfill({
          status: 400,
          json: { error: 'The current password is incorrect.' },
        });
      state.username = fields.username;
      if (fields.newPassword) state.mustChangePassword = false;
      state.csrfToken = 'after-change';
      return route.fulfill({ json: session() });
    }
    if (path === '/api/v1/auth/logout') {
      state.authenticated = false;
      return route.fulfill({ status: 204 });
    }
    if (path.startsWith('/api/v1/admin/')) state.privateReads++;
    if (path === '/api/v1/admin/event-page-assignments')
      return route.fulfill({ json: fixture.eventPageAssignments });
    if (path === '/api/v1/admin/catalog-updates')
      return route.fulfill({ json: fixture.catalogUpdates });
    if (path === '/api/v1/admin/accounts') {
      if (method === 'POST') {
        const fields = route.request().postDataJSON();
        expect(route.request().headers()['x-csrf-token']).toBe(state.csrfToken);
        state.submitted = fields;
        if (
          state.accounts.some(
            (account) =>
              account.username.toLowerCase() === fields.username.toLowerCase(),
          )
        )
          return route.fulfill({
            status: 409,
            json: { error: 'That username is already in use.' },
          });
        const account = {
          id: 'mod-id',
          username: fields.username,
          role: 'moderator',
          mustChangePassword: true,
        };
        state.accounts.push(account);
        return route.fulfill({ status: 201, json: account });
      }
      return route.fulfill({ json: { accounts: state.accounts } });
    }
    if (path === '/api/v1/branding' || path === '/api/v1/admin/branding')
      return route.fulfill({ json: defaultBranding });
    if (path === '/api/v1/admin/clan-api-key')
      return route.fulfill({
        json: {
          revision: 'clan-key-1',
          enabled: true,
          key: 'mock-test-clan-key',
        },
      });
    if (path === '/api/v1/admin/settings')
      return route.fulfill({
        json: {
          revision: 'settings-1',
          clanName: 'Example clan',
          hardcoreEnabled: false,
        },
      });
    if (path === '/api/v1/admin/runelite-settings')
      return route.fulfill({
        json: { revision: 'runelite-1', ...defaultRuneLiteRules('Clan name') },
      });
    if (path === '/api/v1/admin/catalog')
      return route.fulfill({ json: fixture.catalog });
    if (path === '/api/v1/admin/submissions')
      return route.fulfill({ json: fixture.pending });
    if (path === '/api/v1/admin/schedules')
      return route.fulfill({
        json: { revision: 'schedules-1', enabled: false, schedules: [] },
      });
    if (path === '/api/v1/admin/xp/imports')
      return route.fulfill({
        json: {
          imports: [],
          revision: 'xp-history-1',
          pageCursor: 'xp-first',
          nextCursor: null,
        },
      });
    return route.fulfill({ status: 404, json: {} });
  });
  return state;
}
async function signIn(page: Page, username = 'admin', password = 'admin') {
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

test('first login blocks private tools until a new password is saved, including direct XP navigation', async ({
  page,
}) => {
  const state = await mockAccounts(page, 'admin', true);
  await page.goto('/admin/xp');
  await signIn(page);
  await expect(
    page.getByRole('heading', { name: 'Change your password to continue' }),
  ).toBeVisible();
  expect(state.submitted).toEqual({ username: 'admin', password: 'admin' });
  expect(state.privateReads).toBe(0);
  await page.screenshot({
    path: test.info().outputPath('first-login.png'),
    fullPage: true,
  });
  await expect(page.getByLabel('Enable hardcore worlds')).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'Moderator accounts' }),
  ).toHaveCount(0);
  await expect(page.getByLabel('Wise Old Man competition link')).toHaveCount(0);
  await page.getByLabel('Current password', { exact: true }).fill('admin');
  await page
    .getByLabel('New password', { exact: true })
    .fill('new-owner-password');
  await page.getByLabel('Confirm new password').fill('different-password');
  await page.getByRole('button', { name: 'Save account' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'The new passwords do not match.',
  );
  await page.getByLabel('Confirm new password').fill('new-owner-password');
  await page.getByRole('button', { name: 'Save account' }).click();
  await expect(page.getByLabel('Wise Old Man competition link')).toBeVisible();
  expect(state.submitted).toEqual({
    username: 'admin',
    currentPassword: 'admin',
    newPassword: 'new-owner-password',
  });
  await expect(
    page.getByRole('link', { name: 'Moderator accounts' }),
  ).toBeVisible();
});

test('administrator creates moderators and sees duplicate username errors', async ({
  page,
}) => {
  const state = await mockAccounts(page);
  await page.goto('/admin/accounts');
  await signIn(page, 'admin', 'owner-password');
  await expect(
    page.getByText('No moderator accounts have been created.'),
  ).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath('moderator-accounts.png'),
    fullPage: true,
  });
  await page.getByLabel('Moderator username').fill('clan-mod');
  await page
    .getByLabel('Temporary password')
    .fill('temporary-moderator-password');
  await page.getByRole('button', { name: 'Create moderator' }).click();
  await expect(page.getByRole('status')).toHaveText(
    'Moderator clan-mod created.',
  );
  expect(state.submitted).toEqual({
    username: 'clan-mod',
    password: 'temporary-moderator-password',
  });
  await expect(page.getByLabel('Temporary password')).toHaveValue('');
  await expect(
    page.getByText(/clan-mod.*moderator.*Password change required/),
  ).toBeVisible();
  await page.getByLabel('Moderator username').fill('CLAN-MOD');
  await page.getByLabel('Temporary password').fill('another-temp-password');
  await page.getByRole('button', { name: 'Create moderator' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'That username is already in use.',
  );
});

test('moderators retain review tools, have no owner controls and can update their credentials', async ({
  page,
}) => {
  const state = await mockAccounts(page, 'moderator');
  await page.goto('/admin');
  await signIn(page, 'reviewer', 'reviewer-password');
  await expect(
    page.getByRole('button', { name: 'Add manual submission' }),
  ).toBeVisible();
  await expect(
    page.getByRole('switch', {
      name: 'Filter out regular duplicates',
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(page.locator('.submission-filter-panel')).toContainText(
    'Only the administrator can change this.',
  );
  await expect(page.locator('.submission-filter-panel strong')).toHaveText(
    /enabled|disabled|unavailable/,
  );
  await expect(page.getByRole('link', { name: 'Items catalog' })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Scheduling and Competitions' }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Admin navigation' })
      .getByRole('link'),
  ).toHaveText([
    'Submissions',
    'Items catalog',
    'Scheduling and Competitions',
    'RuneLite submissions',
    'Your account',
  ]);
  await page.getByRole('link', { name: 'Items catalog', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Items catalog', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Enable hardcore worlds')).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'Moderator accounts' }),
  ).toHaveCount(0);
  await page.getByRole('link', { name: 'Your account' }).click();
  await page.getByLabel('Username', { exact: true }).fill('new-reviewer');
  await page.getByLabel('Current password', { exact: true }).fill('incorrect');
  await page.getByRole('button', { name: 'Save account' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'The current password is incorrect.',
  );
  await page
    .getByLabel('Current password', { exact: true })
    .fill('reviewer-password');
  await page
    .getByLabel('New password', { exact: true })
    .fill('updated-reviewer-password');
  await page
    .getByLabel('Confirm new password')
    .fill('updated-reviewer-password');
  await page.getByRole('button', { name: 'Save account' }).click();
  await expect(page.getByRole('status')).toHaveText(
    'Account updated. Other sessions have been signed out.',
  );
  expect(state.submitted).toEqual({
    username: 'new-reviewer',
    currentPassword: 'reviewer-password',
    newPassword: 'updated-reviewer-password',
  });
  await expect(
    page.getByLabel('Current password', { exact: true }),
  ).toHaveValue('');
  await expect(page.getByLabel('New password', { exact: true })).toHaveValue(
    '',
  );
  await page.goto('/admin/accounts');
  await expect(page.getByRole('alert')).toHaveText(
    'Only the administrator can create moderator accounts.',
  );
  await expect(
    page.getByRole('button', { name: 'Create moderator' }),
  ).toHaveCount(0);
  await page.goto('/admin/runelite');
  await expect(
    page.getByRole('heading', { name: 'RuneLite submissions', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel('Current shared API key', { exact: true }),
  ).toHaveValue('mock-test-clan-key');
  await expect(
    page.getByLabel('Current shared API key', { exact: true }),
  ).toHaveAttribute('readonly', '');
  await expect(
    page.getByRole('button', { name: 'Generate new key', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Save API key settings', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel('Members worlds submissions', { exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(
    page.getByRole('heading', { name: 'Admin sign-in required' }),
  ).toBeVisible();
});

test('failed login clears the password, cooldown survives deep-link reload and keyboard retry never happens automatically', async ({
  page,
}) => {
  const state = await mockAccounts(page);
  await page.clock.install({ time: new Date('2026-11-02T12:00:00Z') });
  let attempts = 0;
  await page.route('**/api/v1/auth/login', async (route) => {
    attempts++;
    if (attempts === 1)
      return route.fulfill({
        status: 401,
        json: { error: 'Incorrect username or password.' },
      });
    if (attempts === 2)
      return route.fulfill({
        status: 429,
        headers: { 'Retry-After': '3' },
        json: { error: 'ignored private error' },
      });
    return route.fallback();
  });
  await page.goto('/admin/schedules');
  await signIn(page, 'admin', 'wrong');
  await expect(page.getByRole('alert')).toHaveText(
    'Incorrect username or password.',
  );
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
  await signIn(page, 'admin', 'wrong-again');
  const button = page.getByRole('button', { name: 'Sign in', exact: true });
  await expect(button).toBeDisabled();
  await expect(page.getByRole('status')).toHaveText(
    'Too many sign-in attempts. Try again in 3 seconds.',
  );
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
  await page.locator('.admin-credential-form').dispatchEvent('submit');
  expect(attempts).toBe(2);
  await page.reload();
  await expect(button).toBeDisabled();
  await page.clock.runFor(3100);
  await expect(button).toBeEnabled();
  expect(attempts).toBe(2);
  await page.getByLabel('Username', { exact: true }).fill('admin');
  const password = page.getByLabel('Password', { exact: true });
  await expect(password).toHaveAttribute('autocomplete', 'current-password');
  await password.fill('correct-password');
  await password.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Schedule management', exact: true }),
  ).toBeVisible();
  expect(attempts).toBe(3);
  expect(state.authenticated).toBe(true);
});

for (const retry of [undefined, 'malformed'])
  test(
    'login uses a bounded fallback cooldown for ' +
      (retry ?? 'missing') +
      ' retry headers',
    async ({ page }) => {
      await mockAccounts(page);
      await page.clock.install({ time: new Date('2026-11-02T12:00:00Z') });
      let attempts = 0;
      await page.route('**/api/v1/auth/login', (route) => {
        attempts++;
        return route.fulfill({
          status: 429,
          headers: retry ? { 'Retry-After': retry } : {},
          json: { error: 'untrusted' },
        });
      });
      await page.goto('/admin');
      await signIn(page);
      const button = page.getByRole('button', { name: 'Sign in', exact: true });
      await expect(button).toBeDisabled();
      await expect(page.getByRole('status')).toContainText('60 seconds');
      await expect(page.getByLabel('Password', { exact: true })).toHaveValue(
        '',
      );
      await page.clock.runFor(60100);
      await expect(button).toBeEnabled();
      expect(attempts).toBe(1);
    },
  );
