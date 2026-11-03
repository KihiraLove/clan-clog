import * as appText from '@clog/domain';
/** Admin-authored drops use the same review and world-credit ledger as bot claims. */
import { AdminRequestError } from './admin-api.ts';
import { useAdminAction } from './use-admin-action.ts';
import { useState } from 'react';
import {
  type AdminCatalog,
  type AdminClient,
  type ManualSubmissionInput,
  type Submission,
} from './admin-model.ts';
import type { AdminSession } from './xp-model.ts';
import { useAdminDraft } from './admin-route-data.ts';
import { EventPagePicker } from './EventPagePicker.tsx';

export function ManualSubmissionForm({
  catalog,
  client,
  session,
  onAccessLost,
  onCreated,
}: {
  catalog: AdminCatalog;
  client: AdminClient;
  session: AdminSession;
  onAccessLost: () => void;
  onCreated: (result: Submission) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [itemId, setItemId] = useState('');
  const [collectorName, setCollectorName] = useState('');
  const [collectedOn, setCollectedOn] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [hardcore, setHardcore] = useState(false);
  const [eventPageId, setEventPageId] = useState('');
  const [collectionType, setCollectionType] = useState<'regular' | 'event'>(
    'regular',
  );
  const [screenshot, setScreenshot] = useState<File>();
  const [formVersion, setFormVersion] = useState(0);
  const [approve, setApprove] = useState(true);
  const [reason, setReason] = useState('');
  const action = useAdminAction(onAccessLost);
  const { busy, error, setError } = action;
  const [pending, setPending] = useState<{
    fields: ManualSubmissionInput;
    key: string;
    screenshot?: File | undefined;
  }>();
  useAdminDraft(
    !!((open && itemId) || collectorName || screenshot || reason || pending),
    busy,
  );
  const options = catalog.items.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase().trim()) ||
      String(item.id) === search.trim(),
  );
  const chosen = catalog.items.find((item) => item.id === Number(itemId));
  const eventPages = catalog.pages.filter((p) =>
    p.itemIds.includes(Number(itemId)),
  );
  const eventPage = eventPages.some((p) => p.id === eventPageId)
    ? eventPageId
    : eventPages.length === 1
      ? eventPages[0]!.id
      : '';
  const visible =
    chosen && !options.some((item) => item.id === chosen.id)
      ? [chosen, ...options]
      : options;
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setError(undefined);
    if (!chosen || !collectorName.trim() || !collectedOn) {
      setError(
        appText.webManualSubmissionFormSelectASpecificItemCollectorAndCollectionDate,
      );
      return;
    }
    if (
      screenshot &&
      (screenshot.type !== 'image/png' || screenshot.size > 10 * 1024 * 1024)
    ) {
      setError(appText.webManualSubmissionFormChooseAPngScreenshotUpTo10MiB);
      return;
    }
    await action.execute(async (signal) => {
      if (!pending && !hardcore && collectionType === 'event' && !eventPage)
        throw Error(appText.eventPageRequired);
      const request = pending ?? {
        fields: {
          itemId: chosen.id,
          collectorName: collectorName.trim(),
          collectedOn,
          hardcore,
          collectionType: hardcore ? 'regular' : collectionType,
          ...(!hardcore && collectionType === 'event'
            ? { eventPageId: eventPage }
            : {}),
          approve,
          reason: reason.trim(),
        },
        key: crypto.randomUUID(),
        screenshot,
      };
      setPending(request);
      let result: Submission;
      try {
        result = await client.addManual(
          request.fields,
          request.key,
          session.csrfToken,
          signal,
          request.screenshot,
        );
      } catch (failure) {
        // Keep the exact request after a timeout, transport error or server failure.
        if (
          !signal.aborted &&
          failure instanceof AdminRequestError &&
          failure.status >= 400 &&
          failure.status < 500 &&
          ![408, 429].includes(failure.status)
        ) {
          setPending(undefined);
        }
        throw failure;
      }
      if (signal.aborted) return;
      setPending(undefined);
      setSearch('');
      setItemId('');
      setCollectorName('');
      setCollectedOn(new Date().toISOString().slice(0, 10));
      setHardcore(false);
      setCollectionType('regular');
      setEventPageId('');
      setScreenshot(undefined);
      setFormVersion((value) => value + 1);
      setApprove(true);
      setReason('');
      action.setMessage(
        result.status === 'rejected'
          ? (result.reviewReason ?? appText.repeatCollectorRejected)
          : appText.webManualSubmissionFormManualSubmissionCreatedSuccessfully,
      );
      onCreated(result);
    });
  };

  return (
    <section className="admin-panel">
      <h2>{appText.webManualSubmissionFormManualSubmission}</h2>
      <div className="admin-actions">
        <button
          className="site-button"
          type="button"
          disabled={busy}
          onClick={() => setOpen(!open)}
        >
          {open
            ? appText.webManualSubmissionFormCancelManualEntry
            : appText.webManualSubmissionFormAddManualSubmission}
        </button>
      </div>
      {action.message && (
        <p role="status" className="admin-success">
          {action.message}
        </p>
      )}
      {open && (
        <form key={formVersion} onSubmit={(event) => void submit(event)}>
          <fieldset
            className="admin-fieldset"
            disabled={busy || Boolean(pending)}
          >
            <div className="admin-form-grid manual-submission-columns">
              <div>
                <label>
                  {appText.webManualSubmissionFormCollectorName}
                  <input
                    required
                    maxLength={80}
                    value={collectorName}
                    onChange={(event) => setCollectorName(event.target.value)}
                  />
                </label>
                <label>
                  {appText.webManualSubmissionFormPngScreenshotOptional}
                  <input
                    type="file"
                    accept="image/png,.png"
                    onChange={(event) => setScreenshot(event.target.files?.[0])}
                  />
                  <span className="admin-note">
                    {appText.webManualSubmissionFormUpTo10MiB}
                  </span>
                </label>
                <label>
                  {appText.webManualSubmissionFormReasonOrNoteOptional}
                  <textarea
                    maxLength={1000}
                    rows={2}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </label>
              </div>
              <div>
                <label>
                  {appText.webManualSubmissionFormSearchCatalogItems}
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
                <label>
                  {appText.webManualSubmissionFormCanonicalItem}
                  <select
                    aria-label={appText.webManualSubmissionFormCanonicalItem}
                    className="catalog-choice-list"
                    required
                    size={5}
                    value={itemId}
                    onChange={(event) => {
                      setItemId(event.target.value);
                      setEventPageId('');
                    }}
                  >
                    <option value="">
                      {appText.webManualSubmissionFormChooseTheExactItem}
                    </option>
                    {visible.map((item) => (
                      <option key={item.id} value={item.id}>
                        {appText.webManualSubmissionFormItemIdentity(
                          item.name,
                          item.id,
                        )}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {appText.webManualSubmissionFormCollectionDate}
                  <input
                    type="date"
                    required
                    max={new Date().toISOString().slice(0, 10)}
                    value={collectedOn}
                    onChange={(event) => setCollectedOn(event.target.value)}
                  />
                </label>
              </div>
            </div>
            <div className="manual-submission-options">
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={collectionType === 'event'}
                  disabled={hardcore}
                  onChange={(event) =>
                    setCollectionType(
                      event.target.checked ? 'event' : 'regular',
                    )
                  }
                />
                {appText.webManualSubmissionFormObtainedDuringEvents}
              </label>
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={hardcore}
                  onChange={(event) => {
                    setHardcore(event.target.checked);
                    setCollectionType('regular');
                  }}
                />
                {appText.webManualSubmissionFormCollectedOnHardcoreWorlds}
              </label>
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={approve}
                  onChange={(event) => setApprove(event.target.checked)}
                />
                {appText.webManualSubmissionFormApproveImmediately}
              </label>
            </div>
            {collectionType === 'event' && !hardcore && (
              <div className="admin-form-grid">
                <EventPagePicker
                  itemId={Number(itemId)}
                  pages={eventPages}
                  value={eventPage}
                  onChange={setEventPageId}
                  disabled={busy || !!pending}
                />
              </div>
            )}
          </fieldset>
          {pending && (
            <p className="admin-note">
              {
                appText.webManualSubmissionFormRetryToConfirmThisSubmissionBeforeChangingItsDetails
              }
            </p>
          )}
          {error && (
            <p role="alert" className="admin-error">
              {error}
            </p>
          )}
          <button className="site-button" type="submit" disabled={busy}>
            {busy
              ? appText.webManualSubmissionFormSaving
              : pending
                ? appText.webManualSubmissionFormRetryManualSubmission
                : appText.webManualSubmissionFormCreateManualSubmission}
          </button>
        </form>
      )}
    </section>
  );
}
