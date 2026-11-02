import * as appText from '@clog/domain';
/** Pure explanations for every review action; UI and tests share one policy. */
export const unsavedClaimHint =
  appText.webReviewPrerequisitesSaveOrDiscardCorrectionsBeforeDecidingOnThisClaim;

export interface ReviewRequirements {
  status: 'pending' | 'approved' | 'rejected' | 'revoked';
  requestBusy: boolean;
  queueUnavailable: boolean;
  readError: boolean;
  claimDirty: boolean;
  noteDirty: boolean;
  activeItem: boolean;
  draftItemActive: boolean;
  validProof: boolean;
  acknowledged: boolean;
  reasonProvided: boolean;
}

export type ReviewActionHint =
  | 'claim'
  | 'discardClaim'
  | 'note'
  | 'discardNote'
  | 'acknowledge'
  | 'approve'
  | 'reject'
  | 'revoke';

export function reviewBlockers(
  x: ReviewRequirements,
): Record<ReviewActionHint, string | null> {
  const common = x.requestBusy
    ? appText.webReviewPrerequisitesAReviewRequestIsInProgressTheResultMustBe
    : x.readError
      ? appText.webReviewPrerequisitesTheSavedSubmissionVersionOrAuditCouldNotBeLoaded
      : x.queueUnavailable
        ? appText.webReviewPrerequisitesTheSubmissionsListIsRefreshingOrUnavailableReloadBeforeMaking
        : null;
  const editable = ['pending', 'approved'].includes(x.status);
  const write =
    common ??
    (!editable
      ? appText.webReviewPrerequisitesOnlyPendingOrApprovedClaimsCanBeEdited
      : null);
  const claim =
    write ??
    (!x.claimDirty
      ? appText.webReviewPrerequisitesNoClaimCorrectionsToSave
      : null) ??
    (!x.draftItemActive
      ? appText.webReviewPrerequisitesSelectAnActiveCanonicalItemBeforeSavingCorrections
      : null) ??
    (x.status === 'approved' && !x.reasonProvided
      ? appText.webReviewPrerequisitesEnterAnAuditReasonBeforeChangingAnApprovedCredit
      : null);
  const note =
    write ??
    (!x.noteDirty
      ? appText.webReviewPrerequisitesNoReviewNoteChangesToSave
      : null);
  const decision = common ?? (x.claimDirty ? unsavedClaimHint : null);
  const proof =
    decision ??
    (x.status !== 'pending'
      ? appText.webReviewPrerequisitesOnlyPendingClaimsMayBeApproved
      : null) ??
    (!x.activeItem
      ? appText.webReviewPrerequisitesSelectAndSaveAnActiveCanonicalItemBeforeApproving
      : null) ??
    (!x.validProof
      ? appText.webReviewPrerequisitesASavedScreenshotOrRuneLiteChatMessageIsRequiredFor
      : null);
  const approve =
    proof ??
    (!x.acknowledged
      ? appText.webReviewPrerequisitesCheckTheSavedItemCollectorDateWorldModeAndProof
      : null);
  const reject =
    decision ??
    (x.status !== 'pending'
      ? appText.webReviewPrerequisitesOnlyPendingClaimsMayBeRejected
      : null) ??
    (!x.reasonProvided
      ? appText.webReviewPrerequisitesEnterAReasonBeforeRejectingASubmission
      : null);
  const revoke =
    decision ??
    (x.status !== 'approved'
      ? appText.webReviewPrerequisitesOnlyApprovedCreditsMayBeRevoked
      : null) ??
    (!x.reasonProvided
      ? appText.webReviewPrerequisitesEnterAReasonBeforeRevokingACredit
      : null);
  return {
    claim,
    discardClaim:
      write ??
      (!x.claimDirty
        ? appText.webReviewPrerequisitesThereAreNoClaimCorrectionsToDiscard
        : null),
    note,
    discardNote:
      write ??
      (!x.noteDirty
        ? appText.webReviewPrerequisitesThereAreNoReviewNoteChangesToDiscard
        : null),
    acknowledge: proof,
    approve,
    reject,
    revoke,
  };
}
