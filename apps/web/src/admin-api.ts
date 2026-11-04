import * as appText from '@clog/domain';
/** Same-origin private HTTP adapter for future admin routes; validates mutation receipts. */
import { parseClanKey, type ClanKeyUpdate } from './clan-api-key.ts';
import {
  parseAccessControl,
  parseHighlightColour,
  parseStaffPages,
  type StaffPage,
  type CollectionType,
  parseDiscordSettings,
  parseDiscordFields,
  type DiscordSettingsUpdate,
} from '@clog/domain';
import {
  parseSchedulingState,
  parseCollectionScheduleInput,
  closedCollectionPageMessage,
  type CollectionScheduleInput,
} from '@clog/domain';
import {
  parseRuneLiteSettings,
  parseRuneLiteRules,
  type RuneLiteSettingsUpdate,
} from '@clog/domain';
import { parseSettings } from './site-settings.ts';
import { parseBranding, validateLogoFile } from './branding.ts';
import { LiveXpClient } from './xp-api.ts';
import {
  list,
  object,
  text,
  timestamp,
  unique,
  parseAdminSession,
} from './xp-model.ts';
import {
  parseAdminCatalog,
  parseAdminItem,
  parseAdminPage,
  parseQueue,
  parseSubmission,
  parseStaffAccount,
  validateIconFile,
  type AdminCatalog,
  type AdminClient,
  type AdminPage,
  type Correction,
  type ManualSubmissionInput,
  type CreatedItem,
  type CreateItem,
  type CreatePage,
  type QueueView,
  type StagedIcon,
  type Submission,
} from './admin-model.ts';

export function collectionTypeMatches(
  result: Submission,
  requested: CollectionType | undefined,
  allowFallback = true,
  pageId?: string,
) {
  return (
    (pageId === undefined ||
      result.collectionType !== 'event' ||
      result.eventPageId === pageId) &&
    (requested === undefined ||
      result.collectionType === requested ||
      (allowFallback &&
        requested === 'event' &&
        result.collectionType === 'regular' &&
        !result.hardcore &&
        result.collectionReason === 'event_credit_already_obtained'))
  );
}

export class AdminRequestError extends Error {
  readonly status: number;
  declare readonly retryAfterSeconds: number | undefined;
  constructor(
    status: number,
    serverConflict?: string,
    retryAfterSeconds?: number,
  ) {
    super(
      [400, 409].includes(status) &&
        serverConflict &&
        [
          appText.repeatCollectorRejected,
          appText.collectorNamesChanged,
          appText.collectorNamesMissing,
          appText.webAdminApiAnApprovedEventCollectionAlreadyExistsForThisItemRevoke,
          appText.webAdminApiFilterOutRegularDuplicatesIsOnAndThisItemAlready,
          appText.webAdminApiThatUsernameIsAlreadyInUse,
          appText.webAdminApiTheCurrentPasswordIsIncorrect,
          appText.webAdminApiChooseANewPasswordToFinishAccountSetup,
          appText.webAdminApiChooseAPasswordDifferentFromYourCurrentPassword,
          appText.webAdminApiYourAccountChangedSignInAgainBeforeRetrying,
          appText.webAdminApiAPageWithThisNameAlreadyExistsInThisCategory,
          appText.webAdminApiChooseDistinctActiveCatalogItems,
          appText.webAdminApiTheCatalogHasReachedItsPageOrItemSlotLimit,
          appText.webAdminApiAnInGameItemIdAlreadyBelongsToAnotherItem,
          appText.webAdminApiASectionWithThisNameAlreadyExists,
          appText.webAdminApiAPageWithThisNameAlreadyExistsInThisSection,
          appText.webAdminApiOnlySectionsWithNoPagesCanBeDeleted,
        ].includes(serverConflict)
        ? serverConflict
        : status === 409 &&
            serverConflict ===
              appText.webAdminApiAnApprovedCreditAlreadyExistsForThisItemAndWorld
          ? serverConflict
          : status === 401
            ? appText.webAdminApiYourSessionExpiredSignInAgain
            : status === 403
              ? appText.webAdminApiYourAccountIsNotAllowedToAdministerTheClan
              : status === 409
                ? appText.webAdminApiAnotherChangeWasSavedLoadTheLatestDataBeforeTrying
                : status === 413
                  ? appText.webAdminApiTheUploadedImageIsTooLarge
                  : status === 422 || status === 400
                    ? appText.webAdminApiTheServerCouldNotValidateTheseFieldsReviewThemBefore
                    : [404, 501, 503].includes(status)
                      ? appText.webAdminApiTheAdminServiceIsNotAvailableYet
                      : appText.webAdminApiTheRequestCouldNotBeCompletedReloadOrRetryTo,
    );
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
export class LiveAdminClient implements AdminClient {
  async eventPageClient() {
    return import('./event-page-api.ts');
  }
  async collectorNameClient() {
    return import('./collector-name-api.ts');
  }
  async collectorModeClient() {
    return import('./collector-mode-api.ts');
  }
  async catalogUpdateClient() {
    return import('./catalog-update-api.ts');
  }
  async accessControl(signal: AbortSignal) {
    return parseAccessControl(
      await this.json('/api/v1/admin/access-control', signal),
    );
  }
  async saveAccessControl(
    pages: StaffPage[],
    revision: string,
    csrf: string,
    signal: AbortSignal,
  ) {
    const moderatorPages = parseStaffPages(pages);
    const result = parseAccessControl(
      await this.json(
        '/api/v1/admin/access-control',
        signal,
        this.write(csrf, { moderatorPages, expectedRevision: revision }, 'PUT'),
      ),
    );
    if (
      result.revision === revision ||
      JSON.stringify(result.moderatorPages) !== JSON.stringify(moderatorPages)
    )
      throw new Error(appText.webAdminApiUnexpectedAccessControlReceipt);
    return result;
  }
  async discordStatus(signal: AbortSignal) {
    const response = await this.request('/api/v1/discord/status', {
      signal,
      credentials: 'same-origin',
      cache: 'no-store',
    });
    if (!response.ok && response.status !== 503)
      throw new Error(appText.webAdminApiDiscordStatusIsUnavailable);
    const result = object(await response.json());
    if (
      typeof result.enabled !== 'boolean' ||
      typeof result.ready !== 'boolean'
    )
      throw new Error(appText.webAdminApiInvalidDiscordStatus);
    const state =
      result.state === undefined
        ? !result.enabled
          ? 'disabled'
          : result.ready
            ? 'connected'
            : 'unavailable'
        : result.state;
    if (
      ![
        'disabled',
        'connecting',
        'connected',
        'disconnected',
        'unavailable',
      ].includes(String(state)) ||
      (!result.enabled && (result.ready || state !== 'disabled')) ||
      (result.enabled && state === 'disabled') ||
      result.ready !== (state === 'connected') ||
      (!response.ok && result.ready)
    )
      throw new Error(appText.webAdminApiInvalidDiscordStatus);
    return {
      enabled: result.enabled,
      ready: result.ready,
      state: state as import('@clog/domain').DiscordConnectionState,
    };
  }
  async discordSettings(signal: AbortSignal) {
    return parseDiscordSettings(
      await this.json('/api/v1/admin/discord-settings', signal),
    );
  }
  async saveDiscordSettings(
    fields: DiscordSettingsUpdate,
    csrf: string,
    signal: AbortSignal,
  ) {
    const result = parseDiscordSettings(
      await this.json(
        '/api/v1/admin/discord-settings',
        signal,
        this.write(csrf, fields, 'PUT'),
      ),
    );
    if (
      result.revision === fields.expectedRevision ||
      JSON.stringify(parseDiscordFields(result)) !==
        JSON.stringify(parseDiscordFields(fields)) ||
      (fields.token !== undefined && result.tokenConfigured !== !!fields.token)
    )
      throw new Error(appText.webAdminApiUnexpectedDiscordSettingsReceipt);
    return result;
  }
  async registerDiscordCommands(
    target: 'guild' | 'test',
    revision: string,
    csrf: string,
    signal: AbortSignal,
  ) {
    const result = object(
      await this.json(
        '/api/v1/admin/discord-settings/register',
        signal,
        this.write(csrf, { target, expectedRevision: revision }, 'POST'),
      ),
    );
    if (
      result.registered !== true ||
      result.revision !== revision ||
      typeof result.guildId !== 'string'
    )
      throw new Error(appText.webAdminApiUnexpectedDiscordRegistrationReceipt);
  }
  async saveSubmissionFilters(
    filterCollected: boolean,
    revision: string,
    csrf: string,
    signal: AbortSignal,
    repeatCollectorPolicy?: import('@clog/domain').RepeatCollectorPolicy,
  ) {
    return (await import('./submission-write-api.ts')).saveSubmissionFilters(
      this.json.bind(this),
      filterCollected,
      revision,
      csrf,
      signal,
      repeatCollectorPolicy,
    );
  }
  async scheduling(signal: AbortSignal) {
    return parseSchedulingState(
      await this.json('/api/v1/admin/schedules', signal),
    );
  }
  async setSchedulingEnabled(
    enabled: boolean,
    expectedRevision: string,
    csrf: string,
    signal: AbortSignal,
  ) {
    const result = parseSchedulingState(
      await this.json(
        '/api/v1/admin/schedules/settings',
        signal,
        this.write(csrf, { enabled, expectedRevision }, 'PUT'),
      ),
    );
    if (result.revision === expectedRevision || result.enabled !== enabled)
      throw new Error(appText.webAdminApiUnexpectedSchedulingReceipt);
    return result;
  }
  async saveSchedule(
    input: CollectionScheduleInput,
    expectedRevision: string,
    csrf: string,
    signal: AbortSignal,
    id?: string,
  ) {
    const fields = parseCollectionScheduleInput(input);
    const result = parseSchedulingState(
      await this.json(
        '/api/v1/admin/schedules' + (id ? '/' + encodeURIComponent(id) : ''),
        signal,
        this.write(csrf, { expectedRevision, ...fields }, id ? 'PUT' : 'POST'),
      ),
    );
    if (
      result.revision === expectedRevision ||
      !result.schedules.some(
        (schedule) =>
          (!id || schedule.id === id) &&
          schedule.title === fields.title &&
          schedule.startsAt === fields.startsAt &&
          schedule.endsAt === fields.endsAt &&
          JSON.stringify(schedule.pageIds) === JSON.stringify(fields.pageIds),
      )
    )
      throw new Error(appText.webAdminApiUnexpectedScheduleReceipt);
    return result;
  }
  async deleteSchedule(
    id: string,
    expectedRevision: string,
    csrf: string,
    signal: AbortSignal,
  ) {
    const result = parseSchedulingState(
      await this.json(
        '/api/v1/admin/schedules/' + encodeURIComponent(id),
        signal,
        this.write(csrf, { expectedRevision }, 'DELETE'),
      ),
    );
    if (
      result.revision === expectedRevision ||
      result.schedules.some((schedule) => schedule.id === id)
    )
      throw new Error(appText.webAdminApiUnexpectedScheduleDeletionReceipt);
    return result;
  }
  async runeLiteSettings(signal: AbortSignal) {
    return parseRuneLiteSettings(
      await this.json('/api/v1/admin/runelite-settings', signal),
    );
  }
  async saveRuneLiteSettings(
    fields: RuneLiteSettingsUpdate,
    csrf: string,
    signal: AbortSignal,
  ) {
    const { expectedRevision, clanKeyRequirement, ...input } = fields;
    const rules = parseRuneLiteRules(input);
    const result = parseRuneLiteSettings(
      await this.json(
        '/api/v1/admin/runelite-settings',
        signal,
        this.write(
          csrf,
          {
            expectedRevision,
            ...rules,
            ...(clanKeyRequirement ? { clanKeyRequirement } : {}),
          },
          'PUT',
        ),
      ),
    );
    const { revision, clanKeyRequirement: requirement, ...saved } = result;
    if (
      revision === expectedRevision ||
      JSON.stringify(saved) !== JSON.stringify(rules) ||
      (clanKeyRequirement &&
        (!requirement ||
          requirement.enabled !== clanKeyRequirement.enabled ||
          requirement.revision === clanKeyRequirement.expectedRevision))
    )
      throw new Error(appText.webAdminApiUnexpectedRuneLiteSettingsReceipt);
    return result;
  }
  private readonly request: typeof fetch;
  private readonly auth: LiveXpClient;
  constructor(request: typeof fetch = fetch) {
    this.request = request.bind(globalThis);
    this.auth = new LiveXpClient(request);
  }
  private async response(
    path: string,
    signal: AbortSignal,
    options: RequestInit = {},
  ) {
    const response = await this.request(path, {
      ...options,
      signal,
      credentials: 'same-origin',
      cache: 'no-store',
    });
    if (!response.ok) {
      let serverConflict: string | undefined;
      if ([400, 403, 409].includes(response.status)) {
        try {
          const body: unknown = await response.json();
          if (
            body &&
            typeof body === 'object' &&
            'error' in body &&
            typeof body.error === 'string'
          )
            serverConflict = body.error;
        } catch {
          // Unexpected error responses keep the standard conflict message.
        }
      }
      if (
        response.status === 403 &&
        serverConflict === closedCollectionPageMessage
      )
        throw new Error(closedCollectionPageMessage);
      throw new AdminRequestError(response.status, serverConflict);
    }
    return response;
  }
  private async json(
    path: string,
    signal: AbortSignal,
    options: RequestInit = {},
  ) {
    return (
      await this.response(path, signal, options)
    ).json() as Promise<unknown>;
  }
  // CSRF protects browser writes; a stable request key lets creation retries be deduplicated.
  private write(
    csrf: string,
    body: unknown,
    method = 'POST',
    key?: string,
  ): RequestInit {
    return {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrf,
        ...(key ? { 'Idempotency-Key': key } : {}),
      },
      body: JSON.stringify(body),
    };
  }
  async session(signal: AbortSignal) {
    try {
      return await this.auth.session(signal);
    } catch (failure) {
      if (
        failure instanceof Error &&
        'status' in failure &&
        typeof failure.status === 'number'
      )
        throw new AdminRequestError(failure.status);
      throw failure;
    }
  }
  async login(
    username: string,
    password: string,
    signal: AbortSignal,
  ): Promise<void> {
    const { login } = await import('./auth-login.ts');
    await login(this.request, username, password, signal);
  }
  async accounts(signal: AbortSignal) {
    const result = object(await this.json('/api/v1/admin/accounts', signal));
    const accounts = list(result.accounts).map(parseStaffAccount);
    unique(accounts.map((account) => account.id));
    return accounts;
  }
  async manageModerator(
    id: string,
    expectedVersion: number,
    action: 'disable' | 'enable' | 'delete',
    csrf: string,
    signal: AbortSignal,
  ) {
    const result = parseStaffAccount(
      await this.json(
        `/api/v1/admin/accounts/${encodeURIComponent(id)}/${action}`,
        signal,
        this.write(csrf, { expectedVersion }),
      ),
    );
    if (
      result.id !== id ||
      result.role !== 'moderator' ||
      !result.version ||
      result.version <= expectedVersion ||
      result.disabled !== (action !== 'enable')
    )
      throw new Error(appText.webAdminApiUnexpectedModeratorAccountReceipt);
    return result;
  }
  async createPage(
    fields: CreatePage,
    key: string,
    revision: string,
    csrf: string,
    signal: AbortSignal,
  ) {
    const result = object(
      await this.json('/api/v1/admin/catalog/pages', signal, {
        ...this.write(csrf, { ...fields, expectedRevision: revision }),
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf,
          'Idempotency-Key': key,
        },
      }),
    );
    const page = parseAdminPage(result.page);
    if (
      page.name !== fields.name.trim() ||
      page.category !== fields.category ||
      JSON.stringify(page.itemIds) !== JSON.stringify(fields.itemIds) ||
      text(result.catalogRevision) === revision
    )
      throw new Error(appText.webAdminApiUnexpectedPageCreationReceipt);
    return page;
  }
  async removePage(
    id: string,
    revision: string,
    version: string,
    csrf: string,
    signal: AbortSignal,
  ) {
    const result = object(
      await this.json(
        `/api/v1/admin/catalog/pages/${encodeURIComponent(id)}`,
        signal,
        this.write(
          csrf,
          { expectedRevision: revision, expectedVersion: version },
          'DELETE',
        ),
      ),
    );
    const retiredItemIds = list(result.retiredItemIds).map((value) => {
      if (
        !Number.isInteger(value) ||
        Number(value) < 1 ||
        Number(value) > 2147483647
      )
        throw new Error(appText.webAdminApiUnexpectedPageDeletionReceipt);
      return value as number;
    });
    unique(retiredItemIds);
    if (result.pageId !== id || text(result.catalogRevision) === revision)
      throw new Error(appText.webAdminApiUnexpectedPageDeletionReceipt);
    return { retiredItemIds };
  }
  async reorderPages(
    category: import('./model.ts').Category,
    ids: string[],
    revision: string,
    csrf: string,
    signal: AbortSignal,
  ) {
    const result = object(
      await this.json(
        '/api/v1/admin/catalog/pages/order',
        signal,
        this.write(
          csrf,
          { category, orderedPageIds: ids, expectedRevision: revision },
          'PUT',
        ),
      ),
    );
    if (
      result.category !== category ||
      JSON.stringify(result.orderedPageIds) !== JSON.stringify(ids) ||
      text(result.catalogRevision) === revision
    )
      throw new Error(appText.webAdminApiUnexpectedPageOrderReceipt);
  }
  async removePageItem(
    pageId: string,
    id: number,
    revision: string,
    version: string,
    csrf: string,
    signal: AbortSignal,
  ) {
    const result = object(
      await this.json(
        `/api/v1/admin/catalog/pages/${encodeURIComponent(pageId)}/items/${id}`,
        signal,
        this.write(
          csrf,
          { expectedRevision: revision, expectedVersion: version },
          'DELETE',
        ),
      ),
    );
    if (
      result.itemId !== id ||
      result.pageId !== pageId ||
      typeof result.retired !== 'boolean' ||
      text(result.catalogRevision) === revision
    )
      throw new Error(appText.webAdminApiUnexpectedCatalogDeletionReceipt);
    return { retired: result.retired };
  }
  async createModerator(
    username: string,
    password: string,
    csrf: string,
    signal: AbortSignal,
  ) {
    const response = await this.response(
      '/api/v1/admin/accounts',
      signal,
      this.write(csrf, { username, password }),
    );
    if (response.status !== 201)
      throw new Error(appText.webAdminApiUnexpectedAccountCreationStatus);
    const account = parseStaffAccount(await response.json());
    if (
      account.username !== username ||
      account.role !== 'moderator' ||
      !account.mustChangePassword
    )
      throw new Error(appText.webAdminApiUnexpectedModeratorAccountReceipt);
    return account;
  }
  async updateAccount(
    fields: { username: string; currentPassword: string; newPassword?: string },
    csrf: string,
    signal: AbortSignal,
  ) {
    const session = parseAdminSession(
      await this.json(
        '/api/v1/auth/account',
        signal,
        this.write(csrf, fields, 'PATCH'),
      ),
    );
    if (
      !session ||
      session.username !== fields.username ||
      (fields.newPassword && session.mustChangePassword)
    )
      throw new Error(appText.webAdminApiUnexpectedAccountUpdateReceipt);
    return session;
  }
  async addManual(
    fields: ManualSubmissionInput,
    key: string,
    csrf: string,
    signal: AbortSignal,
    screenshot?: File,
  ) {
    const { manualSubmissionReceipt } =
      await import('./submission-write-api.ts');
    const upload = screenshot ? new FormData() : undefined;
    if (upload && screenshot) {
      upload.append('submission', JSON.stringify(fields));
      upload.append('screenshot', screenshot);
    }
    const response = await this.response(
      upload ? '/api/v1/admin/submissions/upload' : '/api/v1/admin/submissions',
      signal,
      upload
        ? {
            method: 'POST',
            headers: { 'X-CSRF-Token': csrf, 'Idempotency-Key': key },
            body: upload,
          }
        : this.write(csrf, fields, 'POST', key),
    );
    if (response.status !== 201)
      throw new Error(appText.webAdminApiUnexpectedManualSubmissionStatus);
    return manualSubmissionReceipt(await response.json(), fields, !!screenshot);
  }
  async clanApiKey(signal: AbortSignal) {
    return parseClanKey(await this.json('/api/v1/admin/clan-api-key', signal));
  }
  async saveClanApiKey(
    fields: ClanKeyUpdate,
    csrf: string,
    signal: AbortSignal,
  ) {
    const result = parseClanKey(
      await this.json(
        '/api/v1/admin/clan-api-key',
        signal,
        this.write(csrf, fields, 'PUT'),
      ),
    );
    if (
      result.revision === fields.expectedRevision ||
      (fields.enabled !== undefined && result.enabled !== fields.enabled) ||
      (fields.key !== undefined && result.key !== fields.key)
    )
      throw new Error(appText.webAdminApiUnexpectedApiKeyReceipt);
    return result;
  }
  async settings(signal: AbortSignal) {
    return parseSettings(await this.json('/api/v1/admin/settings', signal));
  }
  async branding(signal: AbortSignal, hardcore = false) {
    return parseBranding(
      await this.json(
        '/api/v1/admin/branding' + (hardcore ? '/hardcore' : ''),
        signal,
      ),
    );
  }
  async saveLogo(
    file: File | null,
    revision: string,
    csrf: string,
    signal: AbortSignal,
    hardcore = false,
  ) {
    let options: RequestInit;
    if (file) {
      validateLogoFile(file);
      const data = new FormData();
      data.set('logo', file);
      options = {
        method: 'PUT',
        headers: { 'X-CSRF-Token': csrf, 'If-Match': revision },
        body: data,
      };
    } else options = this.write(csrf, { expectedRevision: revision }, 'DELETE');
    let payload: unknown;
    try {
      payload = await this.json(
        '/api/v1/admin/branding' + (hardcore ? '/hardcore' : '') + '/logo',
        signal,
        options,
      );
    } catch (failure) {
      if (
        file &&
        failure instanceof AdminRequestError &&
        failure.status === 400
      )
        throw new Error(
          appText.webAdminApiTheLogoCouldNotBeDecodedChooseASupportedImage,
          { cause: failure },
        );
      throw failure;
    }
    const result = parseBranding(payload);
    if (result.revision === revision)
      throw new Error(appText.webAdminApiUnexpectedLogoReceipt);
    return result;
  }
  async saveSettings(
    hardcoreEnabled: boolean,
    expectedRevision: string,
    csrf: string,
    signal: AbortSignal,
    clanName?: string,
    copy?: import('@clog/domain').SiteCopy,
    hardcore?: import('@clog/domain').HardcoreAppearance,
    howToSubmitMarkdown?: string,
    highlights?: import('@clog/domain').HighlightUpdate,
  ) {
    const result = parseSettings(
      await this.json(
        '/api/v1/admin/settings',
        signal,
        this.write(
          csrf,
          {
            hardcoreEnabled,
            expectedRevision,
            ...(clanName === undefined ? {} : { clanName }),
            ...(copy === undefined ? {} : { copy }),
            ...(hardcore === undefined ? {} : { hardcore }),
            ...highlights,
            ...(howToSubmitMarkdown === undefined
              ? {}
              : { howToSubmitMarkdown }),
          },
          'PUT',
        ),
      ),
    );
    if (
      result.hardcoreEnabled !== hardcoreEnabled ||
      (highlights?.eventHighlight !== undefined &&
        JSON.stringify(result.eventHighlight) !==
          JSON.stringify(parseHighlightColour(highlights.eventHighlight))) ||
      (highlights?.hardcoreHighlight !== undefined &&
        JSON.stringify(result.hardcoreHighlight) !==
          JSON.stringify(parseHighlightColour(highlights.hardcoreHighlight))) ||
      (howToSubmitMarkdown !== undefined &&
        result.howToSubmitMarkdown !== howToSubmitMarkdown) ||
      (clanName !== undefined && result.clanName !== clanName.trim()) ||
      (copy !== undefined &&
        JSON.stringify(result.copy) !== JSON.stringify(copy)) ||
      (hardcore !== undefined &&
        JSON.stringify(result.hardcore) !== JSON.stringify(hardcore)) ||
      result.revision === expectedRevision
    )
      throw new Error(appText.webAdminApiUnexpectedSettingsReceipt);
    return result;
  }
  async logout(csrf: string, signal: AbortSignal) {
    await this.response('/api/v1/auth/logout', signal, this.write(csrf, {}));
  }
  async catalog(signal: AbortSignal): Promise<AdminCatalog> {
    return parseAdminCatalog(await this.json('/api/v1/admin/catalog', signal));
  }
  async createSection(
    name: string,
    key: string,
    revision: string,
    csrf: string,
    signal: AbortSignal,
  ) {
    const result = object(
      await this.json(
        '/api/v1/admin/catalog/sections',
        signal,
        this.write(csrf, { name, expectedRevision: revision }, 'POST', key),
      ),
    );
    const section = object(result.section);
    if (section.name !== name)
      throw new Error(appText.webAdminApiUnexpectedSectionReceipt);
    return { id: text(section.id), name: text(section.name) };
  }
  private async catalogWrite(
    path: string,
    fields: object,
    revision: string,
    csrf: string,
    signal: AbortSignal,
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  ) {
    const result = object(
      await this.json(
        '/api/v1/admin/catalog/' + path,
        signal,
        this.write(csrf, { ...fields, expectedRevision: revision }, method),
      ),
    );
    text(result.catalogRevision);
  }
  async editSection(
    id: string,
    name: string | null,
    revision: string,
    csrf: string,
    signal: AbortSignal,
  ) {
    await this.catalogWrite(
      'sections/' + encodeURIComponent(id),
      name === null ? {} : { name },
      revision,
      csrf,
      signal,
      name === null ? 'DELETE' : 'PATCH',
    );
  }
  async reorderSections(
    ids: string[],
    revision: string,
    csrf: string,
    signal: AbortSignal,
  ) {
    await this.catalogWrite(
      'sections/order',
      { orderedSectionIds: ids },
      revision,
      csrf,
      signal,
      'PUT',
    );
  }
  async renamePage(
    id: string,
    name: string,
    revision: string,
    csrf: string,
    signal: AbortSignal,
  ) {
    await this.catalogWrite(
      'pages/' + encodeURIComponent(id),
      { name },
      revision,
      csrf,
      signal,
      'PATCH',
    );
  }
  async attachItem(
    pageId: string,
    id: number,
    revision: string,
    csrf: string,
    signal: AbortSignal,
  ) {
    await this.catalogWrite(
      'pages/' + encodeURIComponent(pageId) + '/items/' + id,
      {},
      revision,
      csrf,
      signal,
      'PUT',
    );
  }
  async editItem(
    id: number,
    fields: { name: string; gameItemIds: number[]; iconAssetId?: string },
    revision: string,
    csrf: string,
    signal: AbortSignal,
  ) {
    await this.catalogWrite(
      'items/' + id,
      fields,
      revision,
      csrf,
      signal,
      'PATCH',
    );
  }
  async deleteItem(
    id: number,
    revision: string,
    csrf: string,
    signal: AbortSignal,
  ) {
    await this.catalogWrite(
      'items/' + id,
      {},
      revision,
      csrf,
      signal,
      'DELETE',
    );
  }
  async queue(
    view: QueueView,
    cursor: string | undefined,
    signal: AbortSignal,
  ) {
    const params = new URLSearchParams({
      status: view === 'reviewed' ? 'reviewed' : 'pending',
      limit: '20',
    });
    if (view === 'unmatched') params.set('unmatched', 'true');
    if (cursor) params.set('cursor', cursor);
    return parseQueue(
      await this.json('/api/v1/admin/submissions?' + params, signal),
      view,
    );
  }
  async detail(id: string, signal: AbortSignal, cursor?: string) {
    const { parseDetail } = await import('./submission-detail.ts');
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    const result = parseDetail(
      await this.json(
        '/api/v1/admin/submissions/' +
          encodeURIComponent(id) +
          (cursor ? '?' + params : ''),
        signal,
      ),
    );
    if (result.submission.id !== id)
      throw new Error(appText.webAdminApiUnexpectedSubmissionIdentity);
    return result;
  }
  /** Version checks are the server's concurrency contract; receipts must advance it. */
  async edit(
    id: string,
    version: number,
    fields: Correction,
    csrf: string,
    signal: AbortSignal,
  ) {
    const result = parseSubmission(
      await this.json(
        '/api/v1/admin/submissions/' + encodeURIComponent(id),
        signal,
        this.write(csrf, { ...fields, expectedVersion: version }, 'PATCH'),
      ),
    );
    if (
      result.id !== id ||
      result.version <= version ||
      !collectionTypeMatches(
        result,
        fields.collectionType,
        true,
        fields.eventPageId,
      )
    )
      throw new Error(appText.webAdminApiUnexpectedCorrectionReceipt);
    return result;
  }
  async saveReviewNote(
    id: string,
    version: number,
    note: string,
    csrf: string,
    signal: AbortSignal,
  ) {
    const result = parseSubmission(
      await this.json(
        '/api/v1/admin/submissions/' + encodeURIComponent(id) + '/note',
        signal,
        this.write(csrf, { expectedVersion: version, note }, 'PATCH'),
      ),
    );
    if (
      result.id !== id ||
      result.version <= version ||
      result.reviewNote !== note.trim()
    )
      throw new Error(appText.webAdminApiUnexpectedReviewNoteReceipt);
    return result;
  }
  async decide(
    id: string,
    version: number,
    action: 'approve' | 'reject' | 'revoke',
    reason: string,
    csrf: string,
    signal: AbortSignal,
    flags?: import('./admin-model.ts').CollectionFlags,
  ) {
    const result = parseSubmission(
      await this.json(
        '/api/v1/admin/submissions/' + encodeURIComponent(id) + '/' + action,
        signal,
        this.write(csrf, {
          expectedVersion: version,
          ...(action === 'approve' ? {} : { reason }),
          ...(flags === undefined ? {} : { flags }),
        }),
      ),
    );
    if (
      result.id !== id ||
      result.version <= version ||
      (flags !== undefined &&
        (result.hardcore !== flags.hardcore ||
          !collectionTypeMatches(
            result,
            flags.collectionType,
            action === 'approve',
            flags.eventPageId,
          ))) ||
      result.status !==
        (
          {
            approve: 'approved',
            reject: 'rejected',
            revoke: 'revoked',
          } as const
        )[action]
    )
      throw new Error(appText.webAdminApiUnexpectedReviewReceipt);
    return result;
  }
  async saveCollectionFlags(
    id: string,
    version: number,
    flags: import('./admin-model.ts').CollectionFlags,
    reason: string,
    csrf: string,
    signal: AbortSignal,
  ) {
    const result = parseSubmission(
      await this.json(
        '/api/v1/admin/submissions/' + encodeURIComponent(id) + '/flags',
        signal,
        this.write(csrf, { expectedVersion: version, flags, reason }, 'PATCH'),
      ),
    );
    if (
      result.id !== id ||
      result.version <= version ||
      result.status !== 'approved' ||
      result.hardcore !== flags.hardcore ||
      !collectionTypeMatches(
        result,
        flags.collectionType,
        true,
        flags.eventPageId,
      )
    )
      throw new Error(appText.webAdminApiUnexpectedCollectionFlagsReceipt);
    return result;
  }
  async upload(
    file: File,
    csrf: string,
    signal: AbortSignal,
  ): Promise<StagedIcon> {
    await validateIconFile(file);
    // Let fetch choose the multipart boundary instead of supplying a JSON content type.
    const data = new FormData();
    data.set('icon', file);
    const result = object(
      await this.json('/api/v1/admin/catalog/icons', signal, {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrf },
        body: data,
      }),
    );
    const iconPath = text(result.iconPath);
    parseAdminItem({
      id: 1,
      name: appText.webAdminApiStaged,
      iconPath,
      origin: 'manual',
      overrides: [],
    });
    return {
      assetId: text(result.assetId),
      iconPath,
      expiresAt: timestamp(result.expiresAt),
    };
  }
  async create(
    fields: CreateItem,
    key: string,
    csrf: string,
    signal: AbortSignal,
  ): Promise<CreatedItem> {
    const data = object(
      await this.json(
        '/api/v1/admin/catalog/items',
        signal,
        this.write(csrf, fields, 'POST', key),
      ),
    );
    const pageIds = list(data.pageIds).map(text);
    unique(pageIds);
    if (
      pageIds.length !== fields.pageIds.length ||
      pageIds.some((id) => !fields.pageIds.includes(id))
    )
      throw new Error(appText.webAdminApiUnexpectedItemMemberships);
    const item = parseAdminItem(data.item);
    if (item.name !== fields.name || item.origin !== 'manual')
      throw new Error(appText.webAdminApiUnexpectedCreatedItem);
    return { item, pageIds, catalogRevision: text(data.catalogRevision) };
  }
  async order(
    pageId: string,
    ids: number[],
    version: string,
    csrf: string,
    signal: AbortSignal,
  ): Promise<AdminPage> {
    const data = object(
      await this.json(
        '/api/v1/admin/catalog/pages/' + encodeURIComponent(pageId) + '/order',
        signal,
        this.write(
          csrf,
          { orderedItemIds: ids, expectedVersion: version },
          'PUT',
        ),
      ),
    );
    const page = parseAdminPage(data.page),
      itemIds = page.itemIds;
    if (
      page.id !== pageId ||
      JSON.stringify(itemIds) !== JSON.stringify(ids) ||
      page.orderOrigin !== 'manual' ||
      page.version === version
    )
      throw new Error(appText.webAdminApiUnexpectedSavedPageOrder);
    text(data.catalogRevision);
    return page;
  }
}
