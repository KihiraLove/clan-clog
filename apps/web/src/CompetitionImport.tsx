import * as appText from '@clog/domain';
import { UnknownMetricRequestError } from './competition-import-api.ts';
import { useEffect, useRef, useState } from 'react';
import { classifyAccessFailure } from './admin-session.ts';
import {
  CompetitionRequestError,
  type CompetitionClient,
  type CompetitionImportPreview,
} from './competition-api.ts';
import { exactXp, signedXp, skillName, type AdminSession } from './xp-model.ts';
import { localScheduleLabel, utcScheduleLabel } from './schedule-time.ts';
import { useAdminDraft } from './admin-route-data.ts';
import {
  competitionUnit,
  formatCompetitionAmount,
  type CompetitionMetricResolution,
  type CustomCompetitionMetric,
} from '@clog/domain';
import { UnknownMetricDialog } from './UnknownMetricDialog.tsx';
import {
  CompetitionMetrics,
  CompetitionBreakdown,
} from './CompetitionMetrics.tsx';
export function CompetitionImport({
  client,
  session,
  onApplied,
  onAccessLost,
}: {
  client: CompetitionClient;
  session: AdminSession;
  onApplied: () => void;
  onAccessLost: () => void;
}) {
  const [url, setUrl] = useState('');
  const previewButton = useRef<HTMLButtonElement>(null);
  const [resolution, setResolution] = useState<CompetitionMetricResolution>();
  const [preview, setPreview] = useState<CompetitionImportPreview>(),
    [pages, setPages] = useState<string[]>();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string>(),
    [message, setMessage] = useState<string>(),
    [ack, setAck] = useState(false),
    [expired, setExpired] = useState(false),
    [search, setSearch] = useState('');
  const key = useRef(''),
    operation = useRef<AbortController | undefined>(undefined);
  useEffect(() => () => operation.current?.abort(), []);
  useEffect(() => {
    const check = () =>
      setExpired(!!preview && Date.now() >= Date.parse(preview.expiresAt));
    check();
    const t = setInterval(check, 1000);
    return () => clearInterval(t);
  }, [preview]);
  const dirty =
    !!preview &&
    JSON.stringify(pages?.slice().sort()) !==
      JSON.stringify(preview.pageIds.slice().sort());
  useAdminDraft(!!preview || !!resolution || dirty, busy);
  const execute = async (apply: boolean) => {
    if (busy) return;
    const controller = new AbortController();
    operation.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    try {
      if (apply && preview) {
        const r = await client.apply(
          preview,
          session.csrfToken,
          key.current,
          ack,
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setMessage(
          r.outcome === 'unchanged'
            ? appText.webCompetitionImportUnchangedNoGainsOrSchedulesWereAdded
            : preview.action === 'import-metadata'
              ? appText.webCompetitionImportCompetitionMetadataImportedNoPagesWereOpenedOrXpAdded
              : appText.webCompetitionImportCompetitionImported,
        );
        setPreview(undefined);
        setPages(undefined);
        onApplied();
      } else {
        const p = await client.preview(
          url,
          session.csrfToken,
          controller.signal,
          pages,
        );
        if (controller.signal.aborted) return;
        setPreview(p);
        setPages(p.pageIds);
        setAck(false);
        key.current = crypto.randomUUID();
      }
    } catch (e) {
      if (
        e instanceof UnknownMetricRequestError &&
        !controller.signal.aborted
      ) {
        setPreview(undefined);
        setResolution(e.resolution);
        return;
      }
      if (controller.signal.aborted) {
        setError(
          appText.webCompetitionImportRequestTimedOutRetryApplyToCheckTheCommittedResult,
        );
      } else {
        const failure = classifyAccessFailure(e);
        if (failure === 'expired') {
          setPreview(undefined);
          setPages(undefined);
          onAccessLost();
          return;
        }
        setError(
          failure === 'denied'
            ? appText.webCompetitionImportYourAccountIsNotAllowedToPerformThisCompetitionImport
            : e instanceof CompetitionRequestError
              ? e.message
              : e instanceof Error
                ? e.message
                : appText.webCompetitionImportImportFailed,
        );
      }
      if (
        e instanceof CompetitionRequestError &&
        [401, 403, 409].includes(e.status)
      ) {
        setPreview(undefined);
        setPages(undefined);
      }
    } finally {
      clearTimeout(timeout);
      if (operation.current === controller) setBusy(false);
    }
  };
  const saveMetrics = async (
    definitions: CustomCompetitionMetric[],
    requestKey: string,
  ) => {
    if (!resolution || busy || !client.saveMetrics) return;
    const controller = new AbortController();
    operation.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    setBusy(true);
    setError(undefined);
    let saved = false;
    try {
      await client.saveMetrics(
        resolution,
        definitions,
        requestKey,
        session.csrfToken,
        controller.signal,
      );
      saved = true;
      setResolution(undefined);
      setMessage(
        appText.webCompetitionImportMetricDefinitionsSavedReviewTheCompetitionBeforeApplying,
      );
      const p = await client.preview(
        url,
        session.csrfToken,
        controller.signal,
        pages,
      );
      if (controller.signal.aborted) return;
      setPreview(p);
      setPages(p.pageIds);
      setAck(false);
      key.current = crypto.randomUUID();
    } catch (failure) {
      if (classifyAccessFailure(failure) === 'expired') {
        setResolution(undefined);
        onAccessLost();
        return;
      }
      if (failure instanceof UnknownMetricRequestError)
        setResolution(failure.resolution);
      else if (classifyAccessFailure(failure) === 'denied')
        setError(
          appText.webCompetitionImportYourAccountIsNotAllowedToSaveCompetitionMetrics,
        );
      else
        setError(
          saved
            ? appText.webCompetitionImportMetricDefinitionsWereSavedButTheCompetitionPreviewCouldNot
            : failure instanceof CompetitionRequestError
              ? failure.message
              : appText.webCompetitionImportCouldNotConfirmTheMetricSaveRetryTheSameChoices,
        );
    } finally {
      clearTimeout(timeout);
      if (operation.current === controller) setBusy(false);
      if (saved) requestAnimationFrame(() => previewButton.current?.focus());
    }
  };
  const correction = preview?.changes.some((c) => BigInt(c.change) < 0n);
  return (
    <section className="competition-import">
      {resolution && (
        <UnknownMetricDialog
          key={resolution.resolutionToken}
          resolution={resolution}
          busy={busy}
          error={error}
          onSave={saveMetrics}
          onDiscard={() => {
            setResolution(undefined);
            setPreview(undefined);
            setPages(undefined);
            setError(undefined);
            setMessage(appText.webCompetitionImportImportDiscarded);
            requestAnimationFrame(() => previewButton.current?.focus());
          }}
        />
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void execute(false);
        }}
      >
        <fieldset disabled={busy} className="admin-fieldset">
          <label className="admin-field-label">
            {appText.webCompetitionImportWiseOldManCompetitionLink}
            <input
              className="admin-input"
              type="url"
              required
              value={url}
              placeholder="https://wiseoldman.net/competitions/123"
              onChange={(e) => {
                setUrl(e.target.value);
                setPreview(undefined);
                setPages(undefined);
              }}
            />
          </label>
          <button ref={previewButton} className="site-button" disabled={!url}>
            {busy
              ? appText.webCompetitionImportPleaseWait
              : appText.webCompetitionImportPreviewCompetition}
          </button>
        </fieldset>
      </form>
      {error && (
        <p role="alert" className="admin-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="admin-success">
          {message}
        </p>
      )}
      {preview && (
        <div className="xp-import-preview">
          <h4>{preview.competition.title}</h4>
          <p>
            {appText.webCompetitionImportDetectedKindMessage(
              preview.competition.kind,
              preview.lifecycle,
              preview.competition.metrics.join(', '),
            )}
          </p>
          <a
            href={preview.competition.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {appText.webCompetitionImportViewCompetitionOnWom}
          </a>
          <p>
            {appText.webCompetitionImportStart}
            {localScheduleLabel(preview.competition.startsAt)}
            <br />
            <small>{utcScheduleLabel(preview.competition.startsAt)}</small>
            <br />
            {appText.webCompetitionImportEnd}
            {localScheduleLabel(preview.competition.endsAt)}
            <br />
            <small>{utcScheduleLabel(preview.competition.endsAt)}</small>
          </p>
          <p>
            {preview.action === 'import-metadata'
              ? appText.webCompetitionImportImportCompetitionMetadataOnlyNoPagesWillBeOpenedAnd
              : preview.action === 'import-results'
                ? appText.webCompetitionImportImportFinishedResultsNoOpeningWindowWillBeCreated
                : preview.action === 'update-schedule'
                  ? appText.webCompetitionImportUpdateTheLinkedScheduleToTheImportedDatesAndAdd
                  : preview.action === 'preserve-deletion'
                    ? appText.webCompetitionImportKeepTheLinkedWindowClosed
                    : preview.lifecycle === 'running'
                      ? appText.webCompetitionImportCreateAnOpeningWindowStartingImmediatelyWhenApplyCommitsEnding
                      : appText.webCompetitionImportCreateAnOpeningWindowForTheWomStartAndEnd}
          </p>
          <CompetitionMetrics competition={preview.competition} />
          {preview.competition.kind === 'ACTIVITY' &&
            preview.action === 'create-schedule' && (
              <>
                <label className="admin-field-label">
                  {appText.webCompetitionImportFindOpeningPages}
                  <input
                    className="admin-input"
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <fieldset
                  className="admin-choice-fieldset schedule-page-list"
                  disabled={busy}
                >
                  <legend>{appText.webCompetitionImportOpeningPages}</legend>
                  {preview.pages
                    .filter((p) =>
                      p.name.toLowerCase().includes(search.toLowerCase()),
                    )
                    .map((p) => (
                      <label
                        className="admin-checkbox admin-checkbox--touch"
                        key={p.id}
                      >
                        <input
                          className="admin-check"
                          type="checkbox"
                          checked={pages?.includes(p.id) ?? false}
                          onChange={(e) =>
                            setPages(
                              e.target.checked
                                ? [...(pages ?? []), p.id]
                                : (pages ?? []).filter((id) => id !== p.id),
                            )
                          }
                        />
                        {p.name}
                      </label>
                    ))}
                </fieldset>
                <p>
                  {appText.webCompetitionImportPagesSelectedMessage(
                    pages?.length ?? 0,
                    dirty,
                  )}
                </p>
                {dirty && (
                  <button
                    className="site-button"
                    disabled={busy}
                    onClick={() => {
                      void execute(false);
                    }}
                  >
                    {appText.webCompetitionImportUpdatePreview}
                  </button>
                )}
              </>
            )}
          {preview.competition.kind === 'ACTIVITY' &&
            preview.action === 'update-schedule' && (
              <p>
                {appText.webCompetitionImportPagesMessage(
                  preview.pageIds
                    .map(
                      (id) =>
                        preview.pages.find((p) => p.id === id)?.name ?? id,
                    )
                    .join(', '),
                )}
              </p>
            )}
          {preview.lifecycle === 'finished' && (
            <details>
              <summary>
                {appText.webCompetitionImportEligibleParticipantsMessage(
                  preview.participants.length,
                )}
              </summary>
              <ol>
                {(preview.standings ?? preview.participants).map((p) => (
                  <li key={p.playerId}>
                    {appText.webCompetitionImportMetricAmount(
                      p.displayName,
                      formatCompetitionAmount(p.gained),
                      competitionUnit(preview.competition),
                    )}
                  </li>
                ))}
              </ol>
              {preview.standings && (
                <CompetitionBreakdown players={preview.standings} />
              )}
            </details>
          )}
          {!!preview.changes.length && (
            <div className="xp-table-scroll">
              <table className="xp-table">
                <caption>
                  {appText.webCompetitionImportChangeToCumulativeSiteTotals}
                </caption>
                <thead>
                  <tr>
                    <th>{appText.webCompetitionImportSkill}</th>
                    <th>{appText.webCompetitionImportBefore}</th>
                    <th>{appText.webCompetitionImportAfter}</th>
                    <th>{appText.webCompetitionImportChange}</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.changes.map((c) => (
                    <tr key={c.skill}>
                      <th>{skillName(c.skill)}</th>
                      <td>
                        {appText.webCompetitionImportXP(exactXp(c.before))}
                      </td>
                      <td>
                        {appText.webCompetitionImportXPMessage(
                          exactXp(c.after),
                        )}
                      </td>
                      <td>
                        {appText.webCompetitionImportXPMessage2(
                          signedXp(c.change),
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {preview.warnings.map((w) => (
            <p className="admin-note" key={w}>
              {w}
            </p>
          ))}
          {correction && (
            <label className="admin-checkbox admin-checkbox--touch">
              <input
                className="admin-check"
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
              />
              {
                appText.webCompetitionImportIReviewedTheCorrectionsThatReduceRecordedXp
              }
            </label>
          )}
          {expired && (
            <p role="alert" className="admin-error">
              {
                appText.webCompetitionImportPreviewExpiredPreviewThisCompetitionAgain
              }
            </p>
          )}
          <button
            className="site-button"
            disabled={
              busy ||
              expired ||
              dirty ||
              (preview.action === 'create-schedule' && !pages?.length) ||
              (correction && !ack)
            }
            onClick={() => {
              void execute(true);
            }}
          >
            {appText.webCompetitionImportApplyImport}
          </button>
        </div>
      )}
    </section>
  );
}
