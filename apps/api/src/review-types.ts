/** REVIEW-01 private response types. Public credits never expose these fields. */
export interface ReviewSubmission {
  gameMode?: import('@clog/domain').GameMode | null;
  submittedGameMode?: import('@clog/domain').GameMode | null;
  collectorId?: string;
  originalCollectorName?: string;
  admissionPolicy?: import('@clog/domain').SubmissionFilters;
  eventPageId?: string | null;
  eventPageAssignmentPending?: boolean;
  eligibleEventPageIds?: string[];
  occupiedEventPageIds?: string[];
  eventPageBlocked?: boolean;
  id: string;
  version: number;
  source: 'discord' | 'manual' | 'runelite';
  itemId: number | null;
  collectionType?: import('@clog/domain').CollectionType | null;
  collectionReason?: string;
  rawItemText: string;
  /** Original RuneLite provenance, retained through canonical corrections. */
  gameItemId?: number;
  collectorName: string;
  collectedOn: string;
  dateSource: 'submission' | 'claim' | 'admin';
  submittedAt: string;
  proofUrl: string;
  screenshotPath?: string | null;
  chatMessage?: string;
  hardcore: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'revoked';
  /** Persisted staff note; unrelated to approve/reject/revoke audit reason. */
  reviewNote: string;
  /** Last decision/correction reason, retained for historical transparency. */
  reviewReason: string | null;
}
export interface ManualSubmissionInput {
  gameMode?: import('@clog/domain').GameMode;
  eventPageId?: string;
  collectionType?: import('@clog/domain').CollectionType;
  itemId: number;
  collectorName: string;
  collectedOn: string;
  hardcore: boolean;
  /** Compatibility with old clients: empty only; proof is uploaded separately. */
  proofUrl?: string;
  approve: boolean;
  reason?: string;
}
export interface ReviewCorrection {
  eventPageId?: string;
  useIntakeTiming?: boolean;
  collectionType?: import('@clog/domain').CollectionType;
  itemId: number;
  collectorName: string;
  collectedOn: string;
  hardcore: boolean;
  reason: string;
}
export interface ReviewNote {
  note: string;
}
export interface ReviewAction {
  expectedVersion: number;
  action: 'approve' | 'reject' | 'revoke';
  reason?: string;
  flags?: ReviewCollectionFlags;
}
export interface ReviewCollectionFlags {
  eventPageId?: string;
  hardcore: boolean;
  collectionType?: import('@clog/domain').CollectionType;
  useIntakeTiming?: true;
}
export interface ReviewFlagsChange {
  flags: ReviewCollectionFlags;
  reason: string;
}
export interface ReviewAudit {
  id: string;
  actorName: string;
  at: string;
  action: 'create' | 'edit' | 'approve' | 'reject' | 'revoke';
  reason: string | null;
  before: ReviewSubmission;
  after: ReviewSubmission;
}
export interface ReviewStore {
  collectorGameMode?(
    submissionId: string,
    byCollector?: boolean,
  ): Promise<import('@clog/domain').CollectorGameMode>;
  saveCollectorGameMode?(
    submissionId: string,
    fields: import('@clog/domain').CollectorGameModeChange,
    key: string,
    actorId: string,
    actorName: string,
    byCollector?: boolean,
  ): Promise<import('@clog/domain').CollectorGameModeResult>;
  userNameChangesSettings?(): Promise<
    import('@clog/domain').UserNameChangeSettings
  >;
  saveUserNameChangesSettings?(
    enabled: boolean,
    revision: string,
    actorId: string,
  ): Promise<import('@clog/domain').UserNameChangeSettings>;
  collectors?(query: string): Promise<{
    collectors: import('@clog/domain').CollectorIdentity[];
    hasMore: boolean;
  }>;
  previewCollectorName?(
    sourceId: string,
    newName: string,
    actorId: string,
    modeResolution?: import('@clog/domain').GameMode,
  ): Promise<import('@clog/domain').CollectorNamePreview>;
  applyCollectorName?(
    token: string,
    key: string,
    actorId: string,
    actorName: string,
  ): Promise<import('@clog/domain').CollectorNameResult>;
  eventPageAssignments?(): Promise<
    import('@clog/domain').EventPageAssignmentReview
  >;
  assignEventPages?(
    selection: import('@clog/domain').EventPageAssignmentSelection,
    key: string,
    actorId: string,
    actorName: string,
  ): Promise<import('@clog/domain').EventPageAssignmentResult>;
  submissionFilters?(): Promise<import('@clog/domain').SubmissionFilters>;
  saveSubmissionFilters?(
    filterCollected: boolean,
    revision: string,
    actorId: string,
    repeatCollectorPolicy?: import('@clog/domain').RepeatCollectorPolicy,
  ): Promise<import('@clog/domain').SubmissionFilters>;
  adminCatalog(): Promise<unknown>;
  createManual(
    fields: ManualSubmissionInput,
    actorId: string,
    actorName: string,
    requestKey: string,
    image?: import('./icon-storage.js').IconRecord,
  ): Promise<ReviewSubmission>;
  queue(
    status: 'pending' | 'reviewed',
    unmatched: boolean,
    limit: number,
    cursor?: string,
  ): Promise<{
    revision: string;
    submissions: ReviewSubmission[];
    nextCursor: string | null;
    pageCursor: string;
    filters?: import('@clog/domain').SubmissionFilters;
  }>;
  detail(
    id: string,
    cursor?: string,
    limit?: number,
  ): Promise<{
    submission: ReviewSubmission;
    audit: ReviewAudit[];
    auditRevision: string;
    auditCursor: string;
    nextAuditCursor: string | null;
  } | null>;
  mutate(
    id: string,
    expectedVersion: number,
    fields: ReviewCorrection | ReviewAction | ReviewNote | ReviewFlagsChange,
    actorId: string,
    actorName: string,
  ): Promise<ReviewSubmission>;
}
