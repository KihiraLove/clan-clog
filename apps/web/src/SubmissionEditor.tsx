import * as appText from '@clog/domain';
/** Review saved claims, stage corrections separately and display before/after audit history. */
import { useEffect, useId, useRef, useState } from 'react';
import { collectionTypeLabel } from '@clog/domain';
import { useAdminDraft } from './admin-route-data.ts';
import { classifyAccessFailure } from './admin-session.ts';
import {
  safeScreenshotPath,
  dateSourceLabel,
  validateCorrection,
  type AdminCatalog,
  type AdminClient,
  type Correction,
  type CollectionFlags,
  type Submission,
  type SubmissionDetail,
} from './admin-model.ts';
import type { AdminSession } from './xp-model.ts';
import { formatUtcTime } from './format-time.ts';
import { ReviewAuditHistory } from './ReviewAuditHistory.tsx';
import { ProofLink } from './AdminProofLink.tsx';
import { EventPagePicker } from './EventPagePicker.tsx';
import { useAdminAction } from './use-admin-action.ts';
import {
  reviewBlockers,
  unsavedClaimHint,
  type ReviewActionHint,
} from './review-prerequisites.ts';

const hiddenHints = new Set([
  appText.webSubmissionEditorOnlyPendingOrApprovedClaimsCanBeEdited,
  unsavedClaimHint,
  appText.webSubmissionEditorNoReviewNoteChangesToSave,
  appText.webSubmissionEditorThereAreNoReviewNoteChangesToDiscard,
  appText.webSubmissionEditorNoClaimCorrectionsToSave,
  appText.webSubmissionEditorThereAreNoClaimCorrectionsToDiscard,
  appText.webSubmissionEditorCheckTheSavedItemCollectorDateWorldModeAndProof,
  appText.webSubmissionEditorEnterAReasonBeforeRejectingASubmission,
  appText.webSubmissionEditorEnterAReasonBeforeRevokingACredit,
]);

const usesSavedTiming = (row: Submission) =>
  row.source !== 'manual' &&
  row.collectionReason !== 'staff_correction' &&
  row.collectionReason !== 'event_credit_already_obtained' &&
  !(row.collectionReason === 'legacy' && row.itemId !== null);
type ClaimDraft = Pick<
  Correction,
  'itemId' | 'collectorName' | 'collectedOn' | 'reason' | 'eventPageId'
>;
const draftOf = (row: Submission): ClaimDraft => ({
  itemId: row.itemId ?? 0,
  collectorName: row.collectorName,
  collectedOn: row.collectedOn,
  reason: '',
  ...(row.eventPageId ? { eventPageId: row.eventPageId } : {}),
});
const flagsOf = (row: Submission): CollectionFlags => ({
  hardcore: row.hardcore,
  collectionType: row.collectionType ?? 'regular',
  ...(row.eventPageId ? { eventPageId: row.eventPageId } : {}),
});
function ReviewWindow({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="submission-review-dialog"
      aria-label={appText.webSubmissionEditorSubmissionReview}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {children}
    </dialog>
  );
}
export function SubmissionEditor({
  id,
  catalog,
  client,
  session,
  disabled,
  onAccessLost,
  onClose,
  onChanged,
}: {
  id: string;
  catalog: AdminCatalog;
  client: AdminClient;
  session: AdminSession;
  disabled: boolean;
  onAccessLost: () => void;
  onClose: () => void;
  onChanged: (status: Submission['status']) => void;
}) {
  const [detail, setDetail] = useState<SubmissionDetail>(),
    [draft, setDraft] = useState<ClaimDraft>();
  const [flags, setFlags] = useState<CollectionFlags>();
  const [query, setQuery] = useState(''),
    [checked, setChecked] = useState(false),
    [reviewNote, setReviewNote] = useState('');
  const [readError, setReadError] = useState<string>(),
    [refresh, setRefresh] = useState(0);
  const action = useAdminAction(onAccessLost);
  const hintId = useId();
  // A new version invalidates both the draft and the user's previous proof acknowledgment.
  const accept = (next: SubmissionDetail) => {
    setDetail(next);
    setDraft(draftOf(next.submission));
    setFlags(flagsOf(next.submission));
    setReviewNote(next.submission.reviewNote);
    setChecked(false);
    setReadError(undefined);
  };
  const reload = async (signal: AbortSignal) => {
    const next = await client.detail(id, signal);
    if (!signal.aborted) accept(next);
  };
  useEffect(() => {
    let active = true;
    const controller = new AbortController(),
      timer = window.setTimeout(() => controller.abort(), 10000);
    setReadError(undefined);
    void client
      .detail(id, controller.signal)
      .then((next) => {
        if (active) accept(next);
      })
      .catch((failure: unknown) => {
        if (!active) return;
        if (classifyAccessFailure(failure) === 'expired') onAccessLost();
        else
          setReadError(
            appText.webSubmissionEditorCouldNotLoadThisSubmissionAndAuditHistoryReloadBefore,
          );
      })
      .finally(() => clearTimeout(timer));
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [client, id, refresh, onAccessLost]);
  const flagsDirty =
    !!detail &&
    !!flags &&
    (flags.hardcore !== detail.submission.hardcore ||
      flags.collectionType !==
        (detail.submission.collectionType ?? 'regular') ||
      (flags.eventPageId ?? null) !== (detail.submission.eventPageId ?? null) ||
      flags.useIntakeTiming === true);
  const dirty =
    !!detail &&
    !!draft &&
    (draft.itemId !== (detail.submission.itemId ?? 0) ||
      draft.collectorName.trim() !== detail.submission.collectorName ||
      draft.collectedOn !== detail.submission.collectedOn ||
      (draft.eventPageId ?? null) !== (detail.submission.eventPageId ?? null) ||
      flagsDirty ||
      reviewNote.trim() !== detail.submission.reviewNote ||
      !!draft.reason);
  useAdminDraft(dirty, action.busy);
  const close = () => {
    if (action.busy) return;
    if (
      dirty &&
      !window.confirm(appText.webSubmissionEditorDiscardUnsavedReviewChanges)
    )
      return;
    onClose();
  };
  if (!detail || !draft || !flags)
    return (
      <ReviewWindow onClose={close}>
        <section className="admin-panel">
          <button
            className="site-button review-close"
            aria-label={appText.webSubmissionEditorCloseReview}
            onClick={close}
          >
            {appText.webSubmissionEditorCloseSymbol}
          </button>
          {readError ? (
            <>
              <p role="alert">{readError}</p>
              <button
                className="site-button"
                onClick={() => setRefresh((v) => v + 1)}
              >
                {appText.webSubmissionEditorReloadSubmission}
              </button>
            </>
          ) : (
            <p role="status">{appText.webSubmissionEditorLoadingSubmission}</p>
          )}
        </section>
      </ReviewWindow>
    );
  const row = detail.submission,
    editable = ['pending', 'approved'].includes(row.status);
  const activeItem = catalog.items.some((item) => item.id === row.itemId);
  const draftItemActive = catalog.items.some(
    (item) => item.id === draft.itemId,
  );
  const claimDirty =
    draft.itemId !== (row.itemId ?? 0) ||
    draft.collectorName.trim() !== row.collectorName ||
    draft.collectedOn !== row.collectedOn ||
    (draft.eventPageId ?? null) !== (row.eventPageId ?? null);
  const noteDirty = reviewNote.trim() !== row.reviewNote;
  const locked = action.busy || disabled || Boolean(readError),
    proof =
      safeScreenshotPath(row.screenshotPath) ||
      (row.source === 'runelite' && Boolean(row.chatMessage?.trim()));
  const change = (fields: Partial<ClaimDraft>) => {
    setDraft({
      ...draft,
      ...fields,
      ...(fields.itemId !== undefined && fields.itemId !== draft.itemId
        ? { eventPageId: undefined }
        : {}),
    });
    setChecked(false);
  };
  const changeFlags = (next: CollectionFlags) => {
    setFlags(next);
    setChecked(false);
  };
  const refreshAudit = async (next: Submission, signal: AbortSignal) => {
    try {
      const latest = await client.detail(id, signal);
      if (signal.aborted) return;
      if (latest.submission.version !== next.version)
        throw new Error(appText.webSubmissionEditorSubmissionChangedAgain);
      setDetail(latest);
    } catch (failure) {
      if (classifyAccessFailure(failure) === 'expired') throw failure;
      if (!signal.aborted)
        setReadError(
          appText.webSubmissionEditorTheChangeWasSavedButTheLatestRevisionOrAudit,
        );
    }
  };
  // Save corrections before approval so the acknowledgment refers to persisted claim fields.
  const perform = (decision?: 'approve' | 'reject' | 'revoke') => {
    void action.execute(
      async (signal) => {
        if (decision === 'approve' && isEvent && !targetPage)
          throw Error(appText.eventPageRequired);
        if (decision && claimDirty) throw new Error(unsavedClaimHint);
        if (decision === 'revoke' && flagsDirty)
          throw new Error(
            appText.webSubmissionEditorSaveOrDiscardCollectionFlagsBeforeRevoking,
          );
        if (
          decision === 'approve' &&
          (claimDirty ||
            !checked ||
            (!proof && row.source !== 'manual') ||
            !activeItem)
        )
          throw new Error(
            appText.webSubmissionEditorSaveASpecificItemMatchAndCheckTheScreenshotBefore,
          );
        if (decision && decision !== 'approve' && !draft.reason.trim())
          throw new Error(
            appText.webSubmissionEditorEnterAReasonForThisDecision,
          );
        if (!decision && row.status === 'approved' && !draft.reason.trim())
          throw new Error(
            appText.webSubmissionEditorEnterAReasonForCorrectingAnApprovedCredit,
          );
        const next = decision
          ? await client.decide(
              id,
              row.version,
              decision,
              draft.reason.trim(),
              session.csrfToken,
              signal,
              flagsDirty ? selectedPageFlags : undefined,
            )
          : await client.edit(
              id,
              row.version,
              validateCorrection(
                {
                  ...draft,
                  hardcore: row.hardcore,
                  ...(!usesSavedTiming(row) &&
                  row.collectionReason !== 'event_credit_already_obtained'
                    ? { collectionType: row.collectionType ?? 'regular' }
                    : {}),
                  useIntakeTiming: usesSavedTiming(row),
                },
                catalog,
              ),
              session.csrfToken,
              signal,
            );
        if (signal.aborted) return;
        setDetail({ ...detail, submission: next });
        setDraft(draftOf(next));
        if (decision || !flagsDirty) setFlags(flagsOf(next));
        if (!noteDirty) setReviewNote(next.reviewNote);
        setChecked(false);
        action.setMessage(
          decision
            ? appText.webSubmissionEditorSubmissionPublicCreditFollowsThisSavedDecision(
                next.status,
              )
            : appText.webSubmissionEditorChangesSavedReviewTheSavedClaimBeforeApproving,
        );
        onChanged(next.status);
        await refreshAudit(next, signal);
      },
      reload,
      decision ?? 'claim',
    );
  };
  const saveFlags = () => {
    void action.execute(
      async (signal) => {
        if (row.status !== 'approved' || !flagsDirty || !draft.reason.trim())
          throw new Error(
            appText.webSubmissionEditorEnterAnAuditReasonBeforeSavingCollectionFlags,
          );
        const next = await client.saveCollectionFlags(
          id,
          row.version,
          selectedPageFlags,
          draft.reason.trim(),
          session.csrfToken,
          signal,
        );
        if (signal.aborted) return;
        setDetail({ ...detail, submission: next });
        setFlags(flagsOf(next));
        if (!claimDirty) setDraft(draftOf(next));
        setChecked(false);
        action.setMessage(appText.webSubmissionEditorCollectionFlagsSaved);
        onChanged(next.status);
        await refreshAudit(next, signal);
      },
      async () => {
        setReadError(
          appText.webSubmissionEditorTheSubmissionChangedYourLocalDraftsAreRetainedReloadThe,
        );
      },
      'flags',
    );
  };
  const saveNote = () => {
    void action.execute(
      async (signal) => {
        if (!noteDirty) return;
        const next = await client.saveReviewNote(
          id,
          row.version,
          reviewNote.trim(),
          session.csrfToken,
          signal,
        );
        if (signal.aborted) return;
        setDetail({ ...detail, submission: next });
        setReviewNote(next.reviewNote);
        setChecked(false);
        action.setMessage(appText.webSubmissionEditorReviewNoteSaved);
        onChanged(next.status);
        // Preserve draft corrections while reloading the updated audit history.
        try {
          const latest = await client.detail(id, signal);
          if (!signal.aborted) {
            setDetail(latest);
            setReviewNote(latest.submission.reviewNote);
            setReadError(undefined);
          }
        } catch (failure) {
          if (classifyAccessFailure(failure) === 'expired') throw failure;
          if (!signal.aborted)
            setReadError(
              appText.webSubmissionEditorTheNoteWasSavedButAuditHistoryCouldNotBe,
            );
        }
      },
      reload,
      'note',
    );
  };
  const blockers = reviewBlockers({
    status: row.status,
    requestBusy: action.busy,
    queueUnavailable: disabled,
    readError: Boolean(readError),
    claimDirty,
    noteDirty,
    activeItem,
    draftItemActive,
    validProof: Boolean(proof) || row.source === 'manual',
    acknowledged: checked,
    reasonProvided: Boolean(draft.reason.trim()),
  });
  const timed = flags.useIntakeTiming || (usesSavedTiming(row) && !flagsDirty);
  const isEvent =
    !flags.hardcore &&
    (flags.useIntakeTiming
      ? !!row.eligibleEventPageIds?.length
      : (flags.collectionType ?? row.collectionType) === 'event');
  const targetPages = catalog.pages.filter(
    (p) =>
      p.itemIds.includes(row.itemId ?? 0) &&
      (!timed ||
        !row.eligibleEventPageIds ||
        row.eligibleEventPageIds.includes(p.id)),
  );
  const targetPage =
    flags.eventPageId ??
    (targetPages.length === 1 &&
    (!timed || row.eligibleEventPageIds?.length === 1)
      ? targetPages[0]!.id
      : '');
  const selectedPageFlags: CollectionFlags =
    isEvent && targetPage ? { ...flags, eventPageId: targetPage } : flags;
  if (isEvent && !targetPage && !blockers.approve)
    blockers.approve = appText.eventPageRequired;
  if (isEvent && row.eventPageBlocked)
    blockers.approve = appText.eventPageLegacyBlocked;
  if (row.eventPageAssignmentPending) {
    blockers.claim = appText.eventPageLegacyBlocked;
    blockers.approve = appText.eventPageLegacyBlocked;
  }
  if (row.status === 'approved' && flagsDirty && !blockers.revoke)
    blockers.revoke =
      appText.webSubmissionEditorSaveOrDiscardCollectionFlagsBeforeRevoking;
  const showClaimHint = editable && claimDirty;
  const claimHintId = `review-${hintId}-claim-draft`;
  const shownHint = (key: ReviewActionHint) =>
    blockers[key] && !hiddenHints.has(blockers[key]);
  const describedBy = (key: ReviewActionHint) =>
    showClaimHint && blockers[key] === unsavedClaimHint
      ? claimHintId
      : shownHint(key)
        ? `review-${hintId}-${key}`
        : undefined;
  const explanations = (keys: ReviewActionHint[]) =>
    keys.filter(shownHint).map((key) => (
      <p
        className="admin-note admin-action-explanation"
        id={`review-${hintId}-${key}`}
        key={key}
      >
        {blockers[key]}
      </p>
    ));
  const selected = catalog.items.find((item) => item.id === draft.itemId);
  const matches = catalog.items.filter(
    (item) =>
      item.name.toLowerCase().includes(query.toLowerCase().trim()) ||
      String(item.id) === query.trim(),
  );
  const options =
    selected && !matches.some((item) => item.id === selected.id)
      ? [selected, ...matches]
      : matches;
  return (
    <ReviewWindow onClose={close}>
      <section
        className="admin-panel submission-editor"
        aria-labelledby="submission-title"
      >
        <div className="admin-section-heading">
          <div>
            <h2 id="submission-title">
              {appText.webSubmissionEditorSubmissionHeading(
                catalog.items.find((item) => item.id === row.itemId)?.name ??
                  row.rawItemText ??
                  appText.webSubmissionEditorUnmatchedItem,
                row.collectorName,
              )}
            </h2>
            <p className="admin-note">
              {appText.webSubmissionEditorRevisionMessage(row.version)}
            </p>
            <p>
              {appText.webSubmissionEditorSubmissionSummary(
                row.status,
                row.source === 'manual'
                  ? appText.webSubmissionEditorManualSubmission
                  : row.source === 'runelite'
                    ? appText.webSubmissionEditorRuneLiteSubmission
                    : appText.webSubmissionEditorDiscordSubmission,
                row.id,
              )}
            </p>
            {row.collectionType === 'event' && (
              <p>
                {row.eventPageAssignmentPending
                  ? appText.eventPageLegacyLabel
                  : !row.eventPageId
                    ? appText.eventPageRequired
                    : appText.eventPageCurrent(
                        catalog.pages.find((p) => p.id === row.eventPageId)
                          ?.name ??
                          row.eventPageId ??
                          appText.eventPageUnavailable,
                      )}
              </p>
            )}
          </div>
          <button
            className="site-button review-close"
            aria-label={appText.webSubmissionEditorCloseReview}
            disabled={action.busy}
            onClick={close}
          >
            {appText.webSubmissionEditorCloseSymbol}
          </button>
        </div>
        <div className="submission-review-layout">
          <div className="submission-review-evidence">
            <h3>{appText.webSubmissionEditorSubmissionDetails}</h3>
            <dl className="submission-facts">
              {row.reviewReason && (
                <div>
                  <dt>{appText.repeatCollectorDecisionReason}</dt>
                  <dd>{row.reviewReason}</dd>
                </div>
              )}
              {row.admissionPolicy && (
                <div>
                  <dt>{appText.repeatCollectorAdmissionPolicy}</dt>
                  <dd>
                    {appText.repeatCollectorPolicySnapshot(
                      row.admissionPolicy.repeatCollectorPolicy === 'reject'
                        ? appText.repeatCollectorReject
                        : row.admissionPolicy.repeatCollectorPolicy === 'merge'
                          ? appText.repeatCollectorMerge
                          : appText.repeatCollectorSeparate,
                      row.admissionPolicy.revision,
                    )}
                  </dd>
                </div>
              )}
              <div>
                <dt>{appText.webSubmissionEditorCollectionType}</dt>
                <dd>{collectionTypeLabel(row.collectionType)}</dd>
                {row.collectionReason === 'event_credit_already_obtained' && (
                  <dd>
                    {
                      appText.webSubmissionEditorRecordedAsRegularBecauseThisItemAlreadyHadAnEvent
                    }
                  </dd>
                )}
              </div>
              <div>
                <dt>
                  {row.source === 'runelite'
                    ? appText.webSubmissionEditorSubmittedItemName
                    : appText.webSubmissionEditorRawItemInput}
                </dt>
                <dd>
                  {row.rawItemText ||
                    appText.webSubmissionEditorNoRawTextSupplied}
                </dd>
              </div>
              {row.gameItemId !== undefined && (
                <div>
                  <dt>{appText.webSubmissionEditorGameItemId}</dt>
                  <dd>{row.gameItemId}</dd>
                </div>
              )}
              {row.itemId === null && (
                <div>
                  <dt>{appText.webSubmissionEditorCatalogMatch}</dt>
                  <dd>{appText.webSubmissionEditorUnmatched}</dd>
                </div>
              )}
              <div>
                <dt>{appText.webSubmissionEditorDateSource}</dt>
                <dd>{dateSourceLabel(row.dateSource)}</dd>
              </div>
              <div>
                <dt>{appText.webSubmissionEditorSubmitted}</dt>
                <dd>{formatUtcTime(row.submittedAt)}</dd>
              </div>
              <div>
                <dt>{appText.webSubmissionEditorCollectedOn}</dt>
                <dd>{row.collectedOn}</dd>
              </div>
              <div>
                <dt>{appText.webSubmissionEditorWorlds}</dt>
                <dd>
                  {row.hardcore
                    ? appText.webSubmissionEditorHardcoreWorlds
                    : appText.webSubmissionEditorOrdinaryWorlds}
                </dd>
              </div>
              <div>
                <dt>{appText.webSubmissionEditorProof}</dt>
                <dd>
                  <ProofLink
                    source={row.source}
                    screenshot={row.screenshotPath}
                    chatMessage={row.chatMessage}
                  />
                </dd>
              </div>
              {selected && (
                <>
                  <div>
                    <dt>{appText.webSubmissionEditorCanonicalItem}</dt>
                    <dd>{appText.webSubmissionEditorItemId(selected.id)}</dd>
                  </div>
                  <div>
                    <dt>{appText.webSubmissionEditorItemOrigin}</dt>
                    <dd>
                      {selected.origin === 'manual'
                        ? appText.webSubmissionEditorManualItem
                        : appText.webSubmissionEditorSourceItem}
                    </dd>
                  </div>
                  <div>
                    <dt>{appText.webSubmissionEditorCollectionLogPages}</dt>
                    <dd>
                      {catalog.pages
                        .filter((page) => page.itemIds.includes(selected.id))
                        .map((page) => page.name)
                        .join(', ') || appText.webSubmissionEditorNotOnAPage}
                    </dd>
                  </div>
                </>
              )}
            </dl>
            {row.chatMessage && (
              <div className="submission-chat-proof">
                <strong>{appText.webSubmissionEditorChatMessage}</strong>
                <p>{row.chatMessage}</p>
              </div>
            )}
            {action.busy && (
              <p role="status" className="admin-note">
                {action.operation === 'approve'
                  ? appText.webSubmissionEditorApprovingSavedClaim
                  : action.operation === 'reject'
                    ? appText.webSubmissionEditorRejectingSubmission
                    : action.operation === 'revoke'
                      ? appText.webSubmissionEditorRevokingCredit
                      : action.operation === 'note'
                        ? appText.webSubmissionEditorSavingReviewNote
                        : appText.webSubmissionEditorSavingClaimCorrections}
              </p>
            )}
            {action.error && (
              <p role="alert" className="admin-error">
                {action.error}
              </p>
            )}
            {action.message && (
              <p role="status" className="admin-success">
                {action.message}
              </p>
            )}
            {readError && (
              <div role="alert" className="admin-error">
                <p>{readError}</p>
                <button
                  className="site-button"
                  onClick={() => setRefresh((v) => v + 1)}
                >
                  {appText.webSubmissionEditorReloadSubmission}
                </button>
              </div>
            )}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              perform();
            }}
          >
            {row.itemId !== null && !activeItem && (
              <p className="admin-note">
                {appText.webSubmissionEditorItemIsNoLongerInTheActiveCatalog(
                  row.itemId,
                )}
              </p>
            )}
            <fieldset disabled={locked || !editable} className="admin-fieldset">
              <legend>
                {appText.webSubmissionEditorSavedClaimAndCorrections}
              </legend>
              <div className="admin-form-grid review-claim-columns">
                <div>
                  <label>
                    {appText.webSubmissionEditorCollectorName}
                    <input
                      required
                      maxLength={80}
                      value={draft.collectorName}
                      onChange={(event) =>
                        change({ collectorName: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    {appText.webSubmissionEditorCollectionDate}
                    <input
                      type="date"
                      required
                      max={new Date().toISOString().slice(0, 10)}
                      value={draft.collectedOn}
                      onChange={(event) =>
                        change({ collectedOn: event.target.value })
                      }
                    />
                  </label>
                </div>
                <div>
                  <label>
                    {appText.webSubmissionEditorSearchCatalogItems}
                    <input
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                  </label>
                  <div>
                    <label htmlFor="canonical-item">
                      {appText.webSubmissionEditorCanonicalItem}
                    </label>
                    <select
                      id="canonical-item"
                      className="catalog-choice-list"
                      required
                      size={5}
                      value={draft.itemId || ''}
                      onChange={(event) =>
                        change({ itemId: Number(event.target.value) })
                      }
                    >
                      <option value="">
                        {appText.webSubmissionEditorSelectTheExactItem}
                      </option>
                      {options.map((item) => (
                        <option key={item.id} value={item.id}>
                          {appText.webSubmissionEditorItemIdentity(
                            item.name,
                            item.id,
                          )}
                        </option>
                      ))}
                    </select>
                  </div>
                  {row.collectionType === 'event' &&
                    draft.itemId !== row.itemId && (
                      <EventPagePicker
                        itemId={draft.itemId}
                        pages={catalog.pages.filter((p) =>
                          p.itemIds.includes(draft.itemId),
                        )}
                        value={draft.eventPageId ?? ''}
                        onChange={(eventPageId) => change({ eventPageId })}
                        disabled={locked}
                      />
                    )}
                </div>
              </div>
              {!matches.length && (
                <p className="admin-note">
                  {
                    appText.webSubmissionEditorNoMatchingItemsAddAMissingItemInCatalogItems
                  }
                </p>
              )}
              <label>
                {appText.webSubmissionEditorReviewNoteOptional}
                <textarea
                  maxLength={1000}
                  rows={3}
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                />
              </label>
              <div className="admin-actions">
                <button
                  className="site-button"
                  type="button"
                  disabled={Boolean(blockers.note)}
                  aria-describedby={describedBy('note')}
                  aria-busy={action.busy && action.operation === 'note'}
                  onClick={saveNote}
                >
                  {appText.webSubmissionEditorSaveReviewNote}
                </button>
                <button
                  className="site-button"
                  type="button"
                  disabled={Boolean(blockers.discardNote)}
                  aria-describedby={describedBy('discardNote')}
                  onClick={() => setReviewNote(row.reviewNote)}
                >
                  {appText.webSubmissionEditorDiscardReviewNote}
                </button>
              </div>
              {explanations(['note', 'discardNote'])}
              <label>
                {
                  appText.webSubmissionEditorReviewReasonOptionalRejectionReasonRevokeReason
                }
                <textarea
                  maxLength={1000}
                  rows={3}
                  value={draft.reason}
                  onChange={(event) =>
                    setDraft({ ...draft, reason: event.target.value })
                  }
                />
              </label>
              <div className="admin-actions">
                <button
                  className="site-button"
                  type="submit"
                  disabled={Boolean(blockers.claim)}
                  aria-describedby={describedBy('claim')}
                  aria-busy={action.busy && action.operation === 'claim'}
                >
                  {appText.webSubmissionEditorSaveCorrections}
                </button>
                <button
                  className="site-button"
                  type="button"
                  disabled={Boolean(blockers.discardClaim)}
                  aria-describedby={describedBy('discardClaim')}
                  onClick={() => {
                    setDraft(draftOf(row));
                    setChecked(false);
                  }}
                >
                  {appText.webSubmissionEditorDiscardCorrections}
                </button>
              </div>
              {explanations(['claim', 'discardClaim'])}
            </fieldset>
            <fieldset
              disabled={locked || !editable}
              className="admin-fieldset review-collection-flags"
            >
              <legend>{appText.webSubmissionEditorCollectionFlags}</legend>
              {row.eventPageBlocked && (
                <p role="status">{appText.eventPageLegacyBlocked}</p>
              )}
              {isEvent && (
                <EventPagePicker
                  itemId={row.itemId ?? 0}
                  pages={targetPages}
                  value={targetPage}
                  occupied={row.occupiedEventPageIds}
                  disabled={locked || !!row.eventPageAssignmentPending}
                  onChange={(eventPageId) =>
                    changeFlags(
                      timed
                        ? {
                            hardcore: flags.hardcore,
                            useIntakeTiming: true,
                            ...(eventPageId ? { eventPageId } : {}),
                          }
                        : {
                            hardcore: flags.hardcore,
                            collectionType: 'event',
                            ...(eventPageId ? { eventPageId } : {}),
                          },
                    )
                  }
                />
              )}
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={flags.hardcore}
                  onChange={(event) =>
                    changeFlags({
                      hardcore: event.target.checked,
                      collectionType: 'regular',
                    })
                  }
                />
                {appText.webSubmissionEditorCollectedOnHardcoreWorlds}
              </label>
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  disabled={flags.hardcore}
                  checked={
                    !flags.hardcore &&
                    (flags.collectionType ?? row.collectionType) === 'event'
                  }
                  onChange={(event) =>
                    changeFlags({
                      hardcore: flags.hardcore,
                      collectionType: event.target.checked
                        ? 'event'
                        : 'regular',
                    })
                  }
                />
                {appText.webSubmissionEditorObtainedDuringEvents}
              </label>
              {row.source !== 'manual' && (
                <button
                  className="site-button"
                  type="button"
                  disabled={flags.useIntakeTiming === true}
                  onClick={() =>
                    changeFlags({
                      hardcore: flags.hardcore,
                      useIntakeTiming: true,
                    })
                  }
                >
                  {appText.webSubmissionEditorUseSavedIntakeTiming}
                </button>
              )}
              {flags.useIntakeTiming && (
                <p className="admin-note">
                  {
                    appText.webSubmissionEditorSavedIntakeTimingWillDetermineTheCollectionType
                  }
                </p>
              )}
              {row.status === 'pending' && flagsDirty && (
                <p className="admin-note">
                  {
                    appText.webSubmissionEditorCollectionFlagsWillBeSavedWithYourReviewDecision
                  }
                </p>
              )}
              <div className="admin-actions">
                {row.status === 'approved' && (
                  <button
                    className="site-button"
                    type="button"
                    disabled={
                      locked ||
                      !activeItem ||
                      !flagsDirty ||
                      !draft.reason.trim()
                    }
                    aria-busy={action.busy && action.operation === 'flags'}
                    onClick={saveFlags}
                  >
                    {appText.webSubmissionEditorSaveCollectionFlags}
                  </button>
                )}
                <button
                  className="site-button"
                  type="button"
                  disabled={!flagsDirty}
                  onClick={() => changeFlags(flagsOf(row))}
                >
                  {appText.webSubmissionEditorDiscardCollectionFlags}
                </button>
              </div>
              {row.status === 'approved' &&
                flagsDirty &&
                !draft.reason.trim() && (
                  <p className="admin-note">
                    {
                      appText.webSubmissionEditorEnterAnAuditReasonBeforeSavingCollectionFlags
                    }
                  </p>
                )}
            </fieldset>
            {showClaimHint && (
              <p className="admin-note" id={claimHintId}>
                {unsavedClaimHint}
              </p>
            )}
            {row.status === 'pending' && (
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={Boolean(blockers.acknowledge)}
                  aria-describedby={describedBy('acknowledge')}
                  onChange={(event) => setChecked(event.target.checked)}
                />
                {row.source === 'manual'
                  ? appText.webSubmissionEditorIVerifiedThisManualClaimAndItsItemCollectorDate
                  : row.chatMessage
                    ? appText.webSubmissionEditorICheckedTheChatMessageAndAnyAttachedProofFor
                    : appText.webSubmissionEditorICheckedTheScreenshotForTheSavedItemCollectorDate}
              </label>
            )}
            {row.status === 'pending' && explanations(['acknowledge'])}
            <div className="admin-actions">
              {row.status === 'pending' && (
                <>
                  <button
                    className="site-button site-button--approve"
                    type="button"
                    disabled={Boolean(blockers.approve)}
                    aria-describedby={describedBy('approve')}
                    aria-busy={action.busy && action.operation === 'approve'}
                    onClick={() => perform('approve')}
                  >
                    {appText.webSubmissionEditorApproveSubmission}
                  </button>
                  <button
                    className="site-button"
                    type="button"
                    disabled={Boolean(blockers.reject)}
                    aria-describedby={describedBy('reject')}
                    aria-busy={action.busy && action.operation === 'reject'}
                    onClick={() => perform('reject')}
                  >
                    {appText.webSubmissionEditorRejectSubmission}
                  </button>
                </>
              )}
              {row.status === 'approved' && (
                <button
                  className="site-button site-button--danger"
                  type="button"
                  disabled={Boolean(blockers.revoke)}
                  aria-describedby={describedBy('revoke')}
                  aria-busy={action.busy && action.operation === 'revoke'}
                  onClick={() => perform('revoke')}
                >
                  {appText.webSubmissionEditorRevokeCredit}
                </button>
              )}
            </div>
            {row.status === 'pending'
              ? explanations(['approve', 'reject'])
              : row.status === 'approved'
                ? explanations(['revoke'])
                : null}
          </form>
        </div>
        <ReviewAuditHistory
          key={
            detail.auditRevision +
            ':' +
            row.version +
            ':' +
            refresh +
            ':' +
            detail.audit[0]?.id
          }
          initial={detail}
          client={client}
          disabled={action.busy}
          onAccessLost={onAccessLost}
          onReload={() => setRefresh((v) => v + 1)}
        />
      </section>
    </ReviewWindow>
  );
}
