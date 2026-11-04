/** Canonical authored runtime wording. Pure data/formatters; keep feature exports separable. */
export const domainDisplaySubmissionStatus = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  revoked: 'revoked',
};

export const domainDisplayStaffRole = {
  admin: 'admin',
  moderator: 'moderator',
};
const sharedAccessControl = 'Access control';
const sharedOn = 'On';
const sharedOff = 'Off';
const sharedSaveChanges = 'Save changes';
const sharedDiscardChanges = 'Discard changes';
const sharedYourAccount = 'Your account';
const sharedUsername = 'Username';
const sharedSaving = 'Saving…';
const sharedCompetitionsCouldNotBeRefreshed =
  'Competitions could not be refreshed.';
const sharedAnApprovedEventCollectionAlreadyExistsForThisItemRevoke =
  'An approved Event collection already exists for this item. Revoke it before approving another Event collection.';
const sharedFilterOutRegularDuplicatesIsOnAndThisItemAlready =
  'Filter out regular duplicates is on and this item already has a Regular collection in this world mode.';
const sharedThatUsernameIsAlreadyInUse = 'That username is already in use.';
const sharedTheCurrentPasswordIsIncorrect =
  'The current password is incorrect.';
const sharedChooseANewPasswordToFinishAccountSetup =
  'Choose a new password to finish account setup.';
const sharedChooseAPasswordDifferentFromYourCurrentPassword =
  'Choose a password different from your current password.';
const sharedYourAccountChangedSignInAgainBeforeRetrying =
  'Your account changed. Sign in again before retrying.';
const sharedAPageWithThisNameAlreadyExistsInThisCategory =
  'A page with this name already exists in this category.';
const sharedChooseDistinctActiveCatalogItems =
  'Choose distinct active catalog items.';
const sharedTheCatalogHasReachedItsPageOrItemSlotLimit =
  'The catalog has reached its page or item-slot limit.';
const sharedAnInGameItemIdAlreadyBelongsToAnotherItem =
  'An in-game item ID already belongs to another item.';
const sharedASectionWithThisNameAlreadyExists =
  'A section with this name already exists.';
const sharedAPageWithThisNameAlreadyExistsInThisSection =
  'A page with this name already exists in this section.';
const sharedOnlySectionsWithNoPagesCanBeDeleted =
  'Only sections with no pages can be deleted.';
const sharedAnotherChangeWasSavedLoadTheLatestDataBeforeTrying =
  'Another change was saved. Load the latest data before trying again.';
const sharedHardcoreSupportsRegularCollectionsOnly =
  'Hardcore supports Regular collections only.';
const sharedEnterDistinctPositiveInGameItemIds =
  'Enter distinct positive in-game item IDs.';
const sharedSubmissions = 'Submissions';
const sharedItemsCatalog = 'Items catalog';
const sharedSchedulingAndCompetitions = 'Scheduling and Competitions';
const sharedSiteSettings = 'Site settings';
const sharedHardcoreWorlds = 'Hardcore worlds';
const sharedRuneLiteSubmissions = 'RuneLite submissions';
const sharedDiscordBot = 'Discord bot';
const sharedModeratorAccounts = 'Moderator accounts';
const sharedOnlyTheAdministratorCanCreateModeratorAccounts =
  'Only the administrator can create moderator accounts.';
const sharedYourAccountIsNotAllowedToViewThisPage =
  'Your account is not allowed to view this page.';
const sharedDisabled = 'Disabled';
const sharedDelete = 'Delete';
const sharedCancel = 'Cancel';
const sharedIncorrectUsernameOrPassword = 'Incorrect username or password.';
const sharedCouldNotCheckAdminAccessReloadToTryAgain =
  'Could not check admin access. Reload to try again.';
const sharedClanAdministration = 'Clan administration';
const sharedPageNavigation = 'Page navigation';
const sharedReloadPage = 'Reload page';
const sharedRetryNavigation = 'Retry navigation';
const sharedCancelNavigation = 'Cancel navigation';
const sharedCheckingAdminAccess = 'Checking admin access…';
const sharedPreparingThisPageBeforeShowingItsForms =
  'Preparing this page before showing its forms.';
const sharedSubmissionScreenshot = 'Submission screenshot';
const sharedUnmatched = 'Unmatched';
const sharedSymbol5 = '?';
const sharedAwaitingItemMatch = 'Awaiting item match';
const sharedEventCollection = 'Event collection';
const sharedRegularCollection = 'Regular collection';
const sharedCollectionLogPages = 'Collection log pages';
const sharedStart = 'Start: ';
const sharedEnd = 'End: ';
const sharedAborted = 'Aborted';
const sharedClanCollectionLog = 'Clan Collection Log';
const sharedChooseALogoUpTo10MiB = 'Choose a logo up to 10 MiB.';
const sharedNone = 'None';
const sharedAddNewItem = 'Add new item';
const sharedEnterAName = 'Enter a name.';
const sharedItemName = 'Item name';
const sharedSymbol11 = '×';
const sharedClanCollectionLog2 = 'Clan collection log';
const sharedBefore = 'Before';
const sharedAfter = 'After';
const sharedUnavailable2 = 'Unavailable';
const sharedChooseAPngScreenshotUpTo10MiB =
  'Choose a PNG screenshot up to 10 MiB.';
const sharedManualSubmission = 'Manual submission';
const sharedCollectorName = 'Collector name';
const sharedSearchCatalogItems = 'Search catalog items';
const sharedCanonicalItem = 'Canonical item';
const sharedCollectionDate = 'Collection date';
const sharedObtainedDuringEvents = 'Obtained during events';
const sharedCollectedOnHardcoreWorlds = 'Collected on hardcore worlds';
const sharedOnlyPendingOrApprovedClaimsCanBeEdited =
  'Only pending or approved claims can be edited.';
const sharedNoClaimCorrectionsToSave = 'No claim corrections to save.';
const sharedNoReviewNoteChangesToSave = 'No review note changes to save.';
const sharedCheckTheSavedItemCollectorDateWorldModeAndProof =
  'Check the saved item, collector, date, world mode and proof, then tick the proof acknowledgement.';
const sharedEnterAReasonBeforeRejectingASubmission =
  'Enter a reason before rejecting a submission.';
const sharedEnterAReasonBeforeRevokingACredit =
  'Enter a reason before revoking a credit.';
const sharedThereAreNoClaimCorrectionsToDiscard =
  'There are no claim corrections to discard.';
const sharedThereAreNoReviewNoteChangesToDiscard =
  'There are no review note changes to discard.';
const sharedReloadSubmission = 'Reload submission';
const sharedCollectionType = 'Collection type';
const sharedSubmittedItemName = 'Submitted item name';
const sharedGameItemId = 'Game item ID';
const sharedClanName = 'Clan name';
const sharedCollectionLog2 = 'collection log';
const sharedHowToSubmit = 'How to submit';
const sharedLoadingTimedOutRetryOrCancelNavigation =
  'Loading timed out. Retry or cancel navigation.';
const sharedThisPageCouldNotBeLoadedRetryOrCancelNavigation =
  'This page could not be loaded. Retry or cancel navigation.';
const sharedTheXpTrackerHasReachedIts2000EventCapacityExisting =
  'The XP tracker has reached its 2000-event capacity. Existing events can still be refreshed.';
const sharedUseHttpsWiseoldmanNetCompetitionsId =
  'Use https://wiseoldman.net/competitions/<id>.';
const sharedAdminSignInIsNotConfigured = 'Admin sign-in is not configured.';
const sharedClanApiKeyStorageIsUnavailable =
  'Clan API key storage is unavailable.';
const sharedClanBrandingUnavailable = 'Clan branding unavailable.';
const sharedChooseAnExistingCatalogItem = 'Choose an existing catalog item.';
const sharedIconNotFound = 'Icon not found.';
const sharedAUuidIdempotencyKeyIsRequired =
  'A UUID Idempotency-Key is required.';
const sharedApiKeySettingsChangedReloadBeforeSavingAgain =
  'API key settings changed. Reload before saving again.';
const sharedMetricDefinitionsChangedPreviewAgain =
  'Metric definitions changed. Preview again.';
const sharedStaffSignInIsNotConfigured = 'Staff sign-in is not configured.';
const sharedDiscordSettingsAreUnavailable = 'Discord settings are unavailable.';
const sharedXpEventLimitExceeded = 'XP event limit exceeded.';
const sharedXpStateUnavailable = 'XP state unavailable.';
const sharedTheScheduleLimitHasBeenReached =
  'The schedule limit has been reached.';
const sharedChooseActiveCollectionLogPages =
  'Choose active collection log pages.';
const sharedInvalidSubmissionJson = 'Invalid submission JSON.';
const sharedInvalidSubmissionFields = 'Invalid submission fields.';
const sharedSupplyOneScreenshotFile = 'Supply one screenshot file.';
const sharedUseAWorldTypeIdentifierOrAJsonArrayOf =
  'Use a world type identifier or a JSON array of world type identifiers.';
const sharedSubmissionKeyAlreadyUsedForADifferentRequest =
  'Submission key already used for a different request.';
const sharedSubmissionFiltersAreUnavailable =
  'Submission filters are unavailable.';
const sharedSubmissionNotFound = 'Submission not found.';
const sharedPageSizeMustBeBetween1And20 = 'Page size must be between 1 and 20.';
const sharedRuneLiteSettingsUnavailable = 'RuneLite settings unavailable.';
const sharedInvalidRuneLiteSettings = 'Invalid RuneLite settings.';
const sharedInvalidSchedule = 'Invalid schedule.';
const sharedInvalidOrDuplicateWomMetricScope =
  'Invalid or duplicate WOM metric scope.';
const sharedDatabaseUrlIsRequired2 = 'DATABASE_URL is required';

/** apps/web / AccessControlSettings. */
export const webAccessControlSettingsAccessControlIsUnavailableReloadThisPage =
  'Access control is unavailable. Reload this page.';

export const webAccessControlSettingsAccessControl = sharedAccessControl;

export const webAccessControlSettingsChooseWhichPagesAllModeratorsCanAccessAdministratorOnlyControls =
  'Choose which pages all moderators can access. Administrator-only controls remain restricted.';

export const webAccessControlSettingsAccessControlSaved =
  'Access control saved.';

export const webAccessControlSettingsModeratorPageAccess =
  'Moderator page access';

export const webAccessControlSettingsOn = sharedOn;

export const webAccessControlSettingsOff = sharedOff;

export const webAccessControlSettingsSaveChanges = sharedSaveChanges;

export const webAccessControlSettingsDiscardChanges = sharedDiscardChanges;

/** apps/web / AccountSettings. */
export const webAccountSettingsChangeYourPasswordToContinue =
  'Change your password to continue';

export const webAccountSettingsYourAccount = sharedYourAccount;

export const webAccountSettingsChooseANewPasswordBeforeUsingTheStaffToolsYou =
  'Choose a new password before using the staff tools. You can also change your username here.';

export const webAccountSettingsTheNewPasswordsDoNotMatch =
  'The new passwords do not match.';

export const webAccountSettingsAccountUpdatedOtherSessionsHaveBeenSignedOut =
  'Account updated. Other sessions have been signed out.';

export const webAccountSettingsUsername = sharedUsername;

export const webAccountSettingsText332LettersNumbersDotsUnderscoresOrHyphens =
  '3–32 letters, numbers, dots, underscores or hyphens.';

export const webAccountSettingsCurrentPassword = 'Current password';

export const webAccountSettingsNewPassword = 'New password';

export const webAccountSettingsUseAtLeast12Characters =
  'Use at least 12 characters.';

export const webAccountSettingsConfirmNewPassword = 'Confirm new password';

export const webAccountSettingsSaving = sharedSaving;

export const webAccountSettingsSaveAccount = 'Save account';

/** apps/web / activity-range. */
export const webActivityRangeJan = 'Jan';

export const webActivityRangeFeb = 'Feb';

export const webActivityRangeMar = 'Mar';

export const webActivityRangeApr = 'Apr';

export const webActivityRangeMay = 'May';

export const webActivityRangeJun = 'Jun';

export const webActivityRangeJul = 'Jul';

export const webActivityRangeAug = 'Aug';

export const webActivityRangeSep = 'Sep';

export const webActivityRangeOct = 'Oct';

export const webActivityRangeNov = 'Nov';

export const webActivityRangeDec = 'Dec';

/** apps/web / ActivityCompetitions. */
export const webActivityCompetitionsCompetitionsCouldNotBeRefreshed =
  sharedCompetitionsCouldNotBeRefreshed;

export const webActivityCompetitionsActivityCompetitions =
  'Activity competitions';

export const webActivityCompetitionsRetryCompetitions = 'Retry competitions';

export const webActivityCompetitionsLoadingCompetitions =
  'Loading competitions…';

export const webActivityCompetitionsNoActivityCompetitionsYet =
  'No activity competitions yet.';

export const webActivityCompetitionsCompetitionLink = (title: string) =>
  `${title} ↗`;

/** apps/web / admin-api. */
export const webAdminApiAnApprovedEventCollectionAlreadyExistsForThisItemRevoke =
  sharedAnApprovedEventCollectionAlreadyExistsForThisItemRevoke;

export const webAdminApiFilterOutRegularDuplicatesIsOnAndThisItemAlready =
  sharedFilterOutRegularDuplicatesIsOnAndThisItemAlready;

export const webAdminApiThatUsernameIsAlreadyInUse =
  sharedThatUsernameIsAlreadyInUse;

export const webAdminApiTheCurrentPasswordIsIncorrect =
  sharedTheCurrentPasswordIsIncorrect;

export const webAdminApiChooseANewPasswordToFinishAccountSetup =
  sharedChooseANewPasswordToFinishAccountSetup;

export const webAdminApiChooseAPasswordDifferentFromYourCurrentPassword =
  sharedChooseAPasswordDifferentFromYourCurrentPassword;

export const webAdminApiYourAccountChangedSignInAgainBeforeRetrying =
  sharedYourAccountChangedSignInAgainBeforeRetrying;

export const webAdminApiAPageWithThisNameAlreadyExistsInThisCategory =
  sharedAPageWithThisNameAlreadyExistsInThisCategory;

export const webAdminApiChooseDistinctActiveCatalogItems =
  sharedChooseDistinctActiveCatalogItems;

export const webAdminApiTheCatalogHasReachedItsPageOrItemSlotLimit =
  sharedTheCatalogHasReachedItsPageOrItemSlotLimit;

export const webAdminApiAnInGameItemIdAlreadyBelongsToAnotherItem =
  sharedAnInGameItemIdAlreadyBelongsToAnotherItem;

export const webAdminApiASectionWithThisNameAlreadyExists =
  sharedASectionWithThisNameAlreadyExists;

export const webAdminApiAPageWithThisNameAlreadyExistsInThisSection =
  sharedAPageWithThisNameAlreadyExistsInThisSection;

export const webAdminApiOnlySectionsWithNoPagesCanBeDeleted =
  sharedOnlySectionsWithNoPagesCanBeDeleted;

export const webAdminApiAnApprovedCreditAlreadyExistsForThisItemAndWorld =
  'An approved credit already exists for this item and world mode. Revoke the existing credit or select a different item or mode.';

export const webAdminApiYourSessionExpiredSignInAgain =
  'Your session expired. Sign in again.';

export const webAdminApiYourAccountIsNotAllowedToAdministerTheClan =
  'Your account is not allowed to administer the clan.';

export const webAdminApiAnotherChangeWasSavedLoadTheLatestDataBeforeTrying =
  sharedAnotherChangeWasSavedLoadTheLatestDataBeforeTrying;

export const webAdminApiTheUploadedImageIsTooLarge =
  'The uploaded image is too large.';

export const webAdminApiTheServerCouldNotValidateTheseFieldsReviewThemBefore =
  'The server could not validate these fields. Review them before retrying.';

export const webAdminApiTheAdminServiceIsNotAvailableYet =
  'The admin service is not available yet.';

export const webAdminApiTheRequestCouldNotBeCompletedReloadOrRetryTo =
  'The request could not be completed. Reload or retry to check the current result.';

export const webAdminApiUnexpectedAccessControlReceipt =
  'Unexpected access control receipt.';

export const webAdminApiDiscordStatusIsUnavailable =
  'Discord status is unavailable.';

export const webAdminApiInvalidDiscordStatus = 'Invalid Discord status.';

export const webAdminApiUnexpectedDiscordSettingsReceipt =
  'Unexpected Discord settings receipt.';

export const webAdminApiUnexpectedDiscordRegistrationReceipt =
  'Unexpected Discord registration receipt.';

export const webAdminApiUnexpectedSubmissionFilterReceipt =
  'Unexpected submission filter receipt.';

export const webAdminApiUnexpectedSchedulingReceipt =
  'Unexpected scheduling receipt.';

export const webAdminApiUnexpectedScheduleReceipt =
  'Unexpected schedule receipt.';

export const webAdminApiUnexpectedScheduleDeletionReceipt =
  'Unexpected schedule deletion receipt.';

export const webAdminApiUnexpectedRuneLiteSettingsReceipt =
  'Unexpected RuneLite settings receipt.';

export const webAdminApiUnexpectedModeratorAccountReceipt =
  'Unexpected moderator account receipt.';

export const webAdminApiUnexpectedPageCreationReceipt =
  'Unexpected page creation receipt.';

export const webAdminApiUnexpectedPageDeletionReceipt =
  'Unexpected page deletion receipt.';

export const webAdminApiUnexpectedPageOrderReceipt =
  'Unexpected page order receipt.';

export const webAdminApiUnexpectedCatalogDeletionReceipt =
  'Unexpected catalog deletion receipt.';

export const webAdminApiUnexpectedAccountCreationStatus =
  'Unexpected account creation status.';

export const webAdminApiUnexpectedAccountUpdateReceipt =
  'Unexpected account update receipt.';

export const webAdminApiUnexpectedManualSubmissionStatus =
  'Unexpected manual submission status.';

export const webAdminApiUnexpectedManualSubmissionReceipt =
  'Unexpected manual submission receipt.';

export const webAdminApiUnexpectedApiKeyReceipt = 'Unexpected API key receipt.';

export const webAdminApiTheLogoCouldNotBeDecodedChooseASupportedImage =
  'The logo could not be decoded. Choose a supported image within the listed limits.';

export const webAdminApiUnexpectedLogoReceipt = 'Unexpected logo receipt.';

export const webAdminApiUnexpectedSettingsReceipt =
  'Unexpected settings receipt.';

export const webAdminApiUnexpectedSectionReceipt =
  'Unexpected section receipt.';

export const webAdminApiUnexpectedSubmissionIdentity =
  'Unexpected submission identity.';

export const webAdminApiUnexpectedCorrectionReceipt =
  'Unexpected correction receipt.';

export const webAdminApiUnexpectedReviewNoteReceipt =
  'Unexpected review note receipt.';

export const webAdminApiUnexpectedReviewReceipt = 'Unexpected review receipt.';

export const webAdminApiUnexpectedCollectionFlagsReceipt =
  'Unexpected collection flags receipt.';

export const webAdminApiStaged = 'Staged';

export const webAdminApiUnexpectedItemMemberships =
  'Unexpected item memberships.';

export const webAdminApiUnexpectedCreatedItem = 'Unexpected created item.';

export const webAdminApiUnexpectedSavedPageOrder =
  'Unexpected saved page order.';

/** apps/web / admin-model. */
export const webAdminModelSubmissionDate = 'Submission date';

export const webAdminModelCollectorSupplied = 'Collector supplied';

export const webAdminModelAdminCorrection = 'Admin correction';

export const webAdminModelInvalidStaffAccount = 'Invalid staff account.';

export const webAdminModelInvalidAdminResponse = 'Invalid admin response.';

export const webAdminModelInvalidScreenshotPath = 'Invalid screenshot path.';

export const webAdminModelInvalidSubmissionData = 'Invalid submission data.';

export const webAdminModelInvalidSavedReviewNote = 'Invalid saved review note.';

export const webAdminModelQueuePageExceedsSupportedSize =
  'Queue page exceeds supported size.';

export const webAdminModelUnexpectedSubmissionView =
  'Unexpected submission view.';

export const webAdminModelUnexpectedAuditIdentity =
  'Unexpected audit identity.';

export const webAdminModelAuditPageExceedsSupportedSize =
  'Audit page exceeds supported size.';

export const webAdminModelSelectASpecificCatalogItemBeforeSavingOrApproving =
  'Select a specific catalog item before saving or approving.';

export const webAdminModelEnterACollectorNameOf180Characters =
  'Enter a collector name of 1–80 characters.';

export const webAdminModelKeepTheReviewReasonTo1000Characters =
  'Keep the review reason to 1,000 characters.';

export const webAdminModelInvalidHardcoreClaim = 'Invalid hardcore claim.';

export const webAdminModelSelectAValidCollectionType =
  'Select a valid collection type.';

export const webAdminModelHardcoreSupportsRegularCollectionsOnly =
  sharedHardcoreSupportsRegularCollectionsOnly;

export const webAdminModelEnterAnItemNameOf1200Characters =
  'Enter an item name of 1–200 characters.';

export const webAdminModelChooseAndUploadAnItemIcon =
  'Choose and upload an item icon.';

export const webAdminModelEnterDistinctPositiveInGameItemIds =
  sharedEnterDistinctPositiveInGameItemIds;

export const webAdminModelSelectOneOrMoreExistingCollectionLogPages =
  'Select one or more existing collection-log pages.';

export const webAdminModelEnterPositiveInGameItemIdsSeparatedByCommas =
  'Enter positive in-game item IDs separated by commas.';

export const webAdminModelAnOrderMustContainEveryCurrentPageItemExactlyOnce =
  'An order must contain every current page item exactly once.';

export const webAdminModelInvalidItemPosition = 'Invalid item position.';

export const webAdminModelChooseAPngOrWebPIconUpTo2MiB =
  'Choose a PNG or WebP icon up to 2 MiB.';

export const webAdminModelTheIconContentDoesNotMatchItsPngWebPFile =
  'The icon content does not match its PNG/WebP file type.';

export const webAdminModelIconWidthAndHeightMustBeBetween1And512 =
  'Icon width and height must be between 1 and 512 pixels.';

/** apps/web / admin-route-data. */
export const webAdminRouteDataSubmissions = sharedSubmissions;

export const webAdminRouteDataItemsCatalog = sharedItemsCatalog;

export const webAdminRouteDataSchedulingAndCompetitions =
  sharedSchedulingAndCompetitions;

export const webAdminRouteDataSiteSettings = sharedSiteSettings;

export const webAdminRouteDataHardcoreWorlds = sharedHardcoreWorlds;

export const webAdminRouteDataRuneLiteSubmissions = sharedRuneLiteSubmissions;

export const webAdminRouteDataDiscordBot = sharedDiscordBot;

export const webAdminRouteDataModeratorAccounts = sharedModeratorAccounts;

export const webAdminRouteDataAccessControl = sharedAccessControl;

export const webAdminRouteDataYourAccount = sharedYourAccount;

export const webAdminRouteDataOnlyTheAdministratorCanCreateModeratorAccounts =
  sharedOnlyTheAdministratorCanCreateModeratorAccounts;

export const webAdminRouteDataOnlyTheAdministratorCanManageAccessControl =
  'Only the administrator can manage access control.';

export const webAdminRouteDataYourAccountIsNotAllowedToViewThisPage =
  sharedYourAccountIsNotAllowedToViewThisPage;

/** apps/web / AdminAccounts. */
export const webAdminAccountsAccountsCouldNotBeLoadedRetryToRefreshTheList =
  'Accounts could not be loaded. Retry to refresh the list.';

export const webAdminAccountsModerator = (
  username: string,
  change: 'enable' | 'disable' | 'delete',
) =>
  `Moderator ${username} ${change === 'enable' ? 'enabled' : change === 'disable' ? 'disabled' : 'deleted'}.`;

export const webAdminAccountsModeratorAccounts = sharedModeratorAccounts;

export const webAdminAccountsModeratorCreated = (username: string) =>
  `Moderator ${username} created.`;

export const webAdminAccountsModeratorUsername = 'Moderator username';

export const webAdminAccountsTemporaryPassword = 'Temporary password';

export const webAdminAccountsUseAtLeast12CharactersAndShareTheseCredentialsWith =
  'Use at least 12 characters and share these credentials with the moderator.';

export const webAdminAccountsCreating = 'Creating…';

export const webAdminAccountsCreateModerator = 'Create moderator';

export const webAdminAccountsRetryAccounts = 'Retry accounts';

export const webAdminAccountsLoadingAccounts = 'Loading accounts…';

export const webAdminAccountsExistingAccounts = 'Existing accounts';

export const webAdminAccountsSeparator = ' · ';

export const webAdminAccountsSeparator2 = ' ·';

export const webAdminAccountsDisabled = sharedDisabled;

export const webAdminAccountsPasswordChangeRequired =
  'Password change required';

export const webAdminAccountsActive = 'Active';

export const webAdminAccountsAccountAction = (
  disabled: boolean,
  username: string,
) => `${disabled ? 'Enable' : 'Disable'} ${username}`;

export const webAdminAccountsEnable = 'Enable';

export const webAdminAccountsDisable = 'Disable';

export const webAdminAccountsDelete = (username: string) =>
  `Delete ${username}`;

export const webAdminAccountsDelete2 = sharedDelete;

export const webAdminAccountsConfirmModeratorDeletion =
  'Confirm moderator deletion';

export const webAdminAccountsConfirmDeletion = (username: string) =>
  `Delete ${username}? Their access ends immediately. Past submissions and review history are preserved.`;

export const webAdminAccountsConfirmDeleteModerator =
  'Confirm delete moderator';

export const webAdminAccountsCancel = sharedCancel;

export const webAdminAccountsNoModeratorAccountsHaveBeenCreated =
  'No moderator accounts have been created.';

/** apps/web / AdminCatalogPage. */
export const webAdminCatalogPageCatalogCouldNotBeLoadedTheLastSuccessfulSnapshotIs =
  'Catalog could not be loaded. The last successful snapshot is preserved.';

export const webAdminCatalogPageLoadingCatalog = 'Loading catalog…';

export const webAdminCatalogPageRetryCatalog = 'Retry catalog';

/** apps/web / AdminPage. */
export const webAdminPageAdminNavigation = 'Admin navigation';

export const webAdminPageAccessControl = sharedAccessControl;

export const webAdminPageModeratorAccounts = sharedModeratorAccounts;

export const webAdminPageYourAccount = sharedYourAccount;

export const webAdminPageSessionNotEstablished = 'Session not established.';

export const webAdminPageIncorrectUsernameOrPassword =
  sharedIncorrectUsernameOrPassword;

export const webAdminPageTooManyAttemptsTryAgainLater =
  'Too many attempts. Try again later.';

export const webAdminPageCouldNotSignInCheckYourCredentialsAndTryAgain =
  'Could not sign in. Check your credentials and try again.';

export const webAdminPageCouldNotCheckAdminAccessReloadToTryAgain =
  sharedCouldNotCheckAdminAccessReloadToTryAgain;

export const webAdminPageClanAdministration = sharedClanAdministration;

export const webAdminPageSignOut = 'Sign out';

export const webAdminPagePageNavigation = sharedPageNavigation;

export const webAdminPageReloadPage = sharedReloadPage;

export const webAdminPageRetryNavigation = sharedRetryNavigation;

export const webAdminPageCancelNavigation = sharedCancelNavigation;

export const webAdminPageAdminAccessUnavailable = 'Admin access unavailable';

export const webAdminPageRetryAdminAccess = 'Retry admin access';

export const webAdminPageCheckingAdminAccess = sharedCheckingAdminAccess;

export const webAdminPageAdminSessionExpired = 'Admin session expired';

export const webAdminPageAdminSignInRequired = 'Admin sign-in required';

export const webAdminPageSignInWithYourAdministratorOrModeratorAccount =
  'Sign in with your administrator or moderator account.';

export const webAdminPageUsername = sharedUsername;

export const webAdminPagePassword = 'Password';

export const webAdminPageSigningIn = 'Signing in…';

export const webAdminPageSignIn = 'Sign in';

export const webAdminPageSubmissions = sharedSubmissions;

export const webAdminPagePreparingThisPageBeforeShowingItsForms =
  sharedPreparingThisPageBeforeShowingItsForms;

export const webAdminPageYourAccountIsNotAllowedToViewThisPage =
  sharedYourAccountIsNotAllowedToViewThisPage;

export const webAdminPageRuneLiteSubmissions = sharedRuneLiteSubmissions;

export const webAdminPageOnlyTheAdministratorCanCreateModeratorAccounts =
  sharedOnlyTheAdministratorCanCreateModeratorAccounts;

export const webAdminPageLoadingMessage = (value: string) =>
  `Loading ${value}…`;

/** apps/web / AdminProofLink. */
export const webAdminProofLinkSubmissionScreenshot = sharedSubmissionScreenshot;

export const webAdminProofLinkViewScreenshot = 'View screenshot';

export const webAdminProofLinkChatMessageProof = 'Chat message proof';

export const webAdminProofLinkNoProofSuppliedManualEntry =
  'No proof supplied (manual entry)';

export const webAdminProofLinkNoScreenshotSuppliedCannotApproveThisClaim =
  'No screenshot supplied — cannot approve this claim.';

/** apps/web / AdminQueue. */
export const webAdminQueueDuplicateFilterExplanation = {
  beforeState: 'Regular duplicate filtering is',
  enabled: 'enabled',
  disabled: 'disabled',
  unavailable: 'unavailable',
  afterState: '. Only the administrator can change this.',
};

export const webAdminQueueInconsistentReviewSnapshot =
  'Inconsistent review snapshot.';

export const webAdminQueueCouldNotRefreshSubmissionsTheLastSuccessfulViewIsPreserved =
  'Could not refresh submissions. The last successful view is preserved.';

export const webAdminQueueTheCurrentPageCouldNotBeLoadedReloadTheSubmissions =
  'The current page could not be loaded. Reload the submissions before paging.';

export const webAdminQueueTheRequestedPageIsNotLoadedYet =
  'The requested page is not loaded yet.';

export const webAdminQueueLoadingSubmissions = 'Loading submissions…';

export const webAdminQueueAlreadyOnTheFirstPage = 'Already on the first page.';

export const webAdminQueueAlreadyOnTheLastPage = 'Already on the last page.';

export const webAdminQueueManualSubmissionCreated = (status: string) =>
  `Manual submission created: ${status}.`;

export const webAdminQueueFilterOutRegularDuplicates =
  'Filter out regular duplicates';

export const webAdminQueueOn = sharedOn;

export const webAdminQueueOff = sharedOff;

export const webAdminQueueSubmissions = sharedSubmissions;

export const webAdminQueueRefreshSubmissions = 'Refresh submissions';

export const webAdminQueueSubmissionViews = 'Submission views';

export const webAdminQueuePending = 'Pending';

export const webAdminQueueUnmatched = sharedUnmatched;

export const webAdminQueueReviewed = 'Reviewed';

export const webAdminQueueReloadCurrentSubmissions =
  'Reload current submissions';

export const webAdminQueueReview = (collectorName: string, value: string) =>
  `Review ${collectorName} · ${value}`;

export const webAdminQueueQuestionMark = sharedSymbol5;

export const webAdminQueueNeedsItemMatch = 'Needs item match';

export const webAdminQueueGameItemId = (gameItemId: number) =>
  ` · Game item ID ${gameItemId}`;

export const webAdminQueueAwaitingItemMatch = sharedAwaitingItemMatch;

export const webAdminQueueEventCollection = sharedEventCollection;

export const webAdminQueueRegularCollection = sharedRegularCollection;

export const webAdminQueueSubmissionScreenshot = sharedSubmissionScreenshot;

export const webAdminQueueLoadingSubmissions3 = (view: string) =>
  `Loading ${view} submissions…`;

export const webAdminQueueNoSubmissionsInThisView = (value: string) =>
  `No ${value} submissions in this view.`;

export const webAdminQueuePreviousPage = 'Previous page';

export const webAdminQueueNextPage = 'Next page';

export const webAdminQueueSavedSubmissionState = (status: string) =>
  `Saved submission state: ${status}.`;

export const webAdminQueueUnmatchedMessage = (value: string) =>
  `Unmatched${value}`;

export const webAdminQueueLoadingSubmissionsMessage = (view: string) =>
  `Loading ${view} submissions…`;

export const webAdminQueuePageMessage = (length: number) => `Page ${length}`;

/** apps/web / AdminScheduling. */
export const webAdminSchedulingSchedulingCouldNotBeLoaded =
  'Scheduling could not be loaded.';

export const webAdminSchedulingTrackEventCollectionsDuringScheduledWindows =
  'Track Event collections during scheduled windows';

export const webAdminSchedulingRetryScheduling = 'Retry scheduling';

export const webAdminSchedulingCollectionLogScheduling =
  'Collection log scheduling';

export const webAdminSchedulingSchedulingEnabled = 'Scheduling enabled.';

export const webAdminSchedulingSchedulingDisabled = 'Scheduling disabled.';

export const webAdminSchedulingOn = sharedOn;

export const webAdminSchedulingOff = sharedOff;

export const webAdminSchedulingSchedulingIs = 'Scheduling is';

export const webAdminSchedulingEnabled = 'enabled';

export const webAdminSchedulingDisabled = 'disabled';

export const webAdminSchedulingOnlyTheAdministratorCanChangeThis =
  '. Only the administrator can change this.';

export const webAdminSchedulingScheduleManagement = 'Schedule management';

export const webAdminSchedulingScheduleUpdated = 'Schedule updated.';

export const webAdminSchedulingScheduleCreated = 'Schedule created.';

export const webAdminSchedulingEditSchedule = 'Edit schedule';

export const webAdminSchedulingNewSchedule = 'New schedule';

export const webAdminSchedulingScheduleName = 'Schedule name';

export const webAdminSchedulingStartDateAndTimeLocal =
  'Start date and time (local)';

export const webAdminSchedulingEndDateAndTimeLocal =
  'End date and time (local)';

export const webAdminSchedulingFindCollectionLogPages =
  'Find collection log pages';

export const webAdminSchedulingCollectionLogPages = sharedCollectionLogPages;

export const webAdminSchedulingLoadingPages = 'Loading pages…';

export const webAdminSchedulingOpenParenthesis = ' (';

export const webAdminSchedulingCloseParenthesis = ')';

export const webAdminSchedulingUnavailablePage = 'Unavailable page: ';

export const webAdminSchedulingRemoveBeforeSaving = ' (remove before saving)';

export const webAdminSchedulingSaveSchedule = 'Save schedule';

export const webAdminSchedulingCreateSchedule = 'Create schedule';

export const webAdminSchedulingCancelEdit = 'Cancel edit';

export const webAdminSchedulingSavedSchedules = 'Saved schedules';

export const webAdminSchedulingNoSchedulesYet = 'No schedules yet.';

export const webAdminSchedulingInactiveWhileSchedulingIsDisabled =
  'Inactive while scheduling is disabled';

export const webAdminSchedulingUpcoming = 'Upcoming';

export const webAdminSchedulingOpenNow = 'Open now';

export const webAdminSchedulingEnded = 'Ended';

export const webAdminSchedulingStart = sharedStart;

export const webAdminSchedulingEnd = sharedEnd;

export const webAdminSchedulingUnavailablePage2 = (id: string) =>
  `Unavailable page: ${id}`;

export const webAdminSchedulingEdit = 'Edit';

export const webAdminSchedulingDelete = sharedDelete;

export const webAdminSchedulingDeleteSchedule = 'Delete schedule';

export const webAdminSchedulingScheduleDeleted = 'Schedule deleted.';

export const webAdminSchedulingConfirmDeleteSchedule =
  'Confirm delete schedule';

export const webAdminSchedulingKeepSchedule = 'Keep schedule';

export const webAdminSchedulingStartUTC = (value: null | string) =>
  `Start UTC: ${typeof value === 'boolean' ? '' : (value ?? '')}`;

export const webAdminSchedulingEndUTC = (value: null | string) =>
  `End UTC: ${typeof value === 'boolean' ? '' : (value ?? '')}`;

export const webAdminSchedulingPagesSelectedMessage = (length: number) =>
  `${length} pages selected.`;

export const webAdminSchedulingPagesMessage = (value: string) =>
  `Pages: ${value}`;

export const webAdminSchedulingDeletePagesWillFollowTheRemainingSchedules = (
  title: string,
) => `Delete “${title}”? Pages will follow the remaining schedules.`;

/** apps/web / AdminSettings. */
export const webAdminSettingsSiteSettingsAreUnavailableReloadToTryAgain =
  'Site settings are unavailable. Reload to try again.';

export const webAdminSettingsEnableHardcoreWorlds = 'Enable hardcore worlds';

export const webAdminSettingsHardcoreWorldsEnabled = 'Hardcore worlds enabled.';

export const webAdminSettingsHardcoreWorldsDisabled =
  'Hardcore worlds disabled.';

export const webAdminSettingsOn = sharedOn;

export const webAdminSettingsOff = sharedOff;

export const webAdminSettingsHardcoreWorldsSettings =
  'Hardcore worlds settings';

export const webAdminSettingsSiteSettings = sharedSiteSettings;

export const webAdminSettingsOnlyTheAdministratorCanChangeTheseSettings =
  'Only the administrator can change these settings.';

export const webAdminSettingsRetrySettings = 'Retry settings';

export const webAdminSettingsSiteSettingsSavedLogoChangesRemainUnsavedRetrySaveTo =
  'Site settings saved. Logo changes remain unsaved; retry Save to finish.';

export const webAdminSettingsHardcoreWorldsSettingsSaved =
  'Hardcore worlds settings saved.';

export const webAdminSettingsSiteSettingsSaved = 'Site settings saved.';

export const webAdminSettingsDisplayedClanName = 'Displayed clan name';

export const webAdminSettingsWebsiteText = 'Website text';

export const webAdminSettingsCollectionLogTitle = 'Collection log title';

export const webAdminSettingsCollectionLogCaption = 'Collection log caption';

export const webAdminSettingsXpSectionTitle = 'XP section title';

export const webAdminSettingsXpSectionTitleSectionIsDisabledUntilWomAddsSupport =
  'XP section title (section is disabled until WOM adds support)';

export const webAdminSettingsHardcoreCollectionHighlight =
  'Hardcore collection highlight';

export const webAdminSettingsEventCollectionHighlight =
  'Event collection highlight';

export const webAdminSettingsSubmissionHelp = 'Submission help';

export const webAdminSettingsHowToSubmitMarkdown = 'How to submit (Markdown)';

export const webAdminSettingsUseAtMost32KiBOfUtf8TextWith =
  'Use at most 32 KiB of UTF-8 text with no NUL characters.';

export const webAdminSettingsHidePreview = 'Hide preview';

export const webAdminSettingsPreviewInstructions = 'Preview instructions';

export const webAdminSettingsSubmissionHelpPreview = 'Submission help preview';

export const webAdminSettingsSaveHardcoreSettings = 'Save hardcore settings';

export const webAdminSettingsSaveSiteSettings = 'Save site settings';

export const webAdminSettingsDiscardChanges = sharedDiscardChanges;

/** apps/web / api. */
export const webApiPublicLogRequestFailed = (status: number) =>
  `Public log request failed (${status})`;

export const webApiAborted = sharedAborted;

/** apps/web / App. */
export const webAppPageNavigation = sharedPageNavigation;

export const webAppLoadingPage = 'Loading page…';

export const webAppReloadPage = sharedReloadPage;

export const webAppRetryNavigation = sharedRetryNavigation;

export const webAppCancelNavigation = sharedCancelNavigation;

export const webAppClanCollectionLog = sharedClanCollectionLog;

export const webAppCheckingAdminAccess = sharedCheckingAdminAccess;

export const webAppPreparingThisPageBeforeShowingItsForms =
  sharedPreparingThisPageBeforeShowingItsForms;

/** apps/web / branding. */
export const webBrandingInvalidClanBranding = 'Invalid clan branding.';

export const webBrandingChooseALogoUpTo10MiB = sharedChooseALogoUpTo10MiB;

/** apps/web / catalog-update-api. */
export const webCatalogUpdateApiInvalidCatalogUpdateHash =
  'Invalid catalog update hash.';

export const webCatalogUpdateApiInvalidCatalogImagePath =
  'Invalid catalog image path.';

export const webCatalogUpdateApiInvalidCatalogUpdateRevision =
  'Invalid catalog update revision.';

export const webCatalogUpdateApiInvalidCatalogProposal =
  'Invalid catalog proposal.';

export const webCatalogUpdateApiCatalogReviewIsTooLarge =
  'Catalog review is too large.';

export const webCatalogUpdateApiInvalidCatalogConflict =
  'Invalid catalog conflict.';

export const webCatalogUpdateApiInvalidCatalogImageStatus =
  'Invalid catalog image status.';

export const webCatalogUpdateApiInvalidGameItemId = 'Invalid game item ID.';

export const webCatalogUpdateApiInvalidPageCandidate =
  'Invalid page candidate.';

export const webCatalogUpdateApiCatalogReviewLimitExceeded =
  'Catalog review limit exceeded.';

export const webCatalogUpdateApiUnexpectedCatalogReviewReceipt =
  'Unexpected catalog review receipt.';

export const webCatalogUpdateApiCouldNotConfirmCatalogChangesRetryTheSameChoices =
  'Could not confirm catalog changes. Retry the same choices.';

/** apps/web / catalog-update-groups. */
export const webCatalogUpdateGroupsPageNameMismatches = 'Page name mismatches';

export const webCatalogUpdateGroupsMissingPages = 'Missing pages';

export const webCatalogUpdateGroupsMissingItems = 'Missing items';

export const webCatalogUpdateGroupsIncorrectItemNames = 'Incorrect item names';

export const webCatalogUpdateGroupsIncorrectItemIds = 'Incorrect item ids';

export const webCatalogUpdateGroupsMissingItemPageRelationships =
  'Missing item-page relationships';

export const webCatalogUpdateGroupsIncorrectItemPageRelationships =
  'Incorrect item-page relationships';

export const webCatalogUpdateGroupsNone = sharedNone;

export const webCatalogUpdateGroupsMissing = 'Missing';

export const webCatalogUpdateGroupsItemIds = (
  name: string,
  ids: readonly string[],
) => `${name} ${ids.length > 1 ? 'IDs' : 'ID'} ${ids.join(', ') || sharedNone}`;
export const webCatalogUpdateGroupsMissingEntity = (label: string) =>
  `Missing → ${label}`;
export const webCatalogUpdateGroupsAddLink = (page: string, item: string) =>
  `None → ${page} / ${item}`;
export const webCatalogUpdateGroupsRemoveLink = (page: string, item: string) =>
  `${page} / ${item} → None`;
export const webCatalogUpdateGroupsAdopt = (label: string) =>
  `${label} (unlinked) → ${label} (linked)`;
export const webCatalogUpdateGroupsCategoryChange = (
  label: string,
  before: string,
  after: string,
) => `${label} (${before}) → ${label} (${after})`;
export const webCatalogUpdateGroupsChange = (before: string, after: string) =>
  `${before} → ${after}`;

export const domainDisplayXpUnit = 'XP';
export const webXpAmountUnavailableValue = '—';
export const webActivityCompetitionsDateSeparator = ' -';

/** apps/web / CatalogInspector. */
export const webCatalogInspectorCreateEntry = (section: boolean) =>
  `Create ${section ? 'section' : 'page'}`;

export const webCatalogInspectorThisPageIsNoLongerInTheCatalogCloseThe =
  'This page is no longer in the catalog. Close the editor and select another page.';

export const webCatalogInspectorAddItem = 'Add item';

export const webCatalogInspectorAddNewItem = sharedAddNewItem;

export const webCatalogInspectorAddExistingItem = 'Add existing item';

export const webCatalogInspectorEnterAName = sharedEnterAName;

export const webCatalogInspectorChangesSaved = 'Changes saved.';

export const webCatalogInspectorAddSection = 'Add section';

export const webCatalogInspectorEditSection = 'Edit section';

export const webCatalogInspectorAddPage = 'Add page';

export const webCatalogInspectorEditPage = 'Edit page';

export const webCatalogInspectorEditItem = 'Edit item';

export const webCatalogInspectorThisCatalogEntryIsNoLongerAvailableCloseTheEditor =
  'This catalog entry is no longer available. Close the editor and select another entry.';

export const webCatalogInspectorMoveEarlier = 'Move earlier';

export const webCatalogInspectorMoveLater = 'Move later';

export const webCatalogInspectorSearchItems = 'Search items';

export const webCatalogInspectorSearchByNameOrId = 'Search by name or ID';

export const webCatalogInspectorAddToPage = (name: string) =>
  `Add ${name} to page`;

export const webCatalogInspectorAdded = (name: string) => `${name} added.`;

export const webCatalogInspectorAlreadyOnThisPage = 'Already on this page';

export const webCatalogInspectorOnOtherPages = 'On other pages';

export const webCatalogInspectorPageless = 'Pageless';

export const webCatalogInspectorNoMatchingItems = 'No matching items.';

export const webCatalogInspectorShowingTheFirst100Matches =
  'Showing the first 100 matches.';

export const webCatalogInspectorItemName = sharedItemName;

export const webCatalogInspectorSectionName = 'Section name';

export const webCatalogInspectorPageName = 'Page name';

export const webCatalogInspectorInGameItemIds = 'In-game item IDs';

export const webCatalogInspectorIdsSeparatedByCommas =
  'IDs separated by commas';

export const webCatalogInspectorRetryCreation = 'Retry creation';

export const webCatalogInspectorSaveChanges = sharedSaveChanges;

export const webCatalogInspectorDiscardCreationRequest =
  'Discard creation request';

export const webCatalogInspectorDeleteSection = (name: string) =>
  `Delete section ${name}?`;

export const webCatalogInspectorSectionDeleted = 'Section deleted.';

export const webCatalogInspectorDeleteSection2 = 'Delete section';

export const webCatalogInspectorOnlySectionsWithNoPagesCanBeDeleted =
  sharedOnlySectionsWithNoPagesCanBeDeleted;

export const webCatalogInspectorDeleteFromBothCollectionLogsItemsRemainOnOtherPages =
  (name: string) =>
    `Delete ${name} from both collection logs? Items remain on other pages or in the catalog as pageless items. Collection and submission history is preserved.`;

export const webCatalogInspectorPageDeleted = 'Page deleted.';

export const webCatalogInspectorDeletePage = 'Delete page';

export const webCatalogInspectorPagesContainingThisItem =
  'Pages containing this item';

export const webCatalogInspectorRemoveFrom = (name: string, name2: string) =>
  `Remove ${name} from ${name2}`;

export const webCatalogInspectorRemovedFrom = (name: string) =>
  `Removed from ${name}.`;

export const webCatalogInspectorRemove = 'Remove';

export const webCatalogInspectorThisItemIsPageless = 'This item is pageless.';

export const webCatalogInspectorDeleteFromTheCatalogAndAllItsPagesCollectionAnd =
  (name: string) =>
    `Delete ${name} from the catalog and all its pages? Collection and submission history is preserved.`;

export const webCatalogInspectorItemDeleted = 'Item deleted.';

export const webCatalogInspectorDeleteItem = 'Delete item';

/** apps/web / CatalogLogEditor. */
export const webCatalogLogEditorDiscardTheUnsavedCatalogEdit =
  'Discard the unsaved catalog edit?';

export const webCatalogLogEditorItemOrderSaved = 'Item order saved.';

export const webCatalogLogEditorReorder = (kind: string, name: string) =>
  `Reorder ${kind} ${name}`;

export const webCatalogLogEditorDragToReorderAltArrowKeysAlsoMove =
  'Drag to reorder; Alt + arrow keys also move';

export const webCatalogLogEditorDragHandle = '⋮⋮';

export const webCatalogLogEditorSettingsIcon = '⚙';

export const webCatalogLogEditorItemsCatalogCollectionLog =
  'Items catalog collection log';

export const webCatalogLogEditorItemsCatalog = sharedItemsCatalog;

export const webCatalogLogEditorCatalogSections = 'Catalog sections';

export const webCatalogLogEditorEditSection = (name: string) =>
  `Edit section ${name}`;

export const webCatalogLogEditorAddSymbol = '+';

export const webCatalogLogEditorAddSection = ' Add section';

export const webCatalogLogEditorPages = (name: string = 'Catalog') =>
  `${name} pages`;

export const webCatalogLogEditorEditPage = (name: string) =>
  `Edit page ${name}`;

export const webCatalogLogEditorAddPage = ' Add page';

export const webCatalogLogEditorItems = (name: string) => `${name} items`;

export const webCatalogLogEditorEditItem = (name: string) =>
  `Edit item ${name}`;

export const webCatalogLogEditorItemSettingsFor = (name: string) =>
  `Item settings for ${name}`;

export const webCatalogLogEditorAddItem = ' Add item';

export const webCatalogLogEditorAddAPageToThisSection =
  'Add a page to this section.';

export const webCatalogLogEditorAddASectionToStart = 'Add a section to start.';

export const webCatalogLogEditorSaving = sharedSaving;

export const webCatalogLogEditorSaveChanges = sharedSaveChanges;

export const webCatalogLogEditorCatalogEditor = 'Catalog editor';

export const webCatalogLogEditorCloseEditor = 'Close editor';

export const webCatalogLogEditorCloseSymbol = sharedSymbol11;

/** apps/web / CatalogUpdateNotice. */
export const webCatalogUpdateNoticeAdoptPage = (label: string) =>
  `Adopt ${label}`;

export const webCatalogUpdateNoticeCatalogUpdateReviewCouldNotBeLoaded =
  'Catalog update review could not be loaded.';

export const webCatalogUpdateNoticeCatalogUpdateReviewTimedOutRetryCatalogUpdates =
  'Catalog update review timed out. Retry catalog updates.';

export const webCatalogUpdateNoticeChangesSavedButTheUpdatedReviewCouldNotBeLoaded =
  'Changes saved, but the updated review could not be loaded. Retry catalog updates.';

export const webCatalogUpdateNoticeTheCatalogChangedButRefreshingFailedCancelAndRetryCatalog =
  'The catalog changed, but refreshing failed. Cancel and retry catalog updates.';

export const webCatalogUpdateNoticeTheCatalogChangedReviewTheRefreshedProblemsAndChooseYour =
  'The catalog changed. Review the refreshed problems and choose your fixes again.';

export const webCatalogUpdateNoticeSaveCouldNotBeConfirmedClickSaveToRetryThe =
  'Save could not be confirmed. Click Save to retry the same choices and recover its receipt.';

export const webCatalogUpdateNoticeCatalogUpdates = 'Catalog updates';

export const webCatalogUpdateNoticeRetryCatalogUpdates =
  'Retry catalog updates';

export const webCatalogUpdateNoticeCatalogUpdateAvailable =
  'Catalog update available';

export const webCatalogUpdateNoticeChooseTheGroupsToFixUncheckedGroupsKeepTheirCurrent =
  'Choose the groups to fix. Unchecked groups keep their current values and remain available for later review.';

export const webCatalogUpdateNoticeDetectedProblem = 'Detected problem';

export const webCatalogUpdateNoticeFix = 'Fix?';

export const webCatalogUpdateNoticeColon = ': ';

export const webCatalogUpdateNoticePageIdentityFor = 'Page identity for ';

export const webCatalogUpdateNoticeChooseAnExistingPageOrASeparatePage =
  'Choose an existing page or a separate page';

export const webCatalogUpdateNoticeCreateSeparatePage = (label: string) =>
  `Create separate page: ${label}`;

export const webCatalogUpdateNoticeNone = sharedNone;

export const webCatalogUpdateNoticeFix2 = (title: string) => `Fix ${title}`;

export const webCatalogUpdateNoticeUseProjectSuppliedItemIconsRecommended =
  'Use project supplied item icons (recommended)';

export const webCatalogUpdateNoticeNoCatalogCorrectionsArePending =
  'No catalog corrections are pending.';

export const webCatalogUpdateNoticeChooseThePageIdentityBeforeSavingMissingPages =
  'Choose the page identity before saving Missing pages.';

export const webCatalogUpdateNoticeSaving = sharedSaving;

export const webCatalogUpdateNoticeSave = 'Save';

export const webCatalogUpdateNoticeCancel = sharedCancel;

export const webCatalogUpdateNoticeReviewCatalogUpdateMessage = (
  value: number,
) => `Review catalog update (${value})`;

export const webCatalogUpdateNoticeMatchingItemsMissingExtra = (
  name: string,
  id: string,
  category: string,
  active: boolean,
  matching: string,
  missing: string,
  extra: string,
) =>
  `${name} (${id}, ${category})${active ? '' : ' — retired'}. Matching items: ${matching}. Missing: ${missing}. Extra: ${extra}.`;

/** apps/web / clan-api-key. */
export const webClanApiKeyInvalidApiKeySettings = 'Invalid API key settings.';

/** apps/web / ClanApiKeySettings. */
export const webClanApiKeySettingsClanApiKeySettingsSaved =
  'Clan API key settings saved.';

export const webClanApiKeySettingsRuneLiteSharedApiKey =
  'RuneLite shared API key';

export const webClanApiKeySettingsCurrentSharedApiKey =
  'Current shared API key';

export const webClanApiKeySettingsLoadingApiKey = 'Loading API key…';

export const webClanApiKeySettingsNewKeyGeneratedSaveToApplyIt =
  'New key generated. Save to apply it.';

export const webClanApiKeySettingsGenerateNewKey = 'Generate new key';

export const webClanApiKeySettingsSaveApiKeySettings = 'Save API key settings';

/** apps/web / ClanLogoSettings. */
export const webClanLogoSettingsClanLogoSettingsAreUnavailableRetryLogoSettings =
  'Clan logo settings are unavailable. Retry logo settings.';

export const webClanLogoSettingsClanLogo = 'Clan logo';

export const webClanLogoSettingsClanLogoSettingsAreUnavailable =
  'Clan logo settings are unavailable.';

export const webClanLogoSettingsRetryLogoSettings = 'Retry logo settings';

export const webClanLogoSettingsCurrentClanLogo = 'Current clan logo';

export const webClanLogoSettingsJpegPngGifWebPSvgAvifOrTiffUpTo =
  'JPEG, PNG, GIF, WebP, SVG, AVIF or TIFF up to 10MiB, maximum 8192x8193 pixels';

export const webClanLogoSettingsLogoImage = 'Logo image';

export const webClanLogoSettingsRestoreDefaultLogo = 'Restore default logo';

/** apps/web / CollectionLog. */
export const webCollectionLogIconUnavailable = 'Icon unavailable';

export const webCollectionLogQuestionMark = sharedSymbol5;

export const webCollectionLogItemLabel = (
  name: string,
  collected: boolean,
  hardcore: boolean,
  obtainCount: number,
) =>
  `${name}: ${collected ? 'collected' : 'not collected'}${hardcore ? ', hardcore' : ''}${obtainCount >= 2 ? `, ${obtainCount} obtains` : ''}`;

export const webCollectionLogClanCollectionLog = sharedClanCollectionLog2;

export const webCollectionLogHardcoreWorlds = ' Hardcore worlds';

export const webCollectionLogCollectionLog = 'Collection Log';

export const webCollectionLogDash = '-';

export const webCollectionLogSearchSymbol = '⌕';

export const webCollectionLogSearch = ' Search';

export const webCollectionLogCollectionLogCategories =
  'Collection log categories';

export const webCollectionLogPages = (name: string = 'Collection log') =>
  `${name} pages`;

export const webCollectionLogSearchPages = 'Search pages';

export const webCollectionLogSearchPages2 = 'Search pages...';

export const webCollectionLogNoMatchingPages = 'No matching pages.';

export const webCollectionLogNoPagesInThisCategory =
  'No pages in this category.';

export const webCollectionLogObtained = 'Obtained:';

export const webCollectionLogItems = (name: string) => `${name} items`;

export const webCollectionLogNoItemsOnThisPageYet =
  'No items on this page yet.';

export const webCollectionLogLoadingCollectionLog = 'Loading collection log...';

export const webCollectionLogCollectionLogUnavailable =
  'Collection log unavailable';

export const webCollectionLogNoCatalogYet = 'No catalog yet';

export const webCollectionLogFetchingPagesAndCollectedItems =
  'Fetching pages and collected items.';

export const webCollectionLogNoCollectionLogPagesHaveBeenPublished =
  'No collection-log pages have been published.';

export const webCollectionLogTryAgain = 'Try again';

export const webCollectionLogShowingTheLastSuccessfulUpdate =
  ' Showing the last successful update.';

export const webCollectionLogRetry = 'Retry';

/** apps/web / competition-api. */
export const webCompetitionApiInvalidCompetitionIdentityOrKind =
  'Invalid competition identity or kind.';

export const webCompetitionApiInvalidCompetitionPeriodOrMetrics =
  'Invalid competition period or metrics.';

export const webCompetitionApiCompetitionKindDoesNotMatchItsWomMetricScope =
  'Competition kind does not match its WOM metric scope.';

export const webCompetitionApiMissingCurrentCompetitionClock =
  'Missing current competition clock.';

export const webCompetitionApiCompetitionsCouldNotBeRefreshed =
  sharedCompetitionsCouldNotBeRefreshed;

export const webCompetitionApiInvalidActivityListing =
  'Invalid activity listing.';

/** apps/web / competition-import-api. */
export const webCompetitionImportApiChooseHowToRecordTheUnknownCompetitionMetrics =
  'Choose how to record the unknown competition metrics.';

export const webCompetitionImportApiInvalidMetricResolutionPrompt =
  'Invalid metric resolution prompt.';

export const webCompetitionImportApiInvalidMetricPageChoices =
  'Invalid metric page choices.';

export const webCompetitionImportApiCompetitionRequestFailed =
  'Competition request failed.';

export const webCompetitionImportApiInvalidCompetitionResponse =
  'Invalid competition response.';

export const webCompetitionImportApiMetricPromptDoesNotMatchTheRequestedCompetition =
  'Metric prompt does not match the requested competition.';

export const webCompetitionImportApiCompetitionPreviewIdentityDoesNotMatchTheRequestedWomLink =
  'Competition preview identity does not match the requested WOM link.';

export const webCompetitionImportApiInvalidImportAction =
  'Invalid import action.';

export const webCompetitionImportApiLiveImportsMustContainMetadataOnly =
  'Live imports must contain metadata only.';

export const webCompetitionImportApiInvalidMetadataOnlyCompetitionPreview =
  'Invalid metadata-only competition preview.';

export const webCompetitionImportApiUnexpectedMetricSaveReceiptRetryTheSameChoicesToConfirm =
  'Unexpected metric save receipt. Retry the same choices to confirm.';

export const webCompetitionImportApiInvalidImportReceipt =
  'Invalid import receipt.';

/** apps/web / CompetitionImport. */
export const webCompetitionImportUnchangedNoGainsOrSchedulesWereAdded =
  'Unchanged. No gains or schedules were added.';

export const webCompetitionImportCompetitionMetadataImportedNoPagesWereOpenedOrXpAdded =
  'Competition metadata imported. No pages were opened or XP added.';

export const webCompetitionImportCompetitionImported = 'Competition imported.';

export const webCompetitionImportRequestTimedOutRetryApplyToCheckTheCommittedResult =
  'Request timed out. Retry Apply to check the committed result safely.';

export const webCompetitionImportYourAccountIsNotAllowedToPerformThisCompetitionImport =
  'Your account is not allowed to perform this competition import.';

export const webCompetitionImportImportFailed = 'Import failed.';

export const webCompetitionImportMetricDefinitionsSavedReviewTheCompetitionBeforeApplying =
  'Metric definitions saved. Review the competition before applying.';

export const webCompetitionImportYourAccountIsNotAllowedToSaveCompetitionMetrics =
  'Your account is not allowed to save competition metrics.';

export const webCompetitionImportMetricDefinitionsWereSavedButTheCompetitionPreviewCouldNot =
  'Metric definitions were saved, but the competition preview could not be completed. Retry Preview competition.';

export const webCompetitionImportCouldNotConfirmTheMetricSaveRetryTheSameChoices =
  'Could not confirm the metric save. Retry the same choices to recover its receipt.';

export const webCompetitionImportImportDiscarded = 'Import discarded.';

export const webCompetitionImportWiseOldManCompetitionLink =
  'Wise Old Man competition link';

export const webCompetitionImportPleaseWait = 'Please wait…';

export const webCompetitionImportPreviewCompetition = 'Preview competition';

export const webCompetitionImportViewCompetitionOnWom =
  'View competition on WOM';

export const webCompetitionImportStart = sharedStart;

export const webCompetitionImportEnd = sharedEnd;

export const webCompetitionImportImportCompetitionMetadataOnlyNoPagesWillBeOpenedAnd =
  'Import competition metadata only. No pages will be opened and no XP will be added.';

export const webCompetitionImportImportFinishedResultsNoOpeningWindowWillBeCreated =
  'Import finished results. No opening window will be created.';

export const webCompetitionImportUpdateTheLinkedScheduleToTheImportedDatesAndAdd =
  'Update the linked schedule to the imported dates and add new metric pages.';

export const webCompetitionImportKeepTheLinkedWindowClosed =
  'Keep the linked window closed.';

export const webCompetitionImportCreateAnOpeningWindowStartingImmediatelyWhenApplyCommitsEnding =
  'Create an opening window starting immediately when Apply commits, ending at the WOM end time.';

export const webCompetitionImportCreateAnOpeningWindowForTheWomStartAndEnd =
  'Create an opening window for the WOM start and end times.';

export const webCompetitionImportFindOpeningPages = 'Find opening pages';

export const webCompetitionImportOpeningPages = 'Opening pages';

export const webCompetitionImportUpdatePreview = 'Update preview';

export const webCompetitionImportChangeToCumulativeSiteTotals =
  'Change to cumulative site totals';

export const webCompetitionImportSkill = 'Skill';

export const webCompetitionImportBefore = sharedBefore;

export const webCompetitionImportAfter = sharedAfter;

export const webCompetitionImportChange = 'Change';

export const webCompetitionImportIReviewedTheCorrectionsThatReduceRecordedXp =
  'I reviewed the corrections that reduce recorded XP.';

export const webCompetitionImportPreviewExpiredPreviewThisCompetitionAgain =
  'Preview expired. Preview this competition again.';

export const webCompetitionImportApplyImport = 'Apply import';

export const webCompetitionImportDetectedKindMessage = (
  kind: string,
  lifecycle: string,
  value: string,
) => `Detected kind: ${kind} · ${lifecycle} · ${value}`;

export const webCompetitionImportPagesSelectedMessage = (
  count: number,
  dirty: boolean,
) =>
  `${count} pages selected.${dirty ? ' Update the preview to confirm these pages.' : ''}`;

export const webCompetitionImportPagesMessage = (value: string) =>
  `Pages: ${value}`;

export const webCompetitionImportEligibleParticipantsMessage = (
  length: number,
) => `Eligible participants (${length})`;

export const webCompetitionImportMetricAmount = (
  displayName: string,
  value: string,
  value2: string,
) => `${displayName}: ${value} ${value2}`;

export const webCompetitionImportXP = (value: string) => `${value} XP`;

export const webCompetitionImportXPMessage = (value: string) => `${value} XP`;

export const webCompetitionImportXPMessage2 = (value: string) => `${value} XP`;

/** apps/web / CompetitionMetrics. */
export const webCompetitionMetricsCompetitionMetrics = 'Competition metrics';

export const webCompetitionMetricsMetricBreakdown = 'Metric breakdown';

export const webCompetitionMetricsMetricsMessage = (value: string) =>
  `Metrics: ${value}`;

export const webCompetitionMetricsMetricAmount = (
  value: string,
  value2: string,
) => `${value}: ${value2}`;

/** apps/web / DiscordBotSettings. */
export const webDiscordBotSettingsChecking = 'Checking…';

export const webDiscordBotSettingsDisabled = sharedDisabled;

export const webDiscordBotSettingsConnecting = 'Connecting';

export const webDiscordBotSettingsConnected = 'Connected';

export const webDiscordBotSettingsDisconnected = 'Disconnected';

export const webDiscordBotSettingsUnavailable = sharedUnavailable2;

export const webDiscordBotSettingsCommandsRegisteredForTheServer = (
  target: 'test' | 'guild',
) =>
  `Commands registered for the ${target === 'test' ? 'test' : 'main'} server.`;

export const webDiscordBotSettingsRegisteringCommands = 'Registering commands';

export const webDiscordBotSettingsDiscordSettingsAreUnavailableReloadThisPage =
  'Discord settings are unavailable. Reload this page.';

export const webDiscordBotSettingsDiscordBot = sharedDiscordBot;

export const webDiscordBotSettingsOnlyTheAdministratorCanChangeDiscordSettingsOrRegisterCommands =
  'Only the administrator can change Discord settings or register commands.';

export const webDiscordBotSettingsStatus = 'Status:';

export const webDiscordBotSettingsAddABotTokenBeforeEnablingDiscord =
  'Add a bot token before enabling Discord.';

export const webDiscordBotSettingsDiscordSettingsSavedTheBotWillReloadAutomatically =
  'Discord settings saved. The bot will reload automatically.';

export const webDiscordBotSettingsConnection = 'Connection';

export const webDiscordBotSettingsEnableDiscordBot = 'Enable Discord bot';

export const webDiscordBotSettingsOn = sharedOn;

export const webDiscordBotSettingsOff = sharedOff;

export const webDiscordBotSettingsApplicationId = 'Application ID';

export const webDiscordBotSettingsServerId = 'Server ID';

export const webDiscordBotSettingsTestServerIdOptional =
  'Test server ID (optional)';

export const webDiscordBotSettingsBotToken = 'Bot token';

export const webDiscordBotSettingsStoredSecurelyLeaveBlankToKeepIt =
  'Stored securely; leave blank to keep it';

export const webDiscordBotSettingsPasteTheTokenFromDiscord =
  'Paste the token from Discord';

export const webDiscordBotSettingsNoBotTokenIsStored =
  'No bot token is stored.';

export const webDiscordBotSettingsRemoveStoredTokenWhenSaving =
  'Remove stored token when saving';

export const webDiscordBotSettingsRateLimitsPerMinute =
  'Rate limits per minute';

export const webDiscordBotSettingsSubmissionsPerUser = 'Submissions per user';

export const webDiscordBotSettingsSubmissionsPerServer =
  'Submissions per server';

export const webDiscordBotSettingsSearchesPerUser = 'Searches per user';

export const webDiscordBotSettingsSearchesPerServer = 'Searches per server';

export const webDiscordBotSettingsSaveDiscordSettings = 'Save Discord settings';

export const webDiscordBotSettingsDiscardChanges = sharedDiscardChanges;

export const webDiscordBotSettingsRegisterSlashCommands =
  'Register slash commands';

export const webDiscordBotSettingsRegisterForMainServer =
  'Register for main server';

export const webDiscordBotSettingsRegisterForTestServer =
  'Register for test server';

/** apps/web / HighlightPicker. */
export const webHighlightPickerColour = 'Colour';

export const webHighlightPickerChooseHighlightColour =
  'Choose highlight colour';

export const webHighlightPickerHex = 'HEX';

export const webHighlightPickerRrggbb = '#RRGGBB';

export const webHighlightPickerAlpha = 'Alpha (%)';

export const webHighlightPickerUseASixDigitHexColourAndAlphaFrom0 =
  'Use a six-digit HEX colour and Alpha from 0 to 100%.';

/** apps/web / ItemCreator. */
export const webItemCreatorTheFileCouldNotBeDecodedAsAPngWebP =
  'The file could not be decoded as a PNG/WebP icon.';

export const webItemCreatorReplaceItemIcon = 'Replace item icon';

export const webItemCreatorItemIconOptional = 'Item icon (optional)';
export const webItemCreatorDefaultIconPreview = 'Default item icon preview';
export const webItemCreatorDefaultIconHelp =
  'Leave the icon blank to use the default. You can replace it later.';
export const webItemCreatorRemoveSelectedIcon = 'Remove selected icon';

export const webItemCreatorPngOrWebP = 'PNG or WebP';

export const webItemCreatorCheckingIcon = 'Checking icon…';

export const webItemCreatorNewItemIconPreview = 'New item icon preview';

export const webItemCreatorChooseAValidItemIconBeforeSaving =
  'Choose a valid item icon before saving.';

export const webItemCreatorItemCreatedEverySelectedPageStartsUncollected = (
  id: number,
) => `Item #${id} created. Every selected page starts uncollected.`;

export const webItemCreatorTheItemWasCreatedButTheCatalogCouldNotBe =
  'The item was created, but the catalog could not be refreshed. Reload the page before adding another item.';

export const webItemCreatorAddNewItem = sharedAddNewItem;

export const webItemCreatorManualItemUncollected = 'Manual item · uncollected';

export const webItemCreatorItemName = sharedItemName;

export const webItemCreatorInGameItemIdRequired = 'In-game item ID (required)';

export const webItemCreatorThePreviousSaveHasAnUncertainResultRetryTheSame =
  'The previous save has an uncertain result. Retry the same request before changing these details.';

export const webItemCreatorSavingItem = 'Saving item…';

export const webItemCreatorRetryItemSave = 'Retry item save';

export const webItemCreatorCreateItem = 'Create item';

export const webItemCreatorItemIdentity = (name: string, id: number) =>
  `${name} · #${id}`;

/** apps/web / ItemMenu. */
export const webItemMenuHardcoreCollection = 'Hardcore collection';

export const webItemMenuFirstEventCollection = 'First event collection';

export const webItemMenuRegularCollection = sharedRegularCollection;

export const webItemMenuNotCollected = 'Not collected';

/** apps/web / ManualSubmissionForm. */
export const webManualSubmissionFormSelectASpecificItemCollectorAndCollectionDate =
  'Select a specific item, collector and collection date.';

export const webManualSubmissionFormChooseAPngScreenshotUpTo10MiB =
  sharedChooseAPngScreenshotUpTo10MiB;

export const webManualSubmissionFormManualSubmissionCreatedSuccessfully =
  'Manual submission created successfully.';

export const webManualSubmissionFormManualSubmission = sharedManualSubmission;

export const webManualSubmissionFormCancelManualEntry = 'Cancel manual entry';

export const webManualSubmissionFormAddManualSubmission =
  'Add manual submission';

export const webManualSubmissionFormCollectorName = sharedCollectorName;

export const webManualSubmissionFormPngScreenshotOptional =
  'PNG screenshot (optional)';

export const webManualSubmissionFormUpTo10MiB = 'Up to 10 MiB.';

export const webManualSubmissionFormReasonOrNoteOptional =
  'Reason or note (optional)';

export const webManualSubmissionFormSearchCatalogItems =
  sharedSearchCatalogItems;

export const webManualSubmissionFormCanonicalItem = sharedCanonicalItem;

export const webManualSubmissionFormChooseTheExactItem =
  'Choose the exact item…';

export const webManualSubmissionFormCollectionDate = sharedCollectionDate;

export const webManualSubmissionFormObtainedDuringEvents =
  sharedObtainedDuringEvents;

export const webManualSubmissionFormCollectedOnHardcoreWorlds =
  sharedCollectedOnHardcoreWorlds;

export const webManualSubmissionFormApproveImmediately = 'Approve immediately';

export const webManualSubmissionFormRetryToConfirmThisSubmissionBeforeChangingItsDetails =
  'Retry to confirm this submission before changing its details.';

export const webManualSubmissionFormSaving = sharedSaving;

export const webManualSubmissionFormRetryManualSubmission =
  'Retry manual submission';

export const webManualSubmissionFormCreateManualSubmission =
  'Create manual submission';

export const webManualSubmissionFormItemIdentity = (name: string, id: number) =>
  `${name} · #${id}`;

/** apps/web / model. */
export const webModelBosses = 'Bosses';

export const webModelRaids = 'Raids';

export const webModelClues = 'Clues';

export const webModelMinigames = 'Minigames';

export const webModelOther = 'Other';

export const webModelInvalidPublicLogResponse = 'Invalid public log response';

export const webModelMissingPublicLogText = 'Missing public log text';

export const webModelInvalidCanonicalItemId = 'Invalid canonical item ID';

export const webModelMissingPublicLogList = 'Missing public log list';

export const webModelDuplicatePublicLogIdentity =
  'Duplicate public log identity';

export const webModelTooManyCatalogSections = 'Too many catalog sections';

export const webModelIconsMustUseASameOriginAssetPath =
  'Icons must use a same-origin asset path';

export const webModelUnknownCollectionLogCategory =
  'Unknown collection log category';

export const webModelUnknownPageItem = 'Unknown page item';

export const webModelInvalidHardcoreCredit = 'Invalid hardcore credit';

export const webModelInvalidCollectionType = 'Invalid collection type';

export const webModelHardcoreCannotHaveEventCollections =
  'Hardcore cannot have Event collections';

export const webModelCollectionRefersToAnUnknownCatalogItem =
  'Collection refers to an unknown catalog item';

export const webModelCollectedByOn = (collectorName: string, value: string) =>
  `Collected by ${collectorName} on ${value}`;

/** apps/web / prepare-app-route. */
export const webPrepareAppRouteCouldNotCheckAdminAccessReloadToTryAgain =
  sharedCouldNotCheckAdminAccessReloadToTryAgain;

/** apps/web / public-metadata. */
export const webPublicMetadataPublicSettingsUnavailable =
  'Public settings unavailable';

/** apps/web / public-polling. */
export const webPublicPollingPublicReadTimedOut = 'Public read timed out';

export const webPublicPollingPageHidden = 'Page hidden';

export const webPublicPollingViewRemoved = 'View removed';

export const webPublicPollingAborted = sharedAborted;

/** apps/web / review-prerequisites. */
export const webReviewPrerequisitesSaveOrDiscardCorrectionsBeforeDecidingOnThisClaim =
  'Save or discard corrections before deciding on this claim.';

export const webReviewPrerequisitesAReviewRequestIsInProgressTheResultMustBe =
  'A review request is in progress. The result must be checked before another action.';

export const webReviewPrerequisitesTheSavedSubmissionVersionOrAuditCouldNotBeLoaded =
  'The saved submission version or audit could not be loaded. Reload the submission before continuing.';

export const webReviewPrerequisitesTheSubmissionsListIsRefreshingOrUnavailableReloadBeforeMaking =
  'The submissions list is refreshing or unavailable. Reload before making changes.';

export const webReviewPrerequisitesOnlyPendingOrApprovedClaimsCanBeEdited =
  sharedOnlyPendingOrApprovedClaimsCanBeEdited;

export const webReviewPrerequisitesNoClaimCorrectionsToSave =
  sharedNoClaimCorrectionsToSave;

export const webReviewPrerequisitesSelectAnActiveCanonicalItemBeforeSavingCorrections =
  'Select an active canonical item before saving corrections.';

export const webReviewPrerequisitesEnterAnAuditReasonBeforeChangingAnApprovedCredit =
  'Enter an audit reason before changing an approved credit.';

export const webReviewPrerequisitesNoReviewNoteChangesToSave =
  sharedNoReviewNoteChangesToSave;

export const webReviewPrerequisitesOnlyPendingClaimsMayBeApproved =
  'Only pending claims may be approved.';

export const webReviewPrerequisitesSelectAndSaveAnActiveCanonicalItemBeforeApproving =
  'Select and save an active canonical item before approving.';

export const webReviewPrerequisitesASavedScreenshotOrRuneLiteChatMessageIsRequiredFor =
  'A saved screenshot or RuneLite chat message is required for approval.';

export const webReviewPrerequisitesCheckTheSavedItemCollectorDateWorldModeAndProof =
  sharedCheckTheSavedItemCollectorDateWorldModeAndProof;

export const webReviewPrerequisitesOnlyPendingClaimsMayBeRejected =
  'Only pending claims may be rejected.';

export const webReviewPrerequisitesEnterAReasonBeforeRejectingASubmission =
  sharedEnterAReasonBeforeRejectingASubmission;

export const webReviewPrerequisitesOnlyApprovedCreditsMayBeRevoked =
  'Only approved credits may be revoked.';

export const webReviewPrerequisitesEnterAReasonBeforeRevokingACredit =
  sharedEnterAReasonBeforeRevokingACredit;

export const webReviewPrerequisitesThereAreNoClaimCorrectionsToDiscard =
  sharedThereAreNoClaimCorrectionsToDiscard;

export const webReviewPrerequisitesThereAreNoReviewNoteChangesToDiscard =
  sharedThereAreNoReviewNoteChangesToDiscard;

/** apps/web / ReviewAuditHistory. */
export const webReviewAuditHistoryAuditRequestTimedOut =
  'Audit request timed out.';

export const webReviewAuditHistoryInconsistentHistoryPage =
  'Inconsistent history page.';

export const webReviewAuditHistoryHistoryChangedReloadTheSubmissionToBrowseTheLatestEvents =
  'History changed. Reload the submission to browse the latest events.';

export const webReviewAuditHistoryCouldNotLoadAuditEventsTheLastPageIsPreserved =
  'Could not load audit events. The last page is preserved. Reload the submission to try again.';

export const webReviewAuditHistoryNoReviewEventsRecordedYet =
  'No review events recorded yet.';

export const webReviewAuditHistoryNewerEvents = 'Newer events';

export const webReviewAuditHistoryOlderEvents = 'Older events';

export const webReviewAuditHistoryLoadingAuditEvents = 'Loading audit events…';

export const webReviewAuditHistoryReloadSubmission = sharedReloadSubmission;

export const webReviewAuditHistoryStatus = 'Status';

export const webReviewAuditHistoryCollectionType = sharedCollectionType;

export const webReviewAuditHistorySubmittedItemName = sharedSubmittedItemName;

export const webReviewAuditHistoryGameItemId = sharedGameItemId;

export const webReviewAuditHistoryNotSupplied = 'Not supplied';

export const webReviewAuditHistoryItem = 'Item';

export const webReviewAuditHistoryUnmatched = sharedUnmatched;

export const webReviewAuditHistoryCollector = 'Collector';

export const webReviewAuditHistoryDate = 'Date';

export const webReviewAuditHistoryHardcore = 'Hardcore';

export const webReviewAuditHistoryYes = 'Yes';

export const webReviewAuditHistoryNo = 'No';

export const webReviewAuditHistoryReviewNote = 'Review note';

export const webReviewAuditHistoryField = 'Field';

export const webReviewAuditHistoryBefore = sharedBefore;

export const webReviewAuditHistoryAfter = sharedAfter;

export const webReviewAuditHistoryAuditHistoryOnThisPage = (length: number) =>
  `Audit history (${length} on this page)`;

export const webReviewAuditHistoryHistoryPageMessage = (length: number) =>
  `History page ${length}`;

export const webReviewAuditHistoryAuditActor = (
  action: string,
  actorName: string,
) => `${action} · ${actorName}`;

export const webReviewAuditHistoryReasonMessage = (reason: string) =>
  `Reason: ${reason}`;

/** apps/web / route-code. */
export const webRouteCodePageCodeCouldNotBeLoadedReloadThePageTo =
  'Page code could not be loaded. Reload the page to try again.';

/** apps/web / RuneLiteReviewSettings. */
export const webRuneLiteReviewSettingsFreeToPlayWorldsSubmissions =
  'Free to play worlds submissions';

export const webRuneLiteReviewSettingsPvpWorldsSubmissions =
  'PVP worlds submissions';

export const webRuneLiteReviewSettingsMembersWorldsSubmissions =
  'Members worlds submissions';

export const webRuneLiteReviewSettingsHardcoreWorldsSubmissions =
  'Hardcore worlds submissions';

export const webRuneLiteReviewSettingsRuneLiteReviewSettingsAreUnavailable =
  'RuneLite review settings are unavailable.';

export const webRuneLiteReviewSettingsAutomaticReview = 'Automatic review';

export const webRuneLiteReviewSettingsRetryReviewSettings =
  'Retry review settings';

export const webRuneLiteReviewSettingsMissingClanMatchingReceipt =
  'Missing clan matching receipt.';

export const webRuneLiteReviewSettingsRuneLiteReviewSettingsSaved =
  'RuneLite review settings saved.';

export const webRuneLiteReviewSettingsMatchClanNameOrApi =
  'Match Clan name or API';

export const webRuneLiteReviewSettingsClanName = sharedClanName;

export const webRuneLiteReviewSettingsApiKey = 'API key';

export const webRuneLiteReviewSettingsBoth = 'Both';

export const webRuneLiteReviewSettingsInGameClanNameForMatching =
  'In-game clan name for matching';

export const webRuneLiteReviewSettingsReject = 'Reject';

export const webRuneLiteReviewSettingsSendToReview = 'Send to review';

export const webRuneLiteReviewSettingsAutoAllow = 'Auto allow';

export const webRuneLiteReviewSettingsPlayerWhitelist = 'Player whitelist';

export const webRuneLiteReviewSettingsPlayersSubmissionsWhoAreTheWhitelistGetAutoAcceptedAfter =
  'Players submissions who are the whitelist get auto accepted after world filtering';

export const webRuneLiteReviewSettingsSaveReviewSettings =
  'Save review settings';

/** apps/web / schedule-time. */
export const webScheduleTimeInvalidScheduleTime = 'Invalid schedule time.';

export const webScheduleTimeChooseAValidLocalDateAndTime =
  'Choose a valid local date and time.';

export const webScheduleTimeThisLocalTimeDoesNotExistCheckTheDateOr =
  'This local time does not exist. Check the date or daylight saving change.';

/** apps/web / site-settings. */
export const webSiteSettingsInvalidSiteSettings = 'Invalid site settings.';

/** apps/web / SiteApp. */
export const webSiteAppFooterCredits = {
  prefix: 'Catalog data:',
  templeLabel: 'TempleOSRS',
  betweenLinks: ' and',
  wikiLabel: 'OSRS Wiki',
  versionPrefix: 'App version ',
};

export const webSiteAppHardcoreWorlds = sharedHardcoreWorlds;

export const webSiteAppSwitchToNormalWorlds = 'Switch to normal worlds';

export const webSiteAppSwitchToHardcoreWorlds = 'Switch to hardcore worlds';

export const webSiteAppNormalWorlds = 'Normal worlds';

export const webSiteAppSettingsCouldNotBeRefreshed =
  'Settings could not be refreshed.';

export const webSiteAppLogoCouldNotBeRefreshed = 'Logo could not be refreshed.';

export const webSiteAppClanAdministration = sharedClanAdministration;

export const webSiteAppClanAdministration2 = 'clan administration';

export const webSiteAppXpTracker = 'XP tracker';

export const webSiteAppCollectionLog = sharedCollectionLog2;

export const webSiteAppClanCollectionLog = (clanName: string) =>
  `${clanName ? clanName + ' ' : ''}clan collection log`;

export const webSiteAppClanName = sharedClanName;

export const webSiteAppMainSite = 'Main site';

export const webSiteAppAdminPanel = 'Admin panel';

export const webSiteAppPublicPages = 'Public pages';

export const webSiteAppCollectionLog2 = 'Collection log';

export const webSiteAppXpTracker2 = 'Xp tracker';

export const webSiteAppHowToSubmit = sharedHowToSubmit;

export const webSiteAppHardcoreWorlds3 = (collectionCaption: string) =>
  `${collectionCaption} Hardcore worlds`;

export const webSiteAppGitHub = 'GitHub';

export const webSiteAppSupportThisProject = 'Support this project';

export const webSiteAppSkipToMessage = (value: string) => `Skip to ${value}`;

/** apps/web / SubmissionEditor. */
export const webSubmissionEditorOnlyPendingOrApprovedClaimsCanBeEdited =
  sharedOnlyPendingOrApprovedClaimsCanBeEdited;

export const webSubmissionEditorNoReviewNoteChangesToSave =
  sharedNoReviewNoteChangesToSave;

export const webSubmissionEditorThereAreNoReviewNoteChangesToDiscard =
  sharedThereAreNoReviewNoteChangesToDiscard;

export const webSubmissionEditorNoClaimCorrectionsToSave =
  sharedNoClaimCorrectionsToSave;

export const webSubmissionEditorThereAreNoClaimCorrectionsToDiscard =
  sharedThereAreNoClaimCorrectionsToDiscard;

export const webSubmissionEditorCheckTheSavedItemCollectorDateWorldModeAndProof =
  sharedCheckTheSavedItemCollectorDateWorldModeAndProof;

export const webSubmissionEditorEnterAReasonBeforeRejectingASubmission =
  sharedEnterAReasonBeforeRejectingASubmission;

export const webSubmissionEditorEnterAReasonBeforeRevokingACredit =
  sharedEnterAReasonBeforeRevokingACredit;

export const webSubmissionEditorSubmissionReview = 'Submission review';

export const webSubmissionEditorCouldNotLoadThisSubmissionAndAuditHistoryReloadBefore =
  'Could not load this submission and audit history. Reload before making a decision.';

export const webSubmissionEditorDiscardUnsavedReviewChanges =
  'Discard unsaved review changes?';

export const webSubmissionEditorCloseReview = 'Close review';

export const webSubmissionEditorCloseSymbol = sharedSymbol11;

export const webSubmissionEditorReloadSubmission = sharedReloadSubmission;

export const webSubmissionEditorLoadingSubmission = 'Loading submission…';

export const webSubmissionEditorSubmissionChangedAgain =
  'Submission changed again.';

export const webSubmissionEditorTheChangeWasSavedButTheLatestRevisionOrAudit =
  'The change was saved, but the latest revision or audit could not be confirmed. Reload before continuing.';

export const webSubmissionEditorSaveOrDiscardCollectionFlagsBeforeRevoking =
  'Save or discard collection flags before revoking.';

export const webSubmissionEditorSaveASpecificItemMatchAndCheckTheScreenshotBefore =
  'Save a specific item match and check the screenshot before approving.';

export const webSubmissionEditorEnterAReasonForThisDecision =
  'Enter a reason for this decision.';

export const webSubmissionEditorEnterAReasonForCorrectingAnApprovedCredit =
  'Enter a reason for correcting an approved credit.';

export const webSubmissionEditorSubmissionPublicCreditFollowsThisSavedDecision =
  (status: string) =>
    `Submission ${status}. Public credit follows this saved decision.`;

export const webSubmissionEditorChangesSavedReviewTheSavedClaimBeforeApproving =
  'Changes saved. Review the saved claim before approving.';

export const webSubmissionEditorEnterAnAuditReasonBeforeSavingCollectionFlags =
  'Enter an audit reason before saving collection flags.';

export const webSubmissionEditorCollectionFlagsSaved =
  'Collection flags saved.';

export const webSubmissionEditorTheSubmissionChangedYourLocalDraftsAreRetainedReloadThe =
  'The submission changed. Your local drafts are retained; reload the submission before continuing.';

export const webSubmissionEditorReviewNoteSaved = 'Review note saved.';

export const webSubmissionEditorTheNoteWasSavedButAuditHistoryCouldNotBe =
  'The note was saved, but audit history could not be refreshed. Reload before continuing.';

export const webSubmissionEditorUnmatchedItem = 'Unmatched item';

export const webSubmissionEditorManualSubmission = sharedManualSubmission;

export const webSubmissionEditorRuneLiteSubmission = 'RuneLite submission';

export const webSubmissionEditorDiscordSubmission = 'Discord submission';

export const webSubmissionEditorSubmissionDetails = 'Submission details';

export const webSubmissionEditorCollectionType = sharedCollectionType;

export const webSubmissionEditorRecordedAsRegularBecauseThisItemAlreadyHadAnEvent =
  'Recorded as Regular because this item already had an Event collection.';

export const webSubmissionEditorSubmittedItemName = sharedSubmittedItemName;

export const webSubmissionEditorRawItemInput = 'Raw item input';

export const webSubmissionEditorNoRawTextSupplied = 'No raw text supplied';

export const webSubmissionEditorGameItemId = sharedGameItemId;

export const webSubmissionEditorCatalogMatch = 'Catalog match';

export const webSubmissionEditorUnmatched = sharedUnmatched;

export const webSubmissionEditorDateSource = 'Date source';

export const webSubmissionEditorSubmitted = 'Submitted';

export const webSubmissionEditorCollectedOn = 'Collected on';

export const webSubmissionEditorWorlds = 'Worlds';

export const webSubmissionEditorHardcoreWorlds = sharedHardcoreWorlds;

export const webSubmissionEditorOrdinaryWorlds = 'Ordinary worlds';

export const webSubmissionEditorProof = 'Proof';

export const webSubmissionEditorCanonicalItem = sharedCanonicalItem;

export const webSubmissionEditorItemOrigin = 'Item origin';

export const webSubmissionEditorManualItem = 'Manual item';

export const webSubmissionEditorSourceItem = 'Source item';

export const webSubmissionEditorCollectionLogPages = sharedCollectionLogPages;

export const webSubmissionEditorNotOnAPage = 'Not on a page';

export const webSubmissionEditorChatMessage = 'Chat message';

export const webSubmissionEditorApprovingSavedClaim = 'Approving saved claim…';

export const webSubmissionEditorRejectingSubmission = 'Rejecting submission…';

export const webSubmissionEditorRevokingCredit = 'Revoking credit…';

export const webSubmissionEditorSavingReviewNote = 'Saving review note…';

export const webSubmissionEditorSavingClaimCorrections =
  'Saving claim corrections…';

export const webSubmissionEditorSavedClaimAndCorrections =
  'Saved claim and corrections';

export const webSubmissionEditorCollectorName = sharedCollectorName;

export const webSubmissionEditorCollectionDate = sharedCollectionDate;

export const webSubmissionEditorSearchCatalogItems = sharedSearchCatalogItems;

export const webSubmissionEditorSelectTheExactItem = 'Select the exact item…';

export const webSubmissionEditorNoMatchingItemsAddAMissingItemInCatalogItems =
  'No matching items. Add a missing item in Catalog items before resolving this submission.';

export const webSubmissionEditorReviewNoteOptional = 'Review note (optional)';

export const webSubmissionEditorSaveReviewNote = 'Save review note';

export const webSubmissionEditorDiscardReviewNote = 'Discard review note';

export const webSubmissionEditorReviewReasonOptionalRejectionReasonRevokeReason =
  'Review reason (optional) / Rejection reason / Revoke reason';

export const webSubmissionEditorSaveCorrections = 'Save corrections';

export const webSubmissionEditorDiscardCorrections = 'Discard corrections';

export const webSubmissionEditorCollectionFlags = 'Collection flags';

export const webSubmissionEditorCollectedOnHardcoreWorlds =
  sharedCollectedOnHardcoreWorlds;

export const webSubmissionEditorObtainedDuringEvents =
  sharedObtainedDuringEvents;

export const webSubmissionEditorUseSavedIntakeTiming =
  'Use saved intake timing';

export const webSubmissionEditorSavedIntakeTimingWillDetermineTheCollectionType =
  'Saved intake timing will determine the collection type.';

export const webSubmissionEditorCollectionFlagsWillBeSavedWithYourReviewDecision =
  'Collection flags will be saved with your review decision.';

export const webSubmissionEditorSaveCollectionFlags = 'Save collection flags';

export const webSubmissionEditorDiscardCollectionFlags =
  'Discard collection flags';

export const webSubmissionEditorIVerifiedThisManualClaimAndItsItemCollectorDate =
  'I verified this manual claim and its item, collector, date and world.';

export const webSubmissionEditorICheckedTheChatMessageAndAnyAttachedProofFor =
  'I checked the chat message and any attached proof for the saved item, collector, date and hardcore claim.';

export const webSubmissionEditorICheckedTheScreenshotForTheSavedItemCollectorDate =
  'I checked the screenshot for the saved item, collector, date and hardcore claim.';

export const webSubmissionEditorApproveSubmission = 'Approve submission';

export const webSubmissionEditorRejectSubmission = 'Reject submission';

export const webSubmissionEditorRevokeCredit = 'Revoke credit';

export const webSubmissionEditorSubmissionHeading = (
  value: string,
  collectorName: string,
) => `${value} · ${collectorName}`;

export const webSubmissionEditorRevisionMessage = (version: number) =>
  `Revision: ${version}`;

export const webSubmissionEditorSubmissionSummary = (
  status: string,
  value: string,
  id: string,
) => `${status} · ${value} ${id}`;

export const webSubmissionEditorItemId = (id: number) => `#${id}`;

export const webSubmissionEditorItemIsNoLongerInTheActiveCatalog = (
  itemId: number,
) =>
  `Item #${itemId} is no longer in the active catalog. Select and save an active item before approving this claim. Its proof and review history remain available.`;

export const webSubmissionEditorItemIdentity = (name: string, id: number) =>
  `${name} · #${id}`;

/** apps/web / SubmissionHelp. */
export const webSubmissionHelpInstructionsCouldNotBeDisplayedPleaseAskYourClanStaff =
  'Instructions could not be displayed. Please ask your clan staff for submission help.';

export const webSubmissionHelpLoadingInstructions = 'Loading instructions…';

export const webSubmissionHelpHowToSubmit = sharedHowToSubmit;

export const webSubmissionHelpCloseSubmissionHelp = 'Close submission help';

export const webSubmissionHelpCloseSymbol = sharedSymbol11;

export const webSubmissionHelpSubmissionInstructions =
  'Submission instructions';

/** apps/web / UnknownMetricDialog. */
export const webUnknownMetricDialogDiscardImportAndClose =
  'Discard import and close';

export const webUnknownMetricDialogCloseSymbol = sharedSymbol11;

export const webUnknownMetricDialogUsesMetricsThatHaveNotBeenConfiguredYet =
  'uses metrics that have not been configured yet.';

export const webUnknownMetricDialogSaveTheirDefinitionsForFutureImportsThenReviewThisCompetition =
  'Save their definitions for future imports, then review this competition before applying. Discarding saves nothing. Saved definitions remain available if you later cancel the import.';

export const webUnknownMetricDialogDisplayName = 'Display name';

export const webUnknownMetricDialogMetricType = 'Metric type';

export const webUnknownMetricDialogChooseAType = 'Choose a type';

export const webUnknownMetricDialogActivityBossOrRaidKills =
  'Activity — boss or raid (kills)';

export const webUnknownMetricDialogActivityCounterScore =
  'Activity — counter (score)';

export const webUnknownMetricDialogActivityComputedHours =
  'Activity — computed (hours)';

export const webUnknownMetricDialogSkillXp = 'Skill — XP';

export const webUnknownMetricDialogXpSkill = 'XP skill';

export const webUnknownMetricDialogChooseASupportedSkill =
  'Choose a supported skill';

export const webUnknownMetricDialogOnlyUseThisForActualGainedXpForTheSelected =
  'Only use this for actual gained XP for the selected skill.';

export const webUnknownMetricDialogSearchCollectionLogPages =
  'Search collection log pages';

export const webUnknownMetricDialogPagesFor = (metric: string) =>
  `Pages for ${metric}`;

export const webUnknownMetricDialogPageMappingIsOptionalHereARunningOrFutureActivity =
  'Page mapping is optional here. A running or future activity import still needs a page selected before Apply.';

export const webUnknownMetricDialogSaving = sharedSaving;

export const webUnknownMetricDialogSaveMetricAndContinue = (count: number) =>
  `Save metric${count > 1 ? 's' : ''} and continue`;

export const webUnknownMetricDialogDiscardImport = 'Discard import';

export const webUnknownMetricDialogUnknownCompetitionMetricMessage = (
  count: number,
) => `Unknown competition metric${count > 1 ? 's' : ''}`;

export const webUnknownMetricDialogMetricMessage = (metric: string) =>
  `Metric: ${metric}`;

/** apps/web / use-admin-action. */
export const webUseAdminActionSavingChanges = 'Saving changes';

export const webUseAdminActionTheRequestTimedOutReloadOrRetryToCheckThe =
  'The request timed out. Reload or retry to check the result.';

export const webUseAdminActionTheAdminRequestCouldNotBeCompleted =
  'The admin request could not be completed.';

export const webUseAdminActionAnotherChangeWasSavedLoadTheLatestDataBeforeTrying =
  sharedAnotherChangeWasSavedLoadTheLatestDataBeforeTrying;

export const webUseAdminActionAnotherChangeWasSavedTheLatestDataIsLoadedReview =
  'Another change was saved. The latest data is loaded; review it before trying again.';

export const webUseAdminActionTheLatestDataIsLoadedReviewTheChangesBeforeTrying =
  (message: string) =>
    `${message} The latest data is loaded; review the changes before trying again.`;

export const webUseAdminActionTheDataChangedButTheLatestVersionCouldNotBe =
  'The data changed, but the latest version could not be loaded. Reload before continuing.';

/** apps/web / use-admin-routes. */
export const webUseAdminRoutesLoadingCancelledRetryNavigationToLoadThisPage =
  'Loading cancelled. Retry navigation to load this page.';

export const webUseAdminRoutesCollectionLog = sharedCollectionLog2;

export const webUseAdminRoutesNavigationTimedOut = 'Navigation timed out.';

export const webUseAdminRoutesAStaffOperationIsStillRunning =
  'A staff operation is still running.';

export const webUseAdminRoutesDiscardUnsavedChangesAndLeaveThisPage =
  'Discard unsaved changes and leave this page?';

export const webUseAdminRoutesLoadingTimedOutRetryOrCancelNavigation =
  sharedLoadingTimedOutRetryOrCancelNavigation;

export const webUseAdminRoutesYourAccountIsNotAllowedToViewThisPage =
  sharedYourAccountIsNotAllowedToViewThisPage;

export const webUseAdminRoutesWaitForTheCurrentStaffOperationToFinishThenRetry =
  'Wait for the current staff operation to finish, then retry or cancel navigation.';

export const webUseAdminRoutesThisPageCouldNotBeLoadedRetryOrCancelNavigation =
  sharedThisPageCouldNotBeLoadedRetryOrCancelNavigation;

/** apps/web / use-public-log. */
export const webUsePublicLogTheClanCollectionLogIsNotAvailableYet =
  'The clan collection log is not available yet.';

export const webUsePublicLogCouldNotRefreshTheClanCollectionLogTryAgainShortly =
  'Could not refresh the clan collection log. Try again shortly.';

/** apps/web / use-route-navigation. */
export const webUseRouteNavigationHistoryRestorationFailed =
  'History restoration failed.';

export const webUseRouteNavigationLoadingTimedOutRetryOrCancelNavigation =
  sharedLoadingTimedOutRetryOrCancelNavigation;

export const webUseRouteNavigationThisPageCouldNotBeLoadedRetryOrCancelNavigation =
  sharedThisPageCouldNotBeLoadedRetryOrCancelNavigation;

/** apps/web / with-abort. */
export const webWithAbortAborted = sharedAborted;

/** apps/web / xp-api. */
export const webXpApiTheXpTrackerHasReachedIts2000EventCapacityExisting =
  sharedTheXpTrackerHasReachedIts2000EventCapacityExisting;

export const webXpApiSignInWithTheAdminPasswordToImportCompetitions =
  'Sign in with the admin password to import competitions.';

export const webXpApiYourAccountIsNotAllowedToImportCompetitions =
  'Your account is not allowed to import competitions.';

export const webXpApiThisPreviewIsOutOfDatePreviewTheCompetitionAgain =
  'This preview is out of date. Preview the competition again.';

export const webXpApiTheSourceIsRateLimitedTryAgainShortly =
  'The source is rate limited. Try again shortly.';

export const webXpApiTheXpServiceIsNotAvailableYet =
  'The XP service is not available yet.';

export const webXpApiCouldNotRefreshXpYourLastSuccessfulResultsArePreserved =
  'Could not refresh XP. Your last successful results are preserved.';

export const webXpApiAborted = sharedAborted;

/** apps/web / xp-model. */
export const webXpModelInvalidAdminSession = 'Invalid admin session.';

export const webXpModelEnterAWiseOldManCompetitionLink =
  'Enter a Wise Old Man competition link.';

export const webXpModelUseHttpsWiseoldmanNetCompetitionsId =
  sharedUseHttpsWiseoldmanNetCompetitionsId;

export const webXpModelInvalidXpSnapshot = 'Invalid XP snapshot.';

export const webXpModelMissingXpRows = 'Missing XP rows.';

export const webXpModelMissingXpText = 'Missing XP text.';

export const webXpModelInvalidXpIdentity = 'Invalid XP identity.';

export const webXpModelXpMustBeAnExactDecimalIntegerString =
  'XP must be an exact decimal integer string.';

export const webXpModelInvalidXpDate = 'Invalid XP date.';

export const webXpModelUnknownXpSkill = 'Unknown XP skill.';

export const webXpModelDuplicateXpIdentity = 'Duplicate XP identity.';

export const webXpModelInconsistentXpChange = 'Inconsistent XP change.';

/** apps/web / xp-tracker. */
export const webXpTrackerIncompleteSkillTotals = 'Incomplete skill totals.';

export const webXpTrackerEventIdentityMismatch = 'Event identity mismatch.';

export const webXpTrackerAnEventNeedsSupportedSkills =
  'An event needs supported skills.';

export const webXpTrackerXpCompetitionMetadataDoesNotMatchItsIdentityAndSkill =
  'XP competition metadata does not match its identity and skill scope.';

export const webXpTrackerUnexpectedEventSkills = 'Unexpected event skills.';

export const webXpTrackerPodiumRequiresPositiveGains =
  'Podium requires positive gains.';

export const webXpTrackerInvalidPodiumRanking = 'Invalid podium ranking.';

/** apps/web / XpAmount. */
export const webXpAmountXpUnavailable = 'XP unavailable';

export const webXpAmountXP = (value: string) => `${value} XP`;

/** apps/web / XpPage. */
export const webXpPageXpCouldNotBeRefreshedTryAgainShortly =
  'XP could not be refreshed. Try again shortly.';

export const webXpPageRetryXp = 'Retry XP';

export const webXpPageLoadingClanXp = 'Loading clan XP…';

export const webXpPageXpEvents = 'XP events';

export const webXpPageTotal = 'Total';

export const webXpPageNoEventsAddedYet = 'No events added yet.';

export const webXpPageEventSkillXp = 'Event skill XP';

export const webXpPageTotalXpGained = 'Total XP gained';

export const webXpPageAllSkills = 'All skills';

export const webXpPageThisEventIsNoLongerAvailableChooseTotalOrAnother =
  'This event is no longer available. Choose Total or another event.';

export const webXpPageUnavailableEvent = 'Unavailable event';

/** apps/web / XpPodium. */
export const webXpPodiumXpPodiumFor = (title: string) =>
  `XP podium for ${title}`;

export const webXpPodiumTopPlayers = 'Top players';

export const webXpPodiumNoFinishedResultsYet = 'No finished results yet.';

export const webXpPodiumPlace = 'Place ';

export const webXpPodiumViewEventOnWiseOldMan = 'View event on Wise Old Man ↗';

/** apps/api / access-control. */
export const apiAccessControlAccessControlSettingsAreUnavailable =
  'Access control settings are unavailable.';

export const apiAccessControlAccessControlChangedReloadBeforeSavingAgain =
  'Access control changed. Reload before saving again.';

/** apps/api / app. */
export const apiAppDatabaseNotConfigured = 'Database not configured';

export const apiAppClanName = sharedClanName;

export const apiAppOperationFailed = 'Operation failed';

export const apiAppOperation = 'Operation';

export const apiAppInvalidRequestFields = 'Invalid request fields.';

export const apiAppRequestIsTooLarge = 'Request is too large.';

export const apiAppServiceTemporarilyUnavailable =
  'Service temporarily unavailable.';

export const apiAppNotFound = 'Not found.';

export const apiAppDraining = 'Draining';

export const apiAppTheCatalogServiceIsNotConfigured =
  'The catalog service is not configured.';

export const apiAppAdminPasswordSignInIsNotConfigured =
  'Admin password sign-in is not configured.';

export const apiAppAdminSignInIsNotConfigured =
  sharedAdminSignInIsNotConfigured;

export const apiAppOnlyTheAdministratorCanReadDiagnostics =
  'Only the administrator can read diagnostics.';

export const apiAppCatalogSearchUnavailable = 'Catalog search unavailable.';

/** apps/api / auth. */
export const apiAuthSignInWithYourStaffAccountToContinue =
  'Sign in with your staff account to continue.';

export const apiAuthTheRequestCouldNotBeVerifiedReloadAndTryAgain =
  'The request could not be verified. Reload and try again.';

export const apiAuthChangeYourPasswordBeforeUsingStaffTools =
  'Change your password before using staff tools.';

export const apiAuthYourAccountIsNotAllowedToAccessThisPage =
  'Your account is not allowed to access this page.';

export const apiAuthOnlyTheAdministratorCanUseThisTool =
  'Only the administrator can use this tool.';

export const apiAuthLoginMustOriginateFromTheConfiguredSite =
  'Login must originate from the configured site.';

export const apiAuthTooManySignInAttemptsTryAgainInAMinute =
  'Too many sign-in attempts. Wait before trying again.';

export const apiAuthIncorrectUsernameOrPassword =
  sharedIncorrectUsernameOrPassword;

export const apiAuthTooManyPasswordAttemptsTryAgainInAMinute =
  'Too many password attempts. Wait before trying again.';

export const apiAuthSignInAgainBeforeChangingYourAccount =
  'Sign in again before changing your account.';

export const apiAuthTheCurrentPasswordIsIncorrect =
  sharedTheCurrentPasswordIsIncorrect;

export const apiAuthChooseANewPasswordToFinishAccountSetup =
  sharedChooseANewPasswordToFinishAccountSetup;

export const apiAuthChooseAPasswordDifferentFromYourCurrentPassword =
  sharedChooseAPasswordDifferentFromYourCurrentPassword;

export const apiAuthAccountManagementUnavailable =
  'Account management unavailable.';

export const apiAuthAccessControlIsUnavailable =
  'Access control is unavailable.';

export const apiAuthSettingsChangedReloadBeforeSavingAgain =
  'Settings changed. Reload before saving again.';

export const apiAuthClanApiKeyStorageIsUnavailable =
  sharedClanApiKeyStorageIsUnavailable;

/** apps/api / automatic-admin. */
export const apiAutomaticAdminInvalidInitialAdministratorCredential =
  'Invalid initial administrator credential';

export const apiAutomaticAdminInvalidPendingAdministratorCredential =
  'Invalid pending administrator credential';

export const apiAutomaticAdminClanCollectionLogFirstLoginUsernameAdminTemporaryPasswordChange =
  (password: string) => `
=== CLAN COLLECTION LOG — FIRST LOGIN ===
Username: admin
Temporary password: ${password}
Change this password on your first login.
=========================================
`;

export const apiAutomaticAdminPendingCredentialDoesNotMatchTheExistingAdministrator =
  'Pending credential does not match the existing administrator';

export const apiAutomaticAdminInitialAdministratorCredentialIsMissing =
  'Initial administrator credential is missing';

/** apps/api / branding-routes. */
export const apiBrandingRoutesLogoNotFound = 'Logo not found.';

export const apiBrandingRoutesLogoStorageUnavailable =
  'Logo storage unavailable.';

export const apiBrandingRoutesClanBrandingUnavailable =
  sharedClanBrandingUnavailable;

export const apiBrandingRoutesOnlyTheAdministratorCanChangeTheClanLogo =
  'Only the administrator can change the clan logo.';

export const apiBrandingRoutesSupplyTheCurrentLogoRevision =
  'Supply the current logo revision.';

export const apiBrandingRoutesUploadOneLogoImage = 'Upload one logo image.';

export const apiBrandingRoutesChooseALogoUpTo10MiB = sharedChooseALogoUpTo10MiB;

/** apps/api / branding-storage. */
export const apiBrandingStorageChooseALogoUpTo10MiB =
  sharedChooseALogoUpTo10MiB;

export const apiBrandingStorageFormat = 'Format';

export const apiBrandingStorageDimensions = 'Dimensions';

export const apiBrandingStorageOutputSize = 'Output size';

export const apiBrandingStorageChooseAReadableJpegPngGifWebPSvgAvifOr =
  'Choose a readable JPEG, PNG, GIF, WebP, SVG, AVIF or TIFF logo (up to 8192 pixels per side, 300 frames and 64 megapixels total).';

/** apps/api / branding-store. */
export const apiBrandingStoreClanBrandingUnavailable =
  sharedClanBrandingUnavailable;

export const apiBrandingStoreTheClanLogoChangedReloadBeforeTryingAgain =
  'The clan logo changed. Reload before trying again.';

/** apps/api / catalog-editor-routes. */
export const apiCatalogEditorRoutesEnterAName = sharedEnterAName;

export const apiCatalogEditorRoutesChooseAnExistingCatalogItem =
  sharedChooseAnExistingCatalogItem;

export const apiCatalogEditorRoutesProvideAStableIdempotencyKey =
  'Provide a stable idempotency key.';

/** apps/api / catalog-routes. */
export const apiCatalogRoutesAdminSignInIsNotConfigured =
  sharedAdminSignInIsNotConfigured;

export const apiCatalogRoutesIconNotFound = sharedIconNotFound;

export const apiCatalogRoutesUploadExactlyOneIconFile =
  'Upload exactly one icon file.';

export const apiCatalogRoutesChooseAnIcon = 'Choose an icon.';

export const apiCatalogRoutesSupplyAStableIdempotencyKey =
  'Supply a stable Idempotency-Key.';

export const apiCatalogRoutesEnterANonblankItemName =
  'Enter a nonblank item name.';

export const apiCatalogRoutesChooseAnExistingCatalogItem =
  sharedChooseAnExistingCatalogItem;

export const apiCatalogRoutesChooseAnItemAndExplainTheReconciliation =
  'Choose an item and explain the reconciliation.';

/** apps/api / catalog-store. */
export const apiCatalogStoreChooseExistingCollectionLogPages =
  'Choose existing collection-log pages.';

export const apiCatalogStoreCatalogExceedsTheSupportedSize =
  'Catalog exceeds the supported size.';

export const apiCatalogStoreThisRequestKeyWasUsedForDifferentPageDetails =
  'This request key was used for different page details.';

export const apiCatalogStoreTheCatalogChangedReloadBeforeAddingAPage =
  'The catalog changed. Reload before adding a page.';

export const apiCatalogStoreAPageWithThisNameAlreadyExistsInThisCategory =
  sharedAPageWithThisNameAlreadyExistsInThisCategory;

export const apiCatalogStoreTheCatalogHasReachedItsPageOrItemSlotLimit =
  sharedTheCatalogHasReachedItsPageOrItemSlotLimit;

export const apiCatalogStoreChooseDistinctActiveCatalogItems =
  sharedChooseDistinctActiveCatalogItems;

export const apiCatalogStoreTheCatalogChangedReloadBeforeDeletingAPage =
  'The catalog changed. Reload before deleting a page.';

export const apiCatalogStoreThePageChangedReloadBeforeDeleting =
  'The page changed. Reload before deleting.';

export const apiCatalogStoreTheCatalogChangedReloadBeforeReorderingPages =
  'The catalog changed. Reload before reordering pages.';

export const apiCatalogStoreSupplyEveryActivePageInThisCategoryExactlyOnce =
  'Supply every active page in this category exactly once.';

export const apiCatalogStoreTheCatalogChangedReloadBeforeSaving =
  'The catalog changed. Reload before saving.';

export const apiCatalogStoreChooseAnExistingSection =
  'Choose an existing section.';

export const apiCatalogStoreEnterDistinctPositiveInGameItemIds =
  sharedEnterDistinctPositiveInGameItemIds;

export const apiCatalogStoreAnInGameItemIdAlreadyBelongsToAnotherItem =
  sharedAnInGameItemIdAlreadyBelongsToAnotherItem;

export const apiCatalogStoreThisRequestKeyWasUsedForDifferentSectionDetails =
  'This request key was used for different section details.';

export const apiCatalogStoreASectionWithThisNameAlreadyExists =
  sharedASectionWithThisNameAlreadyExists;

export const apiCatalogStoreTheCatalogHasReachedItsSectionLimit =
  'The catalog has reached its section limit.';

export const apiCatalogStoreOnlySectionsWithNoPagesCanBeDeleted =
  sharedOnlySectionsWithNoPagesCanBeDeleted;

export const apiCatalogStoreSupplyEveryActiveSectionExactlyOnce =
  'Supply every active section exactly once.';

export const apiCatalogStoreAPageWithThisNameAlreadyExistsInThisSection =
  sharedAPageWithThisNameAlreadyExistsInThisSection;

export const apiCatalogStoreCatalogItemNotFound = 'Catalog item not found.';

export const apiCatalogStoreCatalogCapacityReached =
  'Catalog capacity reached.';

export const apiCatalogStoreUploadAFreshIconBeforeSaving =
  'Upload a fresh icon before saving.';

export const apiCatalogStoreTooManyUnusedIconUploadsWaitForThemToExpire =
  'Too many unused icon uploads. Wait for them to expire.';

export const apiCatalogStoreThisRequestKeyWasAlreadyUsedForDifferentFields =
  'This request key was already used for different fields.';

export const apiCatalogStoreChooseDistinctExistingCollectionLogPages =
  'Choose distinct existing collection-log pages.';

export const apiCatalogStoreUploadAFreshIconBeforeCreatingThisItem =
  'Upload a fresh icon before creating this item.';

export const apiCatalogStorePageMembershipOrOrderChangedReloadBeforeSaving =
  'Page membership or order changed. Reload before saving.';

export const apiCatalogStoreSupplyEveryCurrentPageItemExactlyOnce =
  'Supply every current page item exactly once.';

export const apiCatalogStoreTheCatalogChangedReloadBeforeDeletingAnItem =
  'The catalog changed. Reload before deleting an item.';

export const apiCatalogStoreItemNotFoundOnThisPage =
  'Item not found on this page.';

export const apiCatalogStorePageMembershipOrOrderChangedReloadBeforeDeleting =
  'Page membership or order changed. Reload before deleting.';

export const apiCatalogStoreCatalogChangedReviewTheLatestMapping =
  'Catalog changed. Review the latest mapping.';

export const apiCatalogStoreChooseAnExistingActiveCanonicalItem =
  'Choose an existing active canonical item.';

export const apiCatalogStoreAGameIdAlreadyBelongsToAnotherCanonicalItemNo =
  'A game ID already belongs to another canonical item. No identities were merged.';

/** apps/api / catalog-update-routes. */
export const apiCatalogUpdateRoutesAdminSignInIsNotConfigured =
  sharedAdminSignInIsNotConfigured;

export const apiCatalogUpdateRoutesOnlyTheAdministratorCanReviewCatalogUpdates =
  'Only the administrator can review catalog updates.';

export const apiCatalogUpdateRoutesAUuidIdempotencyKeyIsRequired =
  sharedAUuidIdempotencyKeyIsRequired;

/** apps/api / clan-api-key. */
export const apiClanApiKeyInvalidKeyHeader = 'Invalid key header';

export const apiClanApiKeyInvalidKeyEncoding = 'Invalid key encoding';

export const apiClanApiKeyKeyStorageDirectoryMustBeAbsolute =
  'Key storage directory must be absolute';

export const apiClanApiKeyClanKeyEncryptionStorageIsInvalid =
  'Clan key encryption storage is invalid';

export const apiClanApiKeyInvalidEncryptedKey = 'Invalid encrypted key';

export const apiClanApiKeyInvalidKey = 'Invalid key';

export const apiClanApiKeyClanApiKeyStorageIsUnavailable =
  sharedClanApiKeyStorageIsUnavailable;

export const apiClanApiKeyInvalidClanKeyEncryptionRoot =
  'Invalid clan key encryption root';

export const apiClanApiKeyClanApiKeyStorageIsInvalid =
  'Clan API key storage is invalid.';

export const apiClanApiKeySupplyAnEnabledSettingAKeyOfAtLeast8 =
  'Supply an enabled setting, a key of at least 8 characters, or generate a new key.';

export const apiClanApiKeyApiKeySettingsChangedReloadBeforeSavingAgain =
  sharedApiKeySettingsChangedReloadBeforeSavingAgain;

export const apiClanApiKeyAValidClanApiKeyIsRequired =
  'A valid clan API key is required.';

/** apps/api / competition-metric-store. */
export const apiCompetitionMetricStoreCustomMetricCapacityExceeded =
  'Custom metric capacity exceeded.';

export const apiCompetitionMetricStoreCatalogPageLimitExceeded =
  'Catalog page limit exceeded.';

export const apiCompetitionMetricStoreChooseDefinitionsForEveryUnknownMetric =
  'Choose definitions for every unknown metric.';

export const apiCompetitionMetricStoreDuplicateMetricsCannotBeRegistered =
  'Duplicate metrics cannot be registered.';

export const apiCompetitionMetricStoreMetricSaveKeyWasUsedForADifferentRequest =
  'Metric save key was used for a different request.';

export const apiCompetitionMetricStoreBuiltInMetricsCannotBeRegistered =
  'Built-in metrics cannot be registered.';

export const apiCompetitionMetricStoreMetricPromptExpiredOrBelongsToAnotherStaffMemberPreview =
  'Metric prompt expired or belongs to another staff member. Preview again.';

export const apiCompetitionMetricStoreDefineExactlyTheUnknownMetricsFromThisCompetition =
  'Define exactly the unknown metrics from this competition.';

export const apiCompetitionMetricStoreAnotherStaffMemberSavedADifferentDefinitionPreviewAgain =
  'Another staff member saved a different definition. Preview again.';

export const apiCompetitionMetricStoreChooseActiveCatalogPages =
  'Choose active catalog pages.';

export const apiCompetitionMetricStoreMetricDefinitionsChangedPreviewAgain =
  sharedMetricDefinitionsChangedPreviewAgain;

export const apiCompetitionMetricStoreThe500CustomMetricLimitHasBeenReached =
  'The 500 custom metric limit has been reached.';

/** apps/api / competition-routes. */
export const apiCompetitionRoutesCompetitionServiceUnavailable =
  'Competition service unavailable.';

export const apiCompetitionRoutesStaffSignInIsNotConfigured =
  sharedStaffSignInIsNotConfigured;

export const apiCompetitionRoutesTheLegacyKindHintDoesNotMatchWomMetadataDetected =
  (kind: string) =>
    `The legacy kind hint does not match WOM metadata. Detected kind: ${kind}.`;

export const apiCompetitionRoutesMetricDefinitionsUnavailable =
  'Metric definitions unavailable.';

export const apiCompetitionRoutesAUuidIdempotencyKeyIsRequired =
  sharedAUuidIdempotencyKeyIsRequired;

/** apps/api / config. */
export const apiConfigProofStoragePathMustBeAbsolute =
  'PROOF_STORAGE_PATH must be absolute';

export const apiConfigIconStoragePathMustBeAbsolute =
  'ICON_STORAGE_PATH must be absolute';

export const apiConfigAuthEnabledMustBeTrueOrFalse =
  'AUTH_ENABLED must be true or false';

export const apiConfigTrustedProxyCidrsMustContainIpAddressesOrCidrs =
  'TRUSTED_PROXY_CIDRS must contain IP addresses or CIDRs';

export const apiConfigBotSettingsModeMustBeDatabaseEnvironmentOrDisabled =
  'BOT_SETTINGS_MODE must be database, environment or disabled';

export const apiConfigBotApiTokenAndDiscordGuildIdMustBeSet =
  'BOT_API_TOKEN and DISCORD_GUILD_ID must be set together';

export const apiConfigBotTokenMustBe32RandomBytesAsHexAnd =
  'Bot token must be 32+ random bytes as hex and guild ID must be a Discord snowflake';

export const apiConfigAdminAuthRequiresAValidPublicOrigin =
  'Admin auth requires a valid PUBLIC_ORIGIN';

export const apiConfigPublicOriginMustUseHttpsHttpLoopbackOnlyInDevelopment =
  'PUBLIC_ORIGIN must use HTTPS (HTTP loopback only in development)';

export const apiConfigSessionSecretMustContainAtLeast32RandomBytesEncoded =
  'SESSION_SECRET must contain at least 32 random bytes encoded as hex';

export const apiConfigAdminBootstrapPasswordMustContain32128RandomBytesEncoded =
  'ADMIN_BOOTSTRAP_PASSWORD must contain 32–128 random bytes encoded as hex';

/** apps/api / discord-settings-routes. */
export const apiDiscordSettingsRoutesStaffSignInIsNotConfigured =
  sharedStaffSignInIsNotConfigured;

export const apiDiscordSettingsRoutesOnlyTheAdministratorCanManageDiscordSettings =
  'Only the administrator can manage Discord settings.';

export const apiDiscordSettingsRoutesDiscordSettingsAreUnavailable =
  sharedDiscordSettingsAreUnavailable;

export const apiDiscordSettingsRoutesDiscordSettingsChangedReloadBeforeRegisteringCommands =
  'Discord settings changed. Reload before registering commands.';

export const apiDiscordSettingsRoutesSaveTheTokenApplicationIdAndSelectedServerIdBefore =
  'Save the token, application ID and selected server ID before registering commands.';

export const apiDiscordSettingsRoutesDiscordCommandRegistrationFailedCheckTheSavedCredentialsAndBot =
  'Discord command registration failed. Check the saved credentials and bot permissions.';

/** apps/api / icon-storage. */
export const apiIconStorageChooseAnIconUpTo2MiB = 'Choose an icon up to 2 MiB.';

export const apiIconStorageChooseAPngOrWebPIcon = 'Choose a PNG or WebP icon.';

export const apiIconStorageUnsupportedDimensionsOrAnimation =
  'Unsupported dimensions or animation';

export const apiIconStorageDecodedIconTooLarge = 'Decoded icon too large';

export const apiIconStorageTheIconMustDecodeAsAStillPngOrWebP =
  'The icon must decode as a still PNG or WebP between 1 and 512 pixels.';

export const apiIconStorageIconStoragePathMustBeAnAbsolutePath =
  'ICON_STORAGE_PATH must be an absolute path';

export const apiIconStorageIconNotFound = sharedIconNotFound;

export const apiIconStorageImageStorageIsUnavailableTryAgainLater =
  'Image storage is unavailable. Try again later.';

export const apiIconStorageIconChecksumMismatch = 'Icon checksum mismatch';

export const apiIconStorageIconStorageIsUnavailable =
  'Icon storage is unavailable.';

/** apps/api / import-reconciliation. */
export const apiImportReconciliationTheXpTrackerHasReachedIts2000EventCapacityExisting =
  sharedTheXpTrackerHasReachedIts2000EventCapacityExisting;

export const apiImportReconciliationWomMetricScopeDoesNotMatchItsCanonicalSkills =
  'WOM metric scope does not match its canonical skills.';

export const apiImportReconciliationXpResultsDoNotMatchTheCompetitionIdentityAndScope =
  'XP results do not match the competition identity and scope.';

export const apiImportReconciliationFinishedSkillImportsRequireExactXpResults =
  'Finished SKILL imports require exact XP results.';

export const apiImportReconciliationMetricDefinitionsChangedPreviewAgain =
  sharedMetricDefinitionsChangedPreviewAgain;

export const apiImportReconciliationSavedMetricSemanticsChangedThisCompetitionRetainsItsOriginalDefinition =
  'Saved metric semantics changed. This competition retains its original definition.';

export const apiImportReconciliationCompetitionIsArchivedRestoreItBeforeImportingAgain =
  'Competition is archived. Restore it before importing again.';

export const apiImportReconciliationThisWomCompetitionAlreadyHasADifferentKindItsIdentity =
  'This WOM competition already has a different kind. Its identity cannot be duplicated.';

export const apiImportReconciliationRemovingSavedWomMetricsRequiresManualReconciliation =
  'Removing saved WOM metrics requires manual reconciliation.';

export const apiImportReconciliationAFinalizedCompetitionCannotBeReplacedWithLiveMetadata =
  'A finalized competition cannot be replaced with live metadata.';

export const apiImportReconciliationXpEventLimitExceeded =
  sharedXpEventLimitExceeded;

export const apiImportReconciliationCompetitionListingExceedsSupportedLimits =
  'Competition listing exceeds supported limits.';

export const apiImportReconciliationUseTheCompetitionScheduleImporterForFutureOrRunningCompetitions =
  'Use the competition schedule importer for future or running competitions. XP results are imported only after the end.';

export const apiImportReconciliationCompetitionFinishedDuringFetchPreviewAgainToImportFinalResults =
  'Competition finished during fetch. Preview again to import final results.';

export const apiImportReconciliationCompetitionTimeStateChangedPreviewAgain =
  'Competition time state changed. Preview again.';

export const apiImportReconciliationTheseCompetitionMetricsDoNotOpenCollectionLogPagesImport =
  'These competition metrics do not open collection log pages. Import the metadata without page selections.';

export const apiImportReconciliationChooseDistinctActiveCollectionLogPages =
  'Choose distinct active collection log pages.';

export const apiImportReconciliationTheCompetitionParticipantRosterChangedReviewTheReconciliation =
  'The competition participant roster changed. Review the reconciliation.';

export const apiImportReconciliationTheLinkedStaffScheduleIsArchivedAndRetainedThisImport =
  'The linked staff schedule is archived and retained. This import will not restore or reopen it; manage its lifecycle separately.';

export const apiImportReconciliationThePreviouslyLinkedStaffScheduleIsPreservedThisImportWill =
  'The previously linked staff schedule is preserved. This import will not edit or open pages; manage that schedule in Scheduling.';

export const apiImportReconciliationThePreviouslyLinkedScheduleWasDeletedThisImportWillNot =
  'The previously linked schedule was deleted. This import will not recreate it.';

export const apiImportReconciliationSomeMappedPagesAreUnavailableReviewTheActivePageSelections =
  'Some mapped pages are unavailable. Review the active page selections before applying.';

export const apiImportReconciliationTheLinkedScheduleWasDeletedByStaffImportingAgainWill =
  'The linked schedule was deleted by staff. Importing again will preserve that deletion. Create a manual schedule to reopen pages.';

export const apiImportReconciliationChooseAtLeastOneActivePageBeforeApplyingThisMetric =
  'Choose at least one active page before applying. This metric has no automatic page mapping.';

export const apiImportReconciliationSchedulingIsDisabledThisImportWillNotEnableEnforcement =
  'Scheduling is disabled. This import will not enable enforcement.';

export const apiImportReconciliationThisCorrectionReducesRecordedXpAndRequiresAcknowledgement =
  'This correction reduces recorded XP and requires acknowledgement.';

export const apiImportReconciliationOverlappingCompetitionsCountTheirReportedXpIndependently =
  'Overlapping competitions count their reported XP independently.';

export const apiImportReconciliationXpStateUnavailable =
  sharedXpStateUnavailable;

export const apiImportReconciliationImportKeyAlreadyUsedForADifferentRequest =
  'Import key already used for a different request.';

export const apiImportReconciliationPreviewExpiredOrBelongsToAnotherStaffMember =
  'Preview expired or belongs to another staff member.';

export const apiImportReconciliationCompetitionsOrSchedulesChangedPreviewAgain =
  'Competitions or schedules changed. Preview again.';

export const apiImportReconciliationCompetitionPageOpeningBehaviorChangedPreviewAgainToImportWithout =
  'Competition page-opening behavior changed. Preview again to import without opening pages.';

export const apiImportReconciliationCompetitionChangedTimeStatePreviewAgainToFetchFinalResults =
  'Competition changed time state. Preview again to fetch final results.';

export const apiImportReconciliationMappedPagesChangedPreviewAgain =
  'Mapped pages changed. Preview again.';

export const apiImportReconciliationChooseAtLeastOneActiveCollectionLogPage =
  'Choose at least one active collection log page.';

export const apiImportReconciliationTheScheduleLimitHasBeenReached =
  sharedTheScheduleLimitHasBeenReached;

export const apiImportReconciliationChooseActiveCollectionLogPages =
  sharedChooseActiveCollectionLogPages;

export const apiImportReconciliationAcknowledgeNegativeXpCorrectionsBeforeApplying =
  'Acknowledge negative XP corrections before applying.';

/** apps/api / installation-backup. */
export const apiInstallationBackupBackupManifestIsIncomplete =
  'Backup manifest is incomplete';

export const apiInstallationBackupInvalidBackupManifest =
  'Invalid backup manifest';

export const apiInstallationBackupBackupChecksumMismatch =
  'Backup checksum mismatch';

export const apiInstallationBackupBackupIsIncomplete = 'Backup is incomplete';

export const apiInstallationBackupInvalidInfrastructureManifest =
  'Invalid infrastructure manifest';

export const apiInstallationBackupInfrastructureChecksumMismatch =
  'Infrastructure checksum mismatch';

export const apiInstallationBackupBackupReleaseIdentityMismatch =
  'Backup release identity mismatch';

export const apiInstallationBackupUnsafeBackupArchivePath =
  'Unsafe backup archive path';

export const apiInstallationBackupBackupArchivesMustContainRegularFilesAndDirectories =
  'Backup archives must contain regular files and directories';

export const apiInstallationBackupInstallationChangedDuringBackup =
  'Installation changed during backup';

export const apiInstallationBackupRestoreRequiresAFreshInstallationStartedInRestoreMode =
  'Restore requires a fresh installation started in restore mode';

export const apiInstallationBackupRestoreImageDoesNotMatchTheRecordedRelease =
  'Restore image does not match the recorded release';

/** apps/api / installation-control. */
export const apiInstallationControlInvalidInstallationResponse =
  'Invalid installation response';

export const apiInstallationControlInstallationOperationFailedInspectClogStatusAndTheContainerLog =
  'Installation operation failed; inspect clog status and the container log';

export const apiInstallationControlInstallationOperationTimedOut =
  'Installation operation timed out';

export const apiInstallationControlWebsiteReadinessDeadlineExpired =
  'Website readiness deadline expired';

/** apps/api / installation. */
export const apiInstallationInstallationCommandFailed = (command: string) =>
  `Installation command failed: ${command}`;

export const apiInstallationInstallationSupervisorMustInitializeAsRoot =
  'Installation supervisor must initialize as root';

export const apiInstallationInvalidInstallationStartMode =
  'Invalid installation start mode';

export const apiInstallationInvalidDatabaseMode = 'Invalid database mode';

export const apiInstallationRestoreUsesTheBundledDatabaseOnAFreshVolume =
  'Restore uses the bundled database on a fresh volume';

export const apiInstallationInstalledCredentialsAreMissingRestoreTheCompleteInstallation =
  'Installed credentials are missing; restore the complete installation';

export const apiInstallationRestoreRequiresANewEmptyDataVolume =
  'Restore requires a new empty data volume';

export const apiInstallationInstalledDatabaseIsMissingRestoreTheCompleteInstallation =
  'Installed database is missing; restore the complete installation';

export const apiInstallationUseDbHostDbPortDbNameAndDbUser =
  'Use DB_HOST, DB_PORT, DB_NAME and DB_USER for an external installation';

export const apiInstallationSupplyTheExternalDatabaseOwnerPasswordFileOnFirstInitialization =
  'Supply the external database owner password file on first initialization';

export const apiInstallationInstallationStoragePathsAreRequired =
  'Installation storage paths are required';

export const apiInstallationInstallationShutdownDeadlineExpired =
  'Installation shutdown deadline expired';

export const apiInstallationInvalidDatabaseStagingDirectory =
  'Invalid database staging directory';

export const apiInstallationDatabaseDirectoryIsNotEmpty =
  'Database directory is not empty';

export const apiInstallationLocalAllClogPeerMapClogOwnerLocalAllAll =
  'local all clog peer map=clog_owner\nlocal all all scram-sha-256\nhost all all 127.0.0.1/32 scram-sha-256\nhost all all ::1/128 scram-sha-256\n';

export const apiInstallationClogOwnerPostgresClog =
  'clog_owner postgres clog\n';

export const apiInstallationPostgreSqlStoppedUnexpectedly =
  'PostgreSQL stopped unexpectedly.';

export const apiInstallationPostgreSqlReadinessDeadlineExpired =
  'PostgreSQL readiness deadline expired';

export const apiInstallationInstallationIsStopping = 'Installation is stopping';

export const apiInstallationResumePendingSecretRotationBeforeStartingWriters =
  'Resume pending secret rotation before starting writers';

export const apiInstallationApplicationSupervisorStoppedUnexpectedly =
  'Application supervisor stopped unexpectedly.';

export const apiInstallationInstallationInitializedStartingWebsiteAndOptionalDiscordGateway =
  'Installation initialized; starting website and optional Discord gateway.';

export const apiInstallationUnknownControlRequest = 'Unknown control request';

export const apiInstallationInstallationIsNotAvailableForMaintenance =
  'Installation is not available for maintenance';

export const apiInstallationMaintenanceOwnerMismatch =
  'Maintenance owner mismatch';

export const apiInstallationExternalDatabaseIsOperatorManaged =
  'External database is operator-managed';

export const apiInstallationUnknownMaintenanceOperation =
  'Unknown maintenance operation';

export const apiInstallationErrorInstallationMaintenanceFailedInspectTheInstallationState =
  '{"error":"Installation maintenance failed; inspect the installation state."}';

export const apiInstallationPostgreSqlReadyApplicationWritersArePausedForMaintenance =
  'PostgreSQL ready; application writers are paused for maintenance.';

export const apiInstallationInspectDataLogsBootstrapLogWritersRemainStoppedUseClog =
  'Inspect /data/logs/bootstrap.log. Writers remain stopped; use clog resume after repairing the installation.';

/** apps/api / intake. */
export const apiIntakeInvalidSubmissionJson = sharedInvalidSubmissionJson;

export const apiIntakeInvalidSubmissionFields = sharedInvalidSubmissionFields;

export const apiIntakeBotCredentialIsRequired = 'Bot credential is required.';

export const apiIntakeDiscordSubmissionsAreDisabled =
  'Discord submissions are disabled.';

export const apiIntakeScreenshotStorageIsUnavailable =
  'Screenshot storage is unavailable.';

export const apiIntakeSubmissionsAreRestrictedToTheConfiguredGuild =
  'Submissions are restricted to the configured guild.';

/** apps/api / lifecycle-routes. */
export const apiLifecycleRoutesStaffSignInIsNotConfigured =
  sharedStaffSignInIsNotConfigured;

export const apiLifecycleRoutesOnlyTheAdministratorCanReadLifecycleHistory =
  'Only the administrator can read lifecycle history.';

export const apiLifecycleRoutesLifecycleHistoryUnavailable =
  'Lifecycle history unavailable.';

/** apps/api / maintenance. */
export const apiMaintenanceRunClogMaintenanceAsRoot =
  'Run clog maintenance as root';

export const apiMaintenanceApplicationWritersPaused =
  'Application writers paused.';

export const apiMaintenanceApplicationReadinessVerified =
  'Application readiness verified.';

export const apiMaintenanceSchemaManifestIsTooLarge =
  'Schema manifest is too large';

export const apiMaintenanceSupplyABackupDirectory = 'Supply a backup directory';

export const apiMaintenanceUsageClogRotatePostgresAppSessionResume =
  'Usage: clog rotate postgres|app|session [--resume]';

export const apiMaintenanceSecretRotatedAndApplicationReadinessVerified =
  'Secret rotated and application readiness verified.';

export const apiMaintenanceSupplyAMaintenanceCommand =
  'Supply a maintenance command';

export const apiMaintenanceMaintenanceCommandFailed =
  'Maintenance command failed';

export const apiMaintenanceUsageClogStatusBackupRestorePauseResumeRotateSchemaOwner =
  'Usage: clog status|backup|restore|pause|resume|rotate|schema|owner|runtime';

/** apps/api / passwords. */
export const apiPasswordsInvalidPasswordWorkBudget =
  'Invalid password work budget';

/** apps/api / projection-cache. */
export const apiProjectionCachePublicProjectionRevisionUnavailable =
  'Public projection revision unavailable.';

/** apps/api / proof-routes. */
export const apiProofRoutesUseAUuidIdempotencyKey =
  'Use a UUID Idempotency-Key.';

export const apiProofRoutesInvalidSubmissionJson = sharedInvalidSubmissionJson;

export const apiProofRoutesInvalidSubmissionFields =
  sharedInvalidSubmissionFields;

export const apiProofRoutesStaffSignInIsNotConfigured =
  sharedStaffSignInIsNotConfigured;

export const apiProofRoutesScreenshotNotFound = 'Screenshot not found.';

export const apiProofRoutesSubmissionRateLimitReachedTryAgainLater =
  'Submission rate limit reached. Try again later.';

export const apiProofRoutesInvalidUsernameClanNameOrGameItemId =
  'Invalid username, clan name or game item ID.';

export const apiProofRoutesSupplyOneScreenshotFile =
  sharedSupplyOneScreenshotFile;

/** apps/api / proof-storage. */
export const apiProofStorageChooseAPngScreenshotUpTo10MiB =
  sharedChooseAPngScreenshotUpTo10MiB;

export const apiProofStorageChooseAPngScreenshot = 'Choose a PNG screenshot.';

export const apiProofStorageInvalidScreenshot = 'Invalid screenshot';

export const apiProofStorageDecodedScreenshotTooLarge =
  'Decoded screenshot too large';

export const apiProofStorageScreenshotMustBeAValidStillPngAtMost8192 =
  'Screenshot must be a valid still PNG, at most 8192 pixels per side and 32 megapixels.';

/** apps/api / proof-store. */
export const apiProofStoreUseAWorldTypeIdentifierOrAJsonArrayOf =
  sharedUseAWorldTypeIdentifierOrAJsonArrayOf;

export const apiProofStoreSubmissionsFromWorldsAreNotAllowed = (
  blocked: string,
) => `Submissions from ${blocked} worlds are not allowed.`;

export const apiProofStoreSupplyTheFullChatMessageUpTo8192Utf8 =
  'Supply the full chat message, up to 8192 UTF-8 bytes.';

export const apiProofStoreClanNameDoesNotMatchTheConfiguredInGameClan =
  'Clan name does not match the configured in-game clan name.';

export const apiProofStoreSubmissionKeyAlreadyUsedForADifferentRequest =
  sharedSubmissionKeyAlreadyUsedForADifferentRequest;

export const apiProofStoreSupplyTheFullChatMessageAsProof =
  'Supply the full chat message as proof.';

export const apiProofStoreAutomaticallyRejectedFilterOutRegularDuplicatesIsOnAndThis =
  'Automatically rejected: Filter out regular duplicates is on and this item already has a Regular collection in this world mode.';

export const apiProofStoreRuneLiteAutoReview = 'RuneLite auto review';

export const apiProofStoreAutomaticApprovalDeferredAnApprovedEventCollectionAlreadyExistsFor =
  'Automatic approval deferred: an approved Event collection already exists for this item.';

/** apps/api / readiness. */
export const apiReadinessReadinessTimedOut = 'Readiness timed out';

export const apiReadinessBotStatusUnavailable = 'Bot status unavailable';

export const apiReadinessInvalidBotStatus = 'Invalid bot status';

/** apps/api / review-routes. */
export const apiReviewRoutesOnlyTheAdministratorCanChangeSubmissionFilters =
  'Only the administrator can change submission filters.';

export const apiReviewRoutesSubmissionFiltersAreUnavailable =
  sharedSubmissionFiltersAreUnavailable;

export const apiReviewRoutesAUuidIdempotencyKeyIsRequired =
  sharedAUuidIdempotencyKeyIsRequired;

export const apiReviewRoutesUnmatchedFilterOnlyAppliesToPendingClaims =
  'Unmatched filter only applies to pending claims.';

export const apiReviewRoutesSubmissionNotFound = sharedSubmissionNotFound;

/** apps/api / review-store. */
export const apiReviewStoreSubmissionChangedOrApprovedCreditAlreadyExistsReload =
  'Submission changed or approved credit already exists; reload.';

export const apiReviewStoreAnApprovedEventCollectionAlreadyExistsForThisItemRevoke =
  sharedAnApprovedEventCollectionAlreadyExistsForThisItemRevoke;

export const apiReviewStoreSubmissionNotFound = sharedSubmissionNotFound;

export const apiReviewStoreAValidReviewReasonOf11000CharactersIsRequired =
  'A valid review reason of 1–1000 characters is required.';

export const apiReviewStoreSelectRegularCollectionOrEventCollection =
  'Select Regular collection or Event collection.';

export const apiReviewStoreHardcoreSupportsRegularCollectionsOnly =
  sharedHardcoreSupportsRegularCollectionsOnly;

export const apiReviewStoreChooseCollectionFlagsOrSavedIntakeTiming =
  'Choose collection flags or saved intake timing.';

export const apiReviewStoreReviewHistoryChangedOrCursorExpiredReloadTheFirstPage =
  'Review history changed or cursor expired. Reload the first page.';

export const apiReviewStorePageSizeMustBeBetween1And20 =
  sharedPageSizeMustBeBetween1And20;

export const apiReviewStoreAUuidIdempotencyKeyIsRequired =
  sharedAUuidIdempotencyKeyIsRequired;

export const apiReviewStoreInvalidManualSubmissionFields =
  'Invalid manual submission fields.';

export const apiReviewStoreSubmissionKeyAlreadyUsedForADifferentRequest =
  sharedSubmissionKeyAlreadyUsedForADifferentRequest;

export const apiReviewStoreSelectAnActiveCatalogItem =
  'Select an active catalog item.';

export const apiReviewStoreCollectionDateIsInvalidOrInTheFuture =
  'Collection date is invalid or in the future.';

export const apiReviewStoreSubmissionFiltersAreUnavailable =
  sharedSubmissionFiltersAreUnavailable;

export const apiReviewStoreSubmissionFiltersChangedReloadBeforeSavingAgain =
  'Submission filters changed. Reload before saving again.';

export const apiReviewStoreSaveCollectionFlagsSeparatelyBeforeRevoking =
  'Save collection flags separately before revoking.';

export const apiReviewStoreResolveACanonicalItemAndValidateProofBeforeApproval =
  'Resolve a canonical item and validate proof before approval.';

export const apiReviewStoreSelectedItemIsInactive =
  'Selected item is inactive.';

export const apiReviewStoreThereAreNoCollectionFlagChangesToSave =
  'There are no collection flag changes to save.';

export const apiReviewStoreKeepTheReviewNoteTo1000Characters =
  'Keep the review note to 1,000 characters.';

export const apiReviewStoreThereAreNoChangesToSave =
  'There are no changes to save.';

export const apiReviewStoreInvalidIntakeTimingChoice =
  'Invalid intake timing choice.';

export const apiReviewStoreChooseSavedIntakeTimingOrAnExplicitCollectionType =
  'Choose saved intake timing or an explicit collection type.';

export const apiReviewStoreManualHistoricalClaimsRequireAnExplicitCollectionType =
  'Manual historical claims require an explicit collection type.';

export const apiReviewStoreSelectAValidCanonicalItemCollectorAndMode =
  'Select a valid canonical item, collector and mode.';

export const apiReviewStoreSelectedCatalogItemIsUnavailable =
  'Selected catalog item is unavailable.';

/** apps/api / runelite-cors. */
export const apiRuneliteCorsBrowserUploadOriginMethodOrHeadersAreNotAllowed =
  'Browser upload origin, method or headers are not allowed.';

/** apps/api / runelite-item-name. */
export const apiRuneliteItemNameSupplyANonemptyItemNameOfUpTo200Characters =
  'Supply a nonempty item name of up to 200 characters without NUL.';

export const apiRuneliteItemNameNameNotSuppliedGameItem = (itemId: number) =>
  `Name not supplied — game item #${itemId}`;

/** apps/api / runelite-settings-routes. */
export const apiRuneliteSettingsRoutesStaffSignInIsNotConfigured =
  sharedStaffSignInIsNotConfigured;

export const apiRuneliteSettingsRoutesRuneLiteSettingsUnavailable =
  sharedRuneLiteSettingsUnavailable;

/** apps/api / runelite-settings. */
export const apiRuneliteSettingsRuneLiteSettingsUnavailable =
  sharedRuneLiteSettingsUnavailable;

export const apiRuneliteSettingsInvalidRuneLiteSettings =
  sharedInvalidRuneLiteSettings;

export const apiRuneliteSettingsRuneLiteSettingsChangedReloadBeforeSavingAgain =
  'RuneLite settings changed. Reload before saving again.';

export const apiRuneliteSettingsClanApiKeyStorageIsUnavailable =
  sharedClanApiKeyStorageIsUnavailable;

export const apiRuneliteSettingsApiKeySettingsChangedReloadBeforeSavingAgain =
  sharedApiKeySettingsChangedReloadBeforeSavingAgain;

export const apiRuneliteSettingsApiKeyMatchingRequiresTheClanApiKey =
  'API key matching requires the clan API key.';

/** apps/api / runtime-work. */
export const apiRuntimeWorkServiceIsDrainingRetryTheSameRequestIdentity =
  'Service is draining. Retry the same request identity.';

/** apps/api / scheduling-routes. */
export const apiSchedulingRoutesStaffSignInIsNotConfigured =
  sharedStaffSignInIsNotConfigured;

export const apiSchedulingRoutesSchedulingUnavailable =
  'Scheduling unavailable.';

export const apiSchedulingRoutesOnlyTheAdministratorCanEnableOrDisableScheduling =
  'Only the administrator can enable or disable scheduling.';

/** apps/api / scheduling-store. */
export const apiSchedulingStoreSchedulingSettingsUnavailable =
  'Scheduling settings unavailable.';

export const apiSchedulingStoreSchedulingExceedsSupportedLimits =
  'Scheduling exceeds supported limits.';

export const apiSchedulingStoreSchedulesChangedReloadBeforeSavingAgain =
  'Schedules changed. Reload before saving again.';

export const apiSchedulingStoreInvalidSchedule = sharedInvalidSchedule;

export const apiSchedulingStoreScheduleNotFound = 'Schedule not found.';

export const apiSchedulingStoreTheScheduleLimitHasBeenReached =
  sharedTheScheduleLimitHasBeenReached;

export const apiSchedulingStoreChooseActiveCollectionLogPages =
  sharedChooseActiveCollectionLogPages;

/** apps/api / screenshot-multipart. */
export const apiScreenshotMultipartUseMultipartFormData =
  'Use multipart/form-data.';

export const apiScreenshotMultipartSupplyOneScreenshotFile =
  sharedSupplyOneScreenshotFile;

export const apiScreenshotMultipartChooseAPngScreenshotUpTo10MiB =
  sharedChooseAPngScreenshotUpTo10MiB;

export const apiScreenshotMultipartInvalidOrDuplicateMultipartFields =
  'Invalid or duplicate multipart fields.';

export const apiScreenshotMultipartMissingSubmissionFieldsOrScreenshot =
  'Missing submission fields or screenshot.';

/** apps/api / server. */
export const apiServerDatabaseUrlIsRequiredWhenAuthOrBotIntakeIs =
  'DATABASE_URL is required when auth or bot intake is enabled';

export const apiServerProofStoragePathIsRequiredWhenAuthIsEnabled =
  'PROOF_STORAGE_PATH is required when auth is enabled';

export const apiServerIconStoragePathIsRequiredWhenAuthIsEnabled =
  'ICON_STORAGE_PATH is required when auth is enabled';

export const apiServerPortMustBeAValidTcpPort = 'PORT must be a valid TCP port';

/** apps/api / setup-admin. */
export const apiSetupAdminAnAdministratorAlreadyExistsThisCommandNeverResetsAccounts =
  'An administrator already exists; this command never resets accounts';

export const apiSetupAdminUsageSetupAdminGenerateOrFromEnvForAutomatedProvisioning =
  'Usage: setup-admin --generate (or --from-env for automated provisioning)';

export const apiSetupAdminProvideA32128ByteHexBootstrapCredential =
  'Provide a 32–128 byte hex bootstrap credential';

export const apiSetupAdminAdministratorCreatedFirstLoginRequiresADifferentPassword =
  'Administrator created. First login requires a different password.';

export const apiSetupAdminUsernameAdminTemporaryPassword = (
  password: string,
) => `Username: admin
Temporary password: ${password}`;

export const apiSetupAdminAnAdministratorAlreadyExists =
  'An administrator already exists';

export const apiSetupAdminAdministratorSetupFailedCheckTheCommandSecretInputsAndInitialized =
  'Administrator setup failed; check the command, secret inputs and initialized database.';

/** apps/api / store. */
export const apiStoreTheCatalogIsNotReady = 'The catalog is not ready.';

export const apiStoreThatUsernameIsAlreadyInUse =
  sharedThatUsernameIsAlreadyInUse;

export const apiStoreAdministratorProvisioningDidNotCreateAnAccount =
  'Administrator provisioning did not create an account.';

export const apiStoreYourAccountChangedSignInAgainBeforeRetrying =
  sharedYourAccountChangedSignInAgainBeforeRetrying;

export const apiStoreModeratorAccountNotFound = 'Moderator account not found.';

export const apiStoreTheAdministratorAccountCannotBeDisabledOrDeleted =
  'The administrator account cannot be disabled or deleted.';

export const apiStoreThisAccountChangedReloadTheAccountList =
  'This account changed. Reload the account list.';

export const apiStoreMatchingRevisionUnavailable =
  'Matching revision unavailable.';

export const apiStoreBotCatalogExceedsSupportedLimits =
  'Bot catalog exceeds supported limits.';

export const apiStoreDiscordInteractionIdWasUsedForADifferentClaim =
  'Discord interaction ID was used for a different claim.';

export const apiStoreSupplyAPngScreenshotAsProof =
  'Supply a PNG screenshot as proof.';

export const apiStoreSelectedCanonicalItemIsUnavailable =
  'Selected canonical item is unavailable.';

export const apiStoreClaimReceiptIsTemporarilyUnavailable =
  'Claim receipt is temporarily unavailable.';

export const apiStoreSettingsUnavailable = 'Settings unavailable.';

export const apiStoreClanNameMustContain180Characters =
  'Clan name must contain 1–80 characters.';

/** apps/api / submission-filters. */
export const apiSubmissionFiltersSubmissionFiltersAreUnavailable =
  sharedSubmissionFiltersAreUnavailable;

export const apiSubmissionFiltersFilterOutRegularDuplicatesIsOnAndThisItemAlready =
  sharedFilterOutRegularDuplicatesIsOnAndThisItemAlready;

export const apiSubmissionFiltersAnApprovedEventCollectionAlreadyExistsForThisItemRevoke =
  sharedAnApprovedEventCollectionAlreadyExistsForThisItemRevoke;

/** apps/api / types. */
export const apiTypesNoAdministratorExistsRunDockerComposeRunRmSetupAdmin =
  'No administrator exists. Run docker compose run --rm setup-admin --generate after database initialization, then sign in as admin and change the temporary password.';

/** apps/api / wom-competition-data. */
export const apiWomCompetitionDataUnknownCompetitionMetricsNeedASavedDefinition =
  'Unknown competition metrics need a saved definition.';

export const apiWomCompetitionDataIncompleteWomCompetitionMetadata =
  'Incomplete WOM competition metadata.';

export const apiWomCompetitionDataInvalidOrDuplicateWomMetricScope =
  sharedInvalidOrDuplicateWomMetricScope;

export const apiWomCompetitionDataIncompleteWomParticipantRoster =
  'Incomplete WOM participant roster.';

export const apiWomCompetitionDataIncompleteWomParticipantResults =
  'Incomplete WOM participant results.';

export const apiWomCompetitionDataUnavailableWomMetricResult =
  'Unavailable WOM metric result.';

/** apps/api / wom. */
export const apiWomWomContainsMissingOrNonIntegerGainedXpImportWas =
  'WOM contains missing or non-integer gained XP; import was not changed.';

export const apiWomEnterAWomCompetitionLink = 'Enter a WOM competition link.';

export const apiWomUseHttpsWiseoldmanNetCompetitionsId =
  sharedUseHttpsWiseoldmanNetCompetitionsId;

export const apiWomWomCompetitionHasNoMetricScope =
  'WOM competition has no metric scope.';

export const apiWomWomReturnedInvalidOrDuplicateCompetitionMetrics =
  'WOM returned invalid or duplicate competition metrics.';

export const apiWomSkillCompetitionsMustTrackSupportedXpSkillsComputedMetricsAre =
  'SKILL competitions must track supported XP skills; computed metrics are unsupported.';

export const apiWomIncompleteWomCompetitionMetadataOrParticipants =
  'Incomplete WOM competition metadata or participants.';

export const apiWomWomPerSkillBreakdownDoesNotMatchTheSourceCompetition =
  'WOM per-skill breakdown does not match the source competition.';

export const apiWomInvalidWomPlayerIdentity = 'Invalid WOM player identity.';

export const apiWomDuplicateWomParticipants = 'Duplicate WOM participants.';

export const apiWomIncompleteOrDuplicateWomParticipant =
  'Incomplete or duplicate WOM participant.';

export const apiWomUnexpectedWomDeltaMetric = 'Unexpected WOM delta metric.';

export const apiWomWomCompetitionHasUnavailableSkillXpPriorTotalsArePreserved =
  'WOM competition has unavailable skill XP; prior totals are preserved.';

export const apiWomWomReturnedPartialParticipantData =
  'WOM returned partial participant data.';

export const apiWomWomRequestCanceled = 'WOM request canceled';

export const apiWomInvalidWomUpstreamAddress = 'Invalid WOM upstream address.';

export const apiWomWomIsTemporarilyUnavailableNoDataWasChanged =
  'WOM is temporarily unavailable; no data was changed.';

export const apiWomWomRateLimitReachedNoDataWasChanged =
  'WOM rate limit reached; no data was changed.';

export const apiWomWomCompetitionCouldNotBeFetched =
  'WOM competition could not be fetched.';

export const apiWomWomResponseExceedsThe8MiBLimitNoResultsWere =
  'WOM response exceeds the 8 MiB limit. No results were imported.';

export const apiWomWomReturnedInvalidJson = 'WOM returned invalid JSON.';

export const apiWomWomReturnedInvalidCompetitionDetails =
  'WOM returned invalid competition details.';

/** apps/api / xp-routes. */
export const apiXpRoutesAUuidIdempotencyKeyIsRequired =
  sharedAUuidIdempotencyKeyIsRequired;

/** apps/api / xp-store. */
export const apiXpStoreXpImportHistoryChangedOrCursorExpiredReloadTheFirst =
  'XP import history changed or cursor expired. Reload the first page.';

export const apiXpStoreXpStateUnavailable = sharedXpStateUnavailable;

export const apiXpStoreXpEventLimitExceeded = sharedXpEventLimitExceeded;

export const apiXpStorePageSizeMustBeBetween1And20 =
  sharedPageSizeMustBeBetween1And20;

export const apiXpStoreXpHistoryStateUnavailable =
  'XP history state unavailable.';

/** apps/api / xp-types. */
export const apiXpTypesInvalidXpReconciliation = 'Invalid XP reconciliation';

/** apps/bot / api. */
export const botApiBotIntakeApiUnavailable = 'Bot intake API unavailable';

export const botApiSubmissionReceiptUnconfirmed =
  'Submission receipt unconfirmed';

export const botApiInvalidDurableReceiptFromTheIntakeApi =
  'Invalid durable receipt from the intake API';

export const botApiInvalidAutocompleteResponse =
  'Invalid autocomplete response';

/** apps/bot / command. */
export const botCommandClanCollectionLog = sharedClanCollectionLog2;

export const botCommandSubmitProofOfACollectedItemForAdminReview =
  'Submit proof of a collected item for admin review';

export const botCommandChooseAnItemOrTypeItsNameForManualMatching =
  'Choose an item or type its name for manual matching';

export const botCommandPngScreenshotProofUpTo10MiB =
  'PNG screenshot proof (up to 10 MiB)';

export const botCommandCollectorNameDefaultsToYourDiscordDisplayName =
  'Collector name; defaults to your Discord display name';

export const botCommandClaimTheItemWasObtainedOnHardcoreWorldsDefaultNo =
  'Claim the item was obtained on hardcore worlds (default: no)';

/** apps/bot / config. */
export const botConfigMustBeADiscordSnowflake = (name: string) =>
  `${name} must be a Discord snowflake`;

export const botConfigDiscordBotTokenDiscordGuildIdAndBotApiToken =
  'DISCORD_BOT_TOKEN, DISCORD_GUILD_ID and BOT_API_TOKEN must be configured together';

export const botConfigBotApiTokenMustBe32RandomBytesEncodedAs =
  'BOT_API_TOKEN must be 32+ random bytes encoded as hex';

export const botConfigApiBaseUrlMustBeAnAbsoluteHttpSOrigin =
  'API_BASE_URL must be an absolute HTTP(S) origin';

export const botConfigApiBaseUrlMustBeAnHttpSOriginWithout =
  'API_BASE_URL must be an HTTP(S) origin without a path or credentials';

/** apps/bot / handler. */
export const botHandlerItemSubmittedToReview = 'Item submitted to review';

export const botHandlerDiscordInteractionId = (id: string) => `
Discord interaction ID: ${id}.`;

export const botHandlerSubmissionCouldNotBeConfirmedItMightHaveReachedThe = (
  value: string,
) => `Submission could not be confirmed. It might have reached the server and been saved for review, but no valid receipt was received.${value}
Ask a clan admin to check this interaction ID in the submission history. Do not repeat /cc-clog submit as a new command until checked: Discord assigns a new interaction ID, which can create another submission. No approval or collection credit is implied.`;

export const botHandlerNothingWasSentToTheSubmissionService = (
  message: string,
) => `${message} Nothing was sent to the submission service.`;

export const botHandlerThisDiscordInteractionIdWasAlreadySubmittedWithDifferentDetails =
  'This Discord interaction ID was already submitted with different details. Nothing new was saved.';

export const botHandlerTheSubmittedItemDateOrProofWasRejectedByThe =
  'The submitted item, date or proof was rejected by the API. Nothing was saved.';

export const botHandlerTheSubmissionServiceRejectedTheConfiguredBotCredentialsOrGuild =
  'The submission service rejected the configured bot credentials or guild. Nothing was saved.';

export const botHandlerTheSubmissionServiceIsTemporarilyRateLimitedNoReceiptCould =
  'The submission service is temporarily rate-limited. No receipt could be confirmed; retry later.';

export const botHandlerSearchBusyWaitSOrTypeAnItemName = (
  retryAfterSeconds: number,
) => `Search busy: wait ${retryAfterSeconds}s or type an item name`;

export const botHandlerThisCommandCanOnlyBeUsedInTheConfiguredClan =
  'This command can only be used in the configured clan server.';

export const botHandlerItemSearchWasBusyWaitAFewSecondsThenSearch =
  'Item search was busy. Wait a few seconds, then search again or type the item name manually. This delivery was not sent to the submission service.';

export const botHandlerAttachAPngScreenshotIfThisOptionIsMissingAsk =
  'Attach a PNG screenshot. If this option is missing, ask an administrator to register /cc-clog again.';

export const botHandlerUseANonblankItemAndACollectorNameUpTo =
  'Use a nonblank item and a collector name up to 80 characters.';

export const botHandlerTheSelectedCatalogItemIsInvalidPleaseChooseAnAutocomplete =
  'The selected catalog item is invalid. Please choose an autocomplete item again.';

export const botHandlerSubmissionBusyWaitSecondsAndTryAgainThisDeliveryWas = (
  retryAfterSeconds: number,
  value: string,
) => `Submission busy. Wait ${retryAfterSeconds} seconds and try again. This delivery was not sent to the submission service.${value}
If this interaction was attempted earlier or had an unconfirmed reply, ask an admin to check its receipt before starting a new command.`;

/** apps/bot / index. */
export const botIndexDiscordBotDisabledConfigureCredentialsToEnableGatewayCommands =
  'Discord bot disabled: configure credentials to enable gateway commands.';

/** apps/bot / register. */
export const botRegisterTargetGuildId = 'target guild ID';

export const botRegisterDiscordBotTokenIsRequiredForCommandRegistration =
  'DISCORD_BOT_TOKEN is required for command registration';

export const botRegisterRunRegisterTestOrRegisterGuildExplicitly =
  'Run register:test or register:guild explicitly';

export const botRegisterSaveADiscordTokenInAdministrationFirst =
  'Save a Discord token in administration first';

export const botRegisterGuildCommandRegisteredInTheSelectedGuild =
  'Guild command registered in the selected guild.';

/** apps/bot / saved-config. */
export const botSavedConfigPrivateIntegrationStorageIsRequired =
  'Private integration storage is required';

/** apps/bot / screenshot. */
export const botScreenshotChooseAPngScreenshotUpTo10MiB =
  sharedChooseAPngScreenshotUpTo10MiB;

export const botScreenshotTheScreenshotAttachmentIsUnavailable =
  'The screenshot attachment is unavailable.';

export const botScreenshotUseThePngAttachmentSuppliedWithThisDiscordCommand =
  'Use the PNG attachment supplied with this Discord command.';

export const botScreenshotUnavailable = sharedUnavailable2;

export const botScreenshotInvalidMetadata = 'Invalid metadata';

export const botScreenshotTooLarge = 'Too large';

export const botScreenshotInvalidPng = 'Invalid PNG';

export const botScreenshotThePngScreenshotCouldNotBeDownloadedTryAttachingIt =
  'The PNG screenshot could not be downloaded. Try attaching it again.';

/** apps/bot / workloads. */
export const botWorkloadsExceedsItsWorkloadLimit = (name: string) =>
  `${name} exceeds its workload limit`;

/** packages/domain / collection-types. */
export const domainCollectionTypesAwaitingItemMatch = sharedAwaitingItemMatch;

export const domainCollectionTypesEventCollection = sharedEventCollection;

export const domainCollectionTypesRegularCollection = sharedRegularCollection;

/** packages/domain / competition-metrics. */
export const domainCompetitionMetricsInvalidMetricDefinition =
  'Invalid metric definition.';

export const domainCompetitionMetricsChooseAValidMetricTypeNameActivePagesAndSupported =
  'Choose a valid metric type, name, active pages and supported XP skill.';

export const domainCompetitionMetricsCompetitionResultsMustBeAvailableExactNonnegativeValues =
  'Competition results must be available exact nonnegative values.';

export const domainCompetitionMetricsCompetitionCountersAndXpMustBeIntegers =
  'Competition counters and XP must be integers.';

export const domainCompetitionMetricsOverall = 'Overall';

export const domainCompetitionMetricsIncompleteCompetitionMetricDefinitions =
  'Incomplete competition metric definitions.';

export const domainCompetitionMetricsInvalidCompetitionMetricDefinition =
  'Invalid competition metric definition.';

export const domainCompetitionMetricsCompetitionMetricDefinitionsDoNotMatchScope =
  'Competition metric definitions do not match scope.';

export const domainCompetitionMetricsCompetitionWeightsMustBePositive =
  'Competition weights must be positive.';

export const domainCompetitionMetricsInvalidCompetitionMetricCreationTime =
  'Invalid competition metric creation time.';

export const domainCompetitionMetricsMetricDefinitionKeyDoesNotMatchScope =
  'Metric definition key does not match scope.';

export const domainCompetitionMetricsScore = 'Score';

export const domainCompetitionMetricsKills = 'Kills';

export const domainCompetitionMetricsHours = 'Hours';

export const domainCompetitionMetricsInvalidCompetitionStandings =
  'Invalid competition standings.';

export const domainCompetitionMetricsInvalidCompetitionParticipant =
  'Invalid competition participant.';

export const domainCompetitionMetricsInvalidOrDuplicateCompetitionParticipant =
  'Invalid or duplicate competition participant.';

export const domainCompetitionMetricsInvalidCompetitionDeltas =
  'Invalid competition deltas.';

export const domainCompetitionMetricsIncompleteCompetitionDeltas =
  'Incomplete competition deltas.';

export const domainCompetitionMetricsInvalidCompetitionDelta =
  'Invalid competition delta.';

export const domainCompetitionMetricsUnexpectedOrDuplicateCompetitionDelta =
  'Unexpected or duplicate competition delta.';

export const domainCompetitionMetricsCompetitionScoreDoesNotMatchItsMetricDelta =
  'Competition score does not match its metric delta.';

/** packages/domain / competitions. */
export const domainCompetitionsInvalidOrDuplicateWomMetricScope =
  sharedInvalidOrDuplicateWomMetricScope;

export const domainCompetitionsMixedAggregateTotalScopesAreUnsupported =
  'Mixed aggregate total scopes are unsupported.';

export const domainCompetitionsCustomXpMetricsUseUnsupportedOrDuplicateSkillTargets =
  'Custom XP metrics use unsupported or duplicate skill targets.';

export const domainCompetitionsUnknownWomMetricsAreUnsupported =
  'Unknown WOM metrics are unsupported.';

export const domainCompetitionsMixedMetricTypesAreUnsupportedByWom =
  'Mixed metric types are unsupported by WOM.';

/** packages/domain / discord-settings. */
export const domainDiscordSettingsInvalidDiscordSettings =
  'Invalid Discord settings.';

export const domainDiscordSettingsDiscordIdsMustContain1720Digits =
  'Discord IDs must contain 17–20 digits.';

export const domainDiscordSettingsApplicationAndServerIdsAreRequiredToEnableDiscord =
  'Application and server IDs are required to enable Discord.';

export const domainDiscordSettingsDiscordRateLimitsAreOutsideTheAllowedRange =
  'Discord rate limits are outside the allowed range.';

export const domainDiscordSettingsInvalidDiscordSettingsReceipt =
  'Invalid Discord settings receipt.';

/** packages/domain / highlight-colour. */
export const domainHighlightColourInvalidHighlightColour =
  'Invalid highlight colour.';

export const domainHighlightColourHighlightRgbChannelsMustBeIntegersFrom0To255 =
  'Highlight RGB channels must be integers from 0 to 255; alpha must be from 0 to 1.';

/** packages/domain / index. */
export const domainIndexInvalidOrDuplicateCanonicalItem =
  'Invalid or duplicate canonical item';

export const domainIndexInvalidOrAmbiguousGameItemMapping =
  'Invalid or ambiguous game item mapping';

export const domainIndexInvalidOrDuplicatePage = 'Invalid or duplicate page';

export const domainIndexInvalidPageItemReference =
  'Invalid page item reference';

export const domainIndexUseYyyyMmDd = 'Use YYYY-MM-DD';

export const domainIndexInvalidCalendarDate = 'Invalid calendar date';

/** packages/domain / runelite-rules. */
export const domainRuneliteRulesInvalidRuneLiteSettings =
  sharedInvalidRuneLiteSettings;

export const domainRuneliteRulesInvalidRuneLiteSettingsUseValidNamesAndWorldPoliciesWith =
  'Invalid RuneLite settings. Use valid names and world policies, with up to 200 whitelist entries.';

export const domainRuneliteRulesInvalidRuneLiteSettingsRevision =
  'Invalid RuneLite settings revision.';

export const domainRuneliteRulesInvalidClanApiKeyRequirement =
  'Invalid clan API key requirement.';

export const domainRuneliteRulesSubmissionsFromWorldsAreNotAllowed = (
  blocked: string,
) => `Submissions from ${blocked} worlds are not allowed.`;

export const domainRuneliteRulesSubmissionsFromWorldsAreNotAllowed2 = (
  value: string,
) => `Submissions from ${value} worlds are not allowed.`;

export const domainRuneliteRulesAutomaticallyApprovedPlayerWhitelist =
  'Automatically approved: player whitelist.';

export const domainRuneliteRulesAutomaticallyApprovedWorldPolicies = (
  value: string,
) => `Automatically approved: world policies (${value}).`;

export const domainRuneliteRulesAwaitingStaffReview = 'Awaiting staff review.';

/** packages/domain / scheduling. */
export const domainSchedulingSubmissionsAreClosedForThisItemAtLeastOneAssociated =
  'Submissions are closed for this item. At least one associated collection log page must be open.';

export const domainSchedulingChooseUpTo2000DistinctCollectionLogPages =
  'Choose up to 2,000 distinct collection log pages.';

export const domainSchedulingInvalidSchedule = sharedInvalidSchedule;

export const domainSchedulingUseACompleteUtcDateAndTime =
  'Use a complete UTC date and time.';

export const domainSchedulingInvalidScheduleDateAndTime =
  'Invalid schedule date and time.';

export const domainSchedulingChooseAScheduleNameAndOneOrMoreDistinctCollection =
  'Choose a schedule name and one or more distinct collection log pages.';

export const domainSchedulingTheEndMustBeAfterTheStart =
  'The end must be after the start.';

export const domainSchedulingInvalidSchedulingState =
  'Invalid scheduling state.';

export const domainSchedulingInvalidScheduleId = 'Invalid schedule ID.';

export const domainSchedulingDuplicateScheduleIds = 'Duplicate schedule IDs.';

/** packages/domain / server-secrets. */
export const domainServerSecretsSetOnlyOrFile = (name: string, name2: string) =>
  `Set only ${name} or ${name2}_FILE`;

export const domainServerSecretsFileMustBeAbsolute = (name: string) =>
  `${name}_FILE must be absolute`;

export const domainServerSecretsCannotReadAValidFile = (name: string) =>
  `Cannot read a valid ${name}_FILE`;

/** packages/domain / site-copy. */
export const domainSiteCopyCollectionTitle = sharedClanCollectionLog;

export const domainSiteCopyCollectionCaption = 'Collected by clan members';

export const domainSiteCopyXpTitle = 'XP gained during SOTW events';

export const domainSiteCopyInvalidHardcoreAppearance =
  'Invalid hardcore appearance.';

export const domainSiteCopyHardcoreClanNameMustContain180PrintableCharacters =
  'Hardcore clan name must contain 1–80 printable characters.';

export const domainSiteCopyInvalidWebsiteText = 'Invalid website text.';

export const domainSiteCopyEachWebsiteTextMustContain1160PrintableCharacters =
  'Each website text must contain 1–160 printable characters.';

/** packages/domain / skills. */
export const domainSkillsAttack = 'Attack';

export const domainSkillsHitpoints = 'Hitpoints';

export const domainSkillsMining = 'Mining';

export const domainSkillsStrength = 'Strength';

export const domainSkillsAgility = 'Agility';

export const domainSkillsSmithing = 'Smithing';

export const domainSkillsDefence = 'Defence';

export const domainSkillsHerblore = 'Herblore';

export const domainSkillsFishing = 'Fishing';

export const domainSkillsRanged = 'Ranged';

export const domainSkillsThieving = 'Thieving';

export const domainSkillsCooking = 'Cooking';

export const domainSkillsPrayer = 'Prayer';

export const domainSkillsCrafting = 'Crafting';

export const domainSkillsFiremaking = 'Firemaking';

export const domainSkillsMagic = 'Magic';

export const domainSkillsFletching = 'Fletching';

export const domainSkillsWoodcutting = 'Woodcutting';

export const domainSkillsRunecraft = 'Runecraft';

export const domainSkillsSlayer = 'Slayer';

export const domainSkillsFarming = 'Farming';

export const domainSkillsConstruction = 'Construction';

export const domainSkillsHunter = 'Hunter';

export const domainSkillsSailing = 'Sailing';

/** packages/domain / staff-pages. */
export const domainStaffPagesSubmissions = sharedSubmissions;

export const domainStaffPagesItemsCatalog = sharedItemsCatalog;

export const domainStaffPagesSchedulingAndCompetitions =
  sharedSchedulingAndCompetitions;

export const domainStaffPagesRuneLiteSubmissions = sharedRuneLiteSubmissions;

export const domainStaffPagesSiteSettings = sharedSiteSettings;

export const domainStaffPagesHardcoreWorlds = sharedHardcoreWorlds;

export const domainStaffPagesDiscordBot = sharedDiscordBot;

export const domainStaffPagesChooseValidModeratorPagesWithoutDuplicates =
  'Choose valid moderator pages without duplicates.';

export const domainStaffPagesInvalidAccessControlSettings =
  'Invalid access control settings.';

export const domainStaffPagesInvalidAccessControlRevision =
  'Invalid access control revision.';

/** packages/domain / submission-filters. */
export const domainSubmissionFiltersInvalidSubmissionFilters =
  'Invalid submission filters.';

/** packages/domain / submission-help. */
export const domainSubmissionHelpDefaultMarkdown = `## Submit a collection

1. Follow your clan's RuneLite submission setup, or send your proof to a moderator.
2. Include the item, collector name, collection date and a PNG screenshot. RuneLite submissions can use their chat proof.
3. Your collection appears in the log once the submission is approved.

Ask your clan staff for setup instructions and submission rules.`;

export const domainSubmissionHelpSubmissionInstructionsMustBeAtMost32KiBOfUtf =
  'Submission instructions must be at most 32 KiB of UTF-8 text with no NUL characters.';

/** packages/domain / work-budget. */
export const domainWorkBudgetServiceIsBusyTryAgainInSeconds = (
  retryAfterSeconds: number,
) => `Service is busy. Try again in ${retryAfterSeconds} seconds.`;

export const domainWorkBudgetInvalidWorkBudget = 'Invalid work budget';

export const domainWorkBudgetInvalidKeyBudget = 'Invalid key budget';

export const domainWorkBudgetInvalidWorkScope = 'Invalid work scope';

/** packages/domain / world-types. */
export const domainWorldTypesUseAWorldTypeIdentifierOrAJsonArrayOf =
  sharedUseAWorldTypeIdentifierOrAJsonArrayOf;

/** packages/database / asset-maintenance. */
export const databaseAssetMaintenanceSpecifyDryRunExplicitly =
  'Specify dryRun explicitly.';

export const databaseAssetMaintenanceInvalidUse = (
  key: string,
  min: number,
  max: number,
) => `Invalid ${key}: use ${min}..${max}.`;

export const databaseAssetMaintenanceAssetMaintenanceRequiresAnIdleReadCommittedConnection =
  'Asset maintenance requires an idle READ COMMITTED connection.';

export const databaseAssetMaintenanceSupplyDedicatedAbsoluteIconProofDirectories =
  'Supply dedicated absolute icon/proof directories.';

export const databaseAssetMaintenanceStorageRootMustBeARealDirectory =
  'Storage root must be a real directory.';

export const databaseAssetMaintenanceStorageDirectoriesMustBeDistinct =
  'Storage directories must be distinct.';

export const databaseAssetMaintenanceAnotherAssetMaintenanceCommandIsActive =
  'Another asset maintenance command is active.';

export const databaseAssetMaintenanceApplyDatabaseMigrationsAndEnableTheAssetWriteBarriersFirst =
  'Apply database migrations and enable the asset write barriers first.';

export const databaseAssetMaintenanceUnknownAssetMaintenanceOption =
  'Unknown asset maintenance option.';

export const databaseAssetMaintenanceDatabaseUrlIsRequired =
  'DATABASE_URL is required.';

export const databaseAssetMaintenanceAssetMaintenanceDidNotCompleteCheckDatabaseMountConfigurationAnd =
  'Asset maintenance did not complete. Check database/mount configuration and retry; committed retirements remain safe to resume.';

/** packages/database / bootstrap. */
export const databaseBootstrapDatabaseUrlIsRequired =
  sharedDatabaseUrlIsRequired2;

export const databaseBootstrapDatabaseMigrationsAppliedCatalog = (
  value: string,
) => `Database migrations applied; catalog ${value}`;

export const databaseBootstrapClueTaxonomy = (value: string) =>
  `Clue taxonomy ${value}`;

export const databaseBootstrapRestrictedDatabaseRuntimeRoleReady =
  'Restricted database runtime role ready';

/** packages/database / catalog-build. */
export const databaseCatalogBuildUnexpectedSourceCategoriesOrder =
  'Unexpected source categories/order';

export const databaseCatalogBuildIdentityRegistryCoverageChanged =
  'Identity registry coverage changed';

export const databaseCatalogBuildUnmappedSourceId = (gameId: number) =>
  `Unmapped source ID ${gameId}`;

export const databaseCatalogBuildPageLabelCoverageChanged =
  'Page label coverage changed';

export const databaseCatalogBuildSourceItemPageCoverageDiffers =
  'Source item/page coverage differs';

export const databaseCatalogBuildPinnedCoverageDiffers =
  'Pinned coverage differs';

export const databaseCatalogBuildChangedSource = (file: string) =>
  `Changed source ${file}`;

export const databaseCatalogBuildSourceRevisionMismatch =
  'Source revision mismatch';

export const databaseCatalogBuildWikiItemCoverageDiffers =
  'Wiki item coverage differs';

export const databaseCatalogBuildAssetCoverageDiffers =
  'Asset coverage differs';

export const databaseCatalogBuildChangedIcon = (gameItemId: number) =>
  `Changed icon ${gameItemId}`;

export const databaseCatalogBuildIconsMustRetainTransparency =
  'Icons must retain transparency';

export const databaseCatalogBuildChangedSupportingAsset = (path: string) =>
  `Changed supporting asset ${path}`;

export const databaseCatalogBuildRunCatalogBuildAndReviewTheDiff =
  'Run catalog:build and review the diff';

export const databaseCatalogBuildVerifiedItemsPagesNoCollectionCredits = (
  length: number,
  length2: number,
) => `Verified ${length} items, ${length2} pages; no collection credits`;

/** packages/database / catalog-import. */
export const databaseCatalogImportCatalogResult = (result: string) =>
  `Catalog ${result}`;

export const databaseCatalogImportBundledCatalogChecksumMismatch =
  'Bundled catalog checksum mismatch';

export const databaseCatalogImportADifferentCatalogIsAlreadyImportedUseAReviewedRefresh =
  'A different catalog is already imported; use a reviewed refresh workflow';

export const databaseCatalogImportDatabaseUrlIsRequired =
  sharedDatabaseUrlIsRequired2;

/** packages/database / catalog-model. */
export const databaseCatalogModelInvalidCatalogSnapshot =
  'Invalid catalog snapshot';

export const databaseCatalogModelInvalidImportedItem = 'Invalid imported item';

export const databaseCatalogModelInvalidImportedPage = 'Invalid imported page';

export const databaseCatalogModelCatalogSlotLimitExceeded =
  'Catalog slot limit exceeded';

/** packages/database / catalog-update-bundle. */
export const databaseCatalogUpdateBundleCatalogUpdateImageChecksumSizeMismatch =
  'Catalog update image checksum/size mismatch.';

export const databaseCatalogUpdateBundleCatalogUpdateRequiresAStillWebPWithTheDeclaredDimensions =
  'Catalog update requires a still WebP with the declared dimensions.';

export const databaseCatalogUpdateBundleInvalidCatalogUpdateIndex =
  'Invalid catalog update index.';

export const databaseCatalogUpdateBundleCatalogUpdateFilenameDoesNotMatchItsIdentity =
  'Catalog update filename does not match its identity.';

/** packages/database / catalog-update-check. */
export const databaseCatalogUpdateCheckGameIdIsAssignedToMultipleReleaseIdentities =
  'Game ID is assigned to multiple release identities.';

export const databaseCatalogUpdateCheckMissingPageDefinitionInCatalogUpdate =
  'Missing page definition in catalog update.';

export const databaseCatalogUpdateCheckCatalogUpdatesVerifiedBatchesItemsImages =
  (length: number, size: number, length2: number) =>
    `Catalog updates verified: ${length} batches, ${size} items, ${length2} images.`;

/** packages/database / catalog-update-install. */
export const databaseCatalogUpdateInstallLegacyCatalogImageProvenanceIsImmutablePublishNewImagesIn =
  'Legacy catalog image provenance is immutable. Publish new images in catalog/updates.';

export const databaseCatalogUpdateInstallInvalidLegacyCatalogImagePath =
  'Invalid legacy catalog image path.';

export const databaseCatalogUpdateInstallNewItemImagesBelongInCatalogUpdatesNotTheImmutable =
  'New item images belong in catalog/updates, not the immutable legacy bundle.';

export const databaseCatalogUpdateInstallBundledCatalogRefresh =
  'Bundled catalog refresh';

/** packages/database / catalog-update-model. */
export const databaseCatalogUpdateModelIdItemsPagesTitle =
  'id,items,pages,title';

export const databaseCatalogUpdateModelInvalidCatalogUpdateBatch =
  'Invalid catalog update batch.';

export const databaseCatalogUpdateModelCategoryKeyName = 'category,key,name';

export const databaseCatalogUpdateModelInvalidUpdatePage =
  'Invalid update page.';

export const databaseCatalogUpdateModelGameItemIdsImageKeyNamePageKeys =
  'gameItemIds,image,key,name,pageKeys';

export const databaseCatalogUpdateModelHeightSha256Width =
  'height,sha256,width';

export const databaseCatalogUpdateModelInvalidUpdateItemOrImage =
  'Invalid update item or image.';

export const databaseCatalogUpdateModelDuplicateUpdateIdentities =
  'Duplicate update identities.';

export const databaseCatalogUpdateModelAMatchingEntryWasRetiredResolveItInItemsCatalog =
  'A matching entry was retired. Resolve it in Items catalog before adopting it.';

export const databaseCatalogUpdateModelConflictingIdentityEvidenceResolveGameIdsOrDuplicateEntriesIn =
  'Conflicting identity evidence. Resolve game IDs or duplicate entries in Items catalog, then rescan.';

export const databaseCatalogUpdateModelSeveralSuppliedEntriesMatchTheSameLocalIdentityExplicitlyResolve =
  'Several supplied entries match the same local identity. Explicitly resolve the catalog before continuing.';

/** packages/database / catalog-update-store. */
export const databaseCatalogUpdateStoreCatalogUpdateCapacityExceeded =
  'Catalog update capacity exceeded.';

export const databaseCatalogUpdateStoreReleaseIdentitiesConflictAcrossCatalogUpdates =
  'Release identities conflict across catalog updates.';

export const databaseCatalogUpdateStoreEverySuppliedPageKeyNeedsAPageDefinition =
  'Every supplied page key needs a page definition.';

export const databaseCatalogUpdateStoreThisCatalogIdentityAlreadyHasADifferentReleaseMappingReload =
  'This catalog identity already has a different release mapping. Reload the review.';

export const databaseCatalogUpdateStoreCatalogCapacityExceeded =
  'Catalog capacity exceeded.';

export const databaseCatalogUpdateStoreCatalogPageCapacityExceeded =
  'Catalog page capacity exceeded.';

export const databaseCatalogUpdateStoreSuppliedPageCategoryDoesNotExist =
  'Supplied page category does not exist.';

export const databaseCatalogUpdateStoreCatalogItemCapacityExceeded =
  'Catalog item capacity exceeded.';

export const databaseCatalogUpdateStoreSuppliedImageIsUnavailable =
  'Supplied image is unavailable.';

export const databaseCatalogUpdateStoreCatalogItemSlotCapacityExceeded =
  'Catalog item-slot capacity exceeded.';

export const databaseCatalogUpdateStoreMissingCatalogUpdateImage =
  'Missing catalog update image.';

export const databaseCatalogUpdateStoreAShippedCatalogUpdateIsImmutablePublishANewBatch =
  'A shipped catalog update is immutable. Publish a new batch ID.';

export const databaseCatalogUpdateStoreUnlinkedLocalPage =
  'Unlinked local page';

export const databaseCatalogUpdateStorePossibleExistingPagesRequireReview =
  'Possible existing pages require review';

export const databaseCatalogUpdateStoreReviewTheMatchingItemEvidenceAndAdoptALocalPage =
  'Review the matching item evidence and adopt a local page, or explicitly create a separate page.';

export const databaseCatalogUpdateStoreResolveTheItemIdentitiesFirstThenRescanToReviewThis =
  'Resolve the item identities first, then rescan to review this possible existing page.';

export const databaseCatalogUpdateStoreUseThisLocalPageFor = (key: string) =>
  `Use this local page for ${key}`;

export const databaseCatalogUpdateStoreUnlinkedLocalItem =
  'Unlinked local item';

export const databaseCatalogUpdateStoreUseThisLocalItemFor = (key: string) =>
  `Use this local item for ${key}`;

export const databaseCatalogUpdateStoreAdditionalContentInstalledAfterResolvingIdentities =
  'Additional content installed after resolving identities';

export const databaseCatalogUpdateStoreRequestKeyAlreadyUsed =
  'Request key already used.';

export const databaseCatalogUpdateStoreANewerCatalogUpdateIsAvailableReloadTheReview =
  'A newer catalog update is available. Reload the review.';

export const databaseCatalogUpdateStoreThisRequestKeyWasUsedForDifferentCatalogChoices =
  'This request key was used for different catalog choices.';

export const databaseCatalogUpdateStoreTheCatalogChangedReloadAndReviewTheNewDifferences =
  'The catalog changed. Reload and review the new differences.';

export const databaseCatalogUpdateStoreSelectDistinctCurrentCatalogProposals =
  'Select distinct current catalog proposals.';

export const databaseCatalogUpdateStoreChooseOnePageIdentityOrSeparatePageCreationPerSupplied =
  'Choose one page identity or separate-page creation per supplied page.';

export const databaseCatalogUpdateStoreConfirmTheProposedLocalIdentityBeforeApplyingItsDependentCorrections =
  'Confirm the proposed local identity before applying its dependent corrections.';

export const databaseCatalogUpdateStoreRetainOrAddASuppliedGameIdBeforeRemovingThe =
  'Retain or add a supplied game ID before removing the existing mappings.';

export const databaseCatalogUpdateStoreTheSuppliedPageSectionIsUnavailable =
  'The supplied page section is unavailable.';

export const databaseCatalogUpdateStoreSelectMissingItemPageRelationshipsWhenAddingItems =
  'Select Missing item-page relationships when adding items.';

export const databaseCatalogUpdateStoreSelectMissingItemsBeforeFixingTheirRelationships =
  'Select Missing items before fixing their relationships.';

export const databaseCatalogUpdateStoreASuppliedGameIdBelongsToAnotherLocalItemResolve =
  'A supplied game ID belongs to another local item. Resolve it first.';

export const databaseCatalogUpdateStoreTheSelectedGameIdMappingChangedReloadTheReview =
  'The selected game ID mapping changed. Reload the review.';

export const databaseCatalogUpdateStoreTheSuppliedPageMappingChanged =
  'The supplied page mapping changed.';

export const databaseCatalogUpdateStoreSelectMissingPagesAndResolvePageIdentitiesBeforeFixingTheir =
  'Select Missing pages and resolve page identities before fixing their relationships.';

export const databaseCatalogUpdateStoreCatalogUpdateImageNotFound =
  'Catalog update image not found.';

/** packages/database / clue-taxonomy. */
export const databaseClueTaxonomyUnknownClueCatalogGameId = (gameId: number) =>
  `Unknown clue catalog game ID: ${gameId}`;

export const databaseClueTaxonomyClueCorrectionRequiresTheOriginalPinnedCatalogImport =
  'Clue correction requires the original pinned catalog import.';

export const databaseClueTaxonomyCluePagesAlreadyDifferInspectTheExistingCatalogBeforeApplying =
  'Clue pages already differ; inspect the existing catalog before applying correction.';

export const databaseClueTaxonomyLegacyCluePageWasModified = (pageId: string) =>
  `Legacy clue page was modified: ${pageId}`;

export const databaseClueTaxonomyManualItemOrderOnLegacyCluePageMigrateItManually =
  (pageId: string) =>
    `Manual item/order on legacy clue page ${pageId}; migrate it manually before retiring the page.`;

export const databaseClueTaxonomyLegacyCluePagesHaveAuditHistoryReviewBeforeReplacingThem =
  'Legacy clue pages have audit history; review before replacing them.';

export const databaseClueTaxonomyClueItemAliasMappingsChangedNoTaxonomyChangesApplied =
  'Clue item alias mappings changed; no taxonomy changes applied.';

export const databaseClueTaxonomyRegularCluePageDiffersFromTheSource = (
  pageId: string,
) => `Regular clue page differs from the source: ${pageId}`;

export const databaseClueTaxonomyDatabaseUrlIsRequired =
  sharedDatabaseUrlIsRequired2;

export const databaseClueTaxonomyClueTaxonomy = (value: string) =>
  `Clue taxonomy ${value}`;

/** packages/database / discord-settings. */
export const databaseDiscordSettingsInvalidIntegrationEncryptionRoot =
  'Invalid integration encryption root';

export const databaseDiscordSettingsDiscordCredentialStorageIsUnavailable =
  'Discord credential storage is unavailable.';

export const databaseDiscordSettingsDiscordSettingsAreUnavailable =
  sharedDiscordSettingsAreUnavailable;

export const databaseDiscordSettingsDiscordBotTokenIsInvalid =
  'Discord bot token is invalid.';

export const databaseDiscordSettingsDiscordSettingsChangedReloadBeforeSavingAgain =
  'Discord settings changed. Reload before saving again.';

export const databaseDiscordSettingsSaveABotTokenBeforeEnablingDiscord =
  'Save a bot token before enabling Discord.';

/** packages/database / initialize-secrets. */
export const databaseInitializeSecretsASecretRotationIsIncompleteResumeTheRotationBeforeStartup =
  'A secret rotation is incomplete; resume the rotation before startup';

export const databaseInitializeSecretsExistingDatabaseNeedsExplicitInitAdoptEnvironmentWithAllThree =
  'Existing database needs explicit init --adopt-environment with all three existing secrets';

export const databaseInitializeSecretsSecretDirectoriesMustBeRegularDirectories =
  'Secret directories must be regular directories';

export const databaseInitializeSecretsDiffersFromTheInstalledSecretUseExplicitRotation =
  (name: string) =>
    `${name} differs from the installed secret; use explicit rotation`;

export const databaseInitializeSecretsInstalledIsMissingRestoreItBeforeStartup =
  (name: string) => `Installed ${name} is missing; restore it before startup`;

export const databaseInitializeSecretsAdoptionRequiresTheExisting = (
  name: string,
) => `Adoption requires the existing ${name}`;

export const databaseInitializeSecretsMustContain32128RandomBytesAsHex = (
  name: string,
) => `${name} must contain 32–128 random bytes as hex`;

export const databaseInitializeSecretsAllThreeInstallationSecretsMustDiffer =
  'All three installation secrets must differ';

export const databaseInitializeSecretsInvalidInstallationSecretManifest =
  'Invalid installation secret manifest';

export const databaseInitializeSecretsUsageInitRotatePostgresAppSessionResume =
  'Usage: init --rotate=postgres|app|session [--resume]';

export const databaseInitializeSecretsSecretRotatedRecreateAffectedServicesBeforeResumingWrites =
  'Secret rotated; recreate affected services before resuming writes.';

export const databaseInitializeSecretsUsageInitAdoptEnvironment =
  'Usage: init [--adopt-environment]';

export const databaseInitializeSecretsInstallationSecretsReadyExistingCredentialsPreserved =
  'Installation secrets ready; existing credentials preserved.';

export const databaseInitializeSecretsSecretOperationFailedCheckProtectedStorageAndConfigurationResumeAn =
  'Secret operation failed; check protected storage and configuration. Resume an interrupted rotation before starting services.';

/** packages/database / lifecycle. */
export const databaseLifecycleChooseSchedulesOrCompetitions =
  'Choose schedules or competitions.';

export const databaseLifecycleInvalidLifecycleRecordId =
  'Invalid lifecycle record ID.';

export const databaseLifecycleLifecycleRecordsChangedOrCursorExpiredReloadTheFirstPage =
  'Lifecycle records changed or cursor expired. Reload the first page.';

export const databaseLifecycleLifecycleRecordNotFound =
  'Lifecycle record not found.';

export const databaseLifecycleSchedulePageMembershipExceedsSupportedLimits =
  'Schedule page membership exceeds supported limits.';

export const databaseLifecycleChooseCurrentArchivedAndAPageSizeOf120 =
  'Choose current/archived and a page size of 1–20.';

export const databaseLifecycleLifecycleStateUnavailable =
  'Lifecycle state unavailable.';

export const databaseLifecycleAnArchiveRestoreActionOperatorNameAndReasonAreRequired =
  'An archive/restore action, operator name and reason are required.';

export const databaseLifecycleOnlyEndedRecordsCanBeArchived =
  'Only ended records can be archived.';

export const databaseLifecycleCurrentRecordCapacityReachedArchiveAnEndedRecordBeforeRestoring =
  'Current record capacity reached; archive an ended record before restoring.';

export const databaseLifecycleUnknownOrDuplicateOptionSeeDocsMaintenanceMd =
  'Unknown or duplicate option. See docs/maintenance.md.';

export const databaseLifecycleDatabaseUrlIsRequired =
  sharedDatabaseUrlIsRequired2;

/** packages/database / migrate. */
export const databaseMigrateInvalidOrderedBundledMigrationManifest =
  'Invalid ordered bundled migration manifest';

export const databaseMigrateUnknownAppliedMigration = (name: string) =>
  `Unknown applied migration: ${name}`;

export const databaseMigrateNonPrefixMigrationHistoryAt = (name: string) =>
  `Non-prefix migration history at: ${name}`;

export const databaseMigrateAppliedMigrationChanged = (name: string) =>
  `Applied migration changed: ${name}`;

export const databaseMigrateReorderedMigrationHistoryAt = (name: string) =>
  `Reordered migration history at: ${name}`;

export const databaseMigrateMigrationLockTimeoutMustBe110000Ms =
  'Migration lock timeout must be 1–10000 ms';

export const databaseMigrateDatabaseUrlIsRequired =
  sharedDatabaseUrlIsRequired2;

export const databaseMigrateDatabaseMigrationsApplied =
  'Database migrations applied';

/** packages/database / preview-maintenance. */
export const databasePreviewMaintenanceUseBatchSize1500MaxBatches120And =
  'Use --batch-size 1..500, --max-batches 1..20 and --grace-minutes 60..10080.';

export const databasePreviewMaintenanceAnotherImportPreviewMaintenanceCommandIsActiveNoRowsWere =
  'Another import preview maintenance command is active. No rows were changed.';

export const databasePreviewMaintenanceUnknownMaintenanceOptionUseApplyDryRunBatchSizeN =
  'Unknown maintenance option. Use --apply, --dry-run, --batch-size=N, --max-batches=N, --grace-minutes=N.';

export const databasePreviewMaintenanceDatabaseUrlIsRequired =
  sharedDatabaseUrlIsRequired2;

/** packages/database / release-state. */
export const databaseReleaseStateExactSchemaManifestRequired =
  'Exact schema manifest required';

export const databaseReleaseStateDatabaseConfigurationRequired =
  'Database configuration required';

export const databaseReleaseStateReleaseSchemaValidationFailedInspectTheMigrationLedgerAgainstThe =
  'Release schema validation failed; inspect the migration ledger against the pinned manifest.';

/** packages/database / rotate-secret. */
export const databaseRotateSecretChoosePostgresAppOrSession =
  'Choose postgres, app or session';

export const databaseRotateSecretRotationIsPendingRepeatTheCommandWithResume =
  'Rotation is pending; repeat the command with --resume';

export const databaseRotateSecretInvalidPendingRotationRestoreTheProtectedSecretBackup =
  'Invalid pending rotation; restore the protected secret backup';

export const databaseRotateSecretNoRotationIsPending = 'No rotation is pending';

export const databaseRotateSecretCannotAuthenticateDatabaseOwnerRetainPendingRotationAndRestoreAccess =
  'Cannot authenticate database owner; retain pending rotation and restore access';

/** packages/database / runtime-role. */
export const databaseRuntimeRoleAppDbPasswordMustBe32RandomBytesEncodedAs =
  'APP_DB_PASSWORD must be 32+ random bytes encoded as hex';

export const databaseRuntimeRoleUnexpectedRuntimePrivilegeOnPublic = (
  name: string,
  privilege: string,
) => `Unexpected runtime privilege on public.${name}: ${privilege}`;

export const databaseRuntimeRoleUnexpectedRuntimePrivilegeOnPublic2 = (
  name: string,
  privilege: string,
) => `Unexpected runtime privilege on public.${name}: ${privilege}`;

export const databaseRuntimeRoleRuntimeRoleRetainsUnexpectedDdlRoutineOrMembershipPrivileges =
  'Runtime role retains unexpected DDL, routine or membership privileges.';

export const databaseRuntimeRoleRuntimeRoleMustNotOwnTheApplicationDatabaseOrPublic =
  'Runtime role must not own the application database or public schema objects.';

export const databaseRuntimeRoleMissingOrIncompatibleRuntimePolicyObjectPublic =
  (name: string) =>
    `Missing or incompatible runtime policy object: public.${name}`;

/** packages/database / secrets. */
export const databaseSecretsDatabaseUrlMustBeAPostgreSqlConnectionUrl =
  'DATABASE_URL must be a PostgreSQL connection URL';

export const databaseSecretsSetDatabaseUrlOrFile = (name: string) =>
  `Set DATABASE_URL or ${name}_FILE`;

export const databaseSecretsDbPortMustBeBetween1And65535 =
  'DB_PORT must be between 1 and 65535';

export const databaseSecretsDbHostMustBeAHostnameOrBracketedIpv6Address =
  'DB_HOST must be a hostname or bracketed IPv6 address';

/** Credential admission and accessible login cooldown. */
export const apiAuthAdmissionUnavailable =
  'Sign-in is temporarily unavailable. Try again shortly.';
export const webAdminPageLoginCooldown = (seconds: number) =>
  `Too many sign-in attempts. Try again in ${seconds} ${seconds === 1 ? 'second' : 'seconds'}.`;
export const eventPageInvalid = 'Choose an eligible page containing this item.';
export const eventPageReviewChanged =
  'The Event page assignments or catalog changed. Reload the review before saving.';
export const eventPageAdminOnly =
  'Only an administrator can review existing Event page assignments.';
export const eventPageReviewUnavailable =
  'Event page assignment review is unavailable. Try again.';
export const eventPageAssigned =
  'Assigned the existing Event obtain to one page during upgrade review.';
export const eventPageRequired =
  'Choose one Event page before approving this obtain.';
export const eventPageLegacyBlocked =
  'An administrator must assign this item’s existing Event credit to a page first.';
export const eventPageOccupied =
  'An approved Event collection already exists for this item on the selected page.';
export const eventPageLegacyLabel =
  'Existing Event collection — page assignment pending';
export const eventPageAssignmentsTitle =
  'Assign existing Event collections to pages';
export const eventPageAssignmentsHelp =
  'Each existing Event obtain needs one page. Other pages stay available for independent Event collections. Unassigned credits are retained and block only conflicting Event approvals.';
export const eventPageReviewButton = 'Review Event page assignments';
export const eventPageChoose = 'Event page';
export const eventPageSave = 'Save page assignments';
export const eventPageRetry = 'Retry page assignments';
export const eventPageCancel = 'Choose later';
export const eventPageReload = 'Reload page assignments';
export const eventPageAssignmentsSaved = 'Event page assignments saved.';
export const eventPageSavedReload =
  'The choices were saved. Reload to see the remaining assignments.';
export const eventPageRepairCatalog =
  'No available page contains this item. Repair its catalog membership or reactivate it; the original credit is retained.';
export const eventPageRetryHelp =
  'The save result is uncertain. Retry the same choices to recover the saved result.';
export const eventPageNoEvidence = 'No saved scheduling evidence';
export const eventPageOutstanding = (total: number) =>
  `${total} existing Event credits still need one page. Up to 50 are shown at a time.`;
export const eventPageObtain = (
  item: string,
  collector: string,
  date: string,
) => `${item} — ${collector} — ${date}`;
export const eventPageFrozenEvidence = (pages: string) =>
  `Originally eligible pages: ${pages}. This evidence does not select a page for you.`;
export const eventPageSelectionHelp =
  'Choose one page for this Event obtain. Saved intake timing restricts the choice to the original eligible pages. Explicit staff Event corrections can override timing.';
export const eventPageAvailability = (name: string, occupied: boolean) =>
  occupied ? `${name} — Event already collected` : `${name} — available`;
export const eventPageAvailabilityRecheck =
  'Availability is checked again when saving.';
export const eventPageCurrent = (page: string) => `Event page: ${page}`;
export const eventPageUnavailable = 'Unavailable historical page';
export const eventHistoryLoading = 'Loading collection history…';
export const eventHistoryUnavailable =
  'Collection history could not be loaded. Reload the page to try again.';
export const repeatCollectorInvalidPolicy =
  'Choose a supported repeat collection policy.';
export const duplicateHandlingTitle = 'Duplicate handling';
export const repeatCollectorTitle = 'Repeat collections by username';
export const repeatCollectorReject = 'Automatically reject repeat collections';
export const repeatCollectorSeparate = 'Show each obtain separately';
export const repeatCollectorMerge = 'Merge obtains by username';
export const repeatCollectorReadOnly =
  'Only the administrator can change this policy.';
export const repeatCollectorSave = 'Save';
export const repeatCollectorSaved = 'Repeat collection policy saved.';
export const repeatCollectorRejected =
  'Repeat-collector policy: this username already has approved credit for this item.';
export const repeatCollectorSummary = (
  count: number,
  name: string,
  date: string,
) => `Collected ${count}x by ${name} first on ${date}`;
export const repeatCollectorBotRejected = (id: string, reason: string) =>
  `Submission ${id} rejected. ${reason}`;
export const repeatCollectorDecisionReason = 'Decision reason';
export const repeatCollectorAdmissionPolicy = 'Admission policy';
export const repeatCollectorPolicySnapshot = (
  policy: string,
  revision: string,
) => `${policy} (${revision})`;
export const collectorNamesTitle = 'Name Changes';
export const userNameChangesToggle = 'Enable user submitted name changes';
export const userNameChangesUnavailable =
  'User name change settings could not be loaded.';
export const userNameChangesSaved = 'User name change setting saved.';
export const publicNamesTitle = 'Change name';
export const publicNamesOldName = 'Old name';
export const publicNamesNewName = 'New name';
export const publicNamesChange = 'Change';
export const publicNamesWomFirst =
  'Name changes are verified through Wiseoldman, please change your name there first.';
export const publicNamesStaffRequired =
  'Name could not be verified through Wiseoldman, please contact staff';
export const publicNamesWomLink = 'Change name on Wiseoldman';
export const publicNamesSuccess = 'Name successfully changed';
export const publicNamesActor = 'WOM-verified user';
export const gameModeTitle = 'Game mode';
export const gameModeNormal = 'Normal';
export const gameModeIronman = 'Ironman';
export const gameModeUltimate = 'Ultimate Ironman';
export const gameModeHardcore = 'Hardcore Ironman';
export const gameModeGroup = 'Group Ironman (GIM)';
export const gameModeHardcoreGroup = 'Hardcore Group Ironman (HCGIM)';
export const gameModeUnrankedGroup = 'Unranked Group Ironman (UGIM)';
export const gameModeUnassigned = 'Unassigned';
export const gameModeInvalid = 'Choose a supported game mode.';
export const gameModeUnavailable = 'Collector game mode could not be loaded.';
export const gameModeChanged =
  'Collector identity or game mode changed. Reload before saving.';
export const gameModeScope =
  "Saving changes this collector's game mode across all collection entries. World mode, Event credit and review status are unchanged.";
export const gameModeSaved = 'Game mode saved.';
export const gameModeSave = 'Save game mode';
export const gameModeDiscard = 'Discard';
export const gameModeReload = 'Reload game mode';
export const gameModeUncertain =
  'The result could not be confirmed. Retry the same game mode change.';
export const gameModeRetry = 'Retry game mode save';
export const gameModeConflictLabel =
  "The submitted game mode differs from the collector's current mode.";
export const gameModeSubmitted = (mode: string) =>
  `Submitted game mode: ${mode}.`;
export const gameModeCollector = (name: string) => `Collector: ${name}`;
export const gameModeMergeConflict =
  'These collectors have different game modes. Choose the one mode to keep before confirming the merge.';
export const gameModeMergeResolution = 'Game mode after merging';
export const gameModeMergeComparison = (
  source: string,
  sourceMode: string,
  target: string,
  targetMode: string,
) => `${source}: ${sourceMode}; ${target}: ${targetMode}`;
export const gameModeChoose = 'Choose a game mode';
export const gameModeMergePreview = 'Preview selected game mode';
export const gameModeCreditPrefix = 'Collected by ';
export const gameModeCreditOn = (date: string) => ` on ${date}`;
export const gameModeCreditRepeat = (count: number) =>
  `Collected ${count}x by `;
export const gameModeCreditFirst = (date: string) => ` first on ${date}`;
export const publicNamesDisabled =
  'User submitted name changes are currently disabled.';
export const publicNamesUncertain =
  'The result could not be confirmed. Click Change to retry.';
export const publicNamesInvalid =
  'Enter two different RuneScape names of 1–12 characters.';
export const collectorNamesSearch = 'Search collectors';
export const collectorNamesSource = 'Existing collector';
export const collectorNamesSelect = 'Select a collector';
export const collectorNamesNarrowSearch =
  'More collectors match. Refine your search to find a name.';
export const collectorNamesReload = 'Reload collectors';
export const collectorNamesNewName = 'New name';
export const collectorNamesChange = 'Change name';
export const collectorNamesMerge = 'Merge users';
export const collectorNamesCancel = 'Cancel';
export const collectorNamesConfirmation = (
  merge: boolean,
  original: string,
  name: string,
) =>
  `Are you sure you want to ${merge ? 'merge' : 'change'} user ${original} to ${merge ? 'existing ' : ''}${name}?\nThis action cannot be reversed.`;
export const collectorNamesAdminOnly =
  'Only the administrator can change collector names.';
export const collectorNameInvalid =
  'Enter a valid collector name of 1–80 characters.';
export const collectorNamesUnavailable =
  'Collector names could not be loaded. Try again.';
export const collectorNamesMissing =
  'That collector is no longer available. Search for the current name.';
export const collectorNamesChanged =
  'Collector history or names changed. Preview the operation again before confirming.';
export const collectorNamesNoop =
  'This collector already uses that name. No changes were made.';
export const collectorNamesUncertain =
  'The result is not confirmed. Retry confirmation to recover the saved result.';
export const collectorNamesRetry = 'Retry confirmation';
export const collectorNamesRefreshPreview = 'Preview again';
export const collectorNamesOriginal = 'Originally submitted as';
export const collectorNamesSuccess = (
  merge: boolean,
  original: string,
  name: string,
) =>
  merge
    ? `Merged ${original} into ${name}.`
    : `Changed ${original} to ${name}.`;
