import { useId, useState } from 'react';
import * as appText from '@clog/domain';
import type { RepeatCollectorPolicy, SubmissionFilters } from '@clog/domain';
import type { AdminClient } from './admin-model.ts';
import type { AdminSession } from './xp-model.ts';
import { useAdminAction } from './use-admin-action.ts';
import { useAdminDraft } from './admin-route-data.ts';
export function DuplicateHandling({
  client,
  session,
  filters,
  onSaved,
  onAccessLost,
}: {
  client: AdminClient;
  session: AdminSession;
  filters: SubmissionFilters | undefined;
  onSaved: (value: SubmissionFilters) => void;
  onAccessLost: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState<{
    policy: RepeatCollectorPolicy;
    revision: string;
  }>();
  const action = useAdminAction(onAccessLost);
  const policy = draft?.policy ?? filters?.repeatCollectorPolicy ?? 'separate';
  const dirty = !!filters && policy !== filters.repeatCollectorPolicy;
  useAdminDraft(dirty, action.busy);
  const choices = [
    {
      id: 'reject',
      name: appText.repeatCollectorReject,
    },
    {
      id: 'separate',
      name: appText.repeatCollectorSeparate,
    },
    {
      id: 'merge',
      name: appText.repeatCollectorMerge,
    },
  ] as const;
  const accept = (current: SubmissionFilters) => {
    onSaved(current);
    setDraft((saved) =>
      saved ? { ...saved, revision: current.revision } : undefined,
    );
  };
  const reload = async (signal: AbortSignal) => {
    const current = (await client.queue('pending', undefined, signal)).filters;
    if (!signal.aborted && current) accept(current);
  };
  return (
    <section className="admin-panel submission-filter-panel duplicate-handling-panel">
      <h2>{appText.duplicateHandlingTitle}</h2>
      <h3 id={`${id}-regular`}>
        {appText.webAdminQueueFilterOutRegularDuplicates}
      </h3>
      {session.role === 'admin' ? (
        <button
          type="button"
          className="site-button admin-toggle"
          role="switch"
          aria-labelledby={`${id}-regular`}
          aria-checked={filters?.filterCollected ?? false}
          disabled={!filters || action.busy}
          onClick={() => {
            if (!filters) return;
            void action.execute(async (signal) => {
              const saved = await client.saveSubmissionFilters(
                !filters.filterCollected,
                filters.revision,
                session.csrfToken,
                signal,
              );
              if (!signal.aborted) accept(saved);
            }, reload);
          }}
        >
          {filters?.filterCollected
            ? appText.webAdminQueueOn
            : appText.webAdminQueueOff}
        </button>
      ) : (
        <p>
          {appText.webAdminQueueDuplicateFilterExplanation.beforeState}{' '}
          <strong>
            {filters
              ? filters.filterCollected
                ? appText.webAdminQueueDuplicateFilterExplanation.enabled
                : appText.webAdminQueueDuplicateFilterExplanation.disabled
              : appText.webAdminQueueDuplicateFilterExplanation.unavailable}
          </strong>
          {appText.webAdminQueueDuplicateFilterExplanation.afterState}
        </p>
      )}
      <h3 id={`${id}-policy`}>{appText.repeatCollectorTitle}</h3>
      <select
        aria-labelledby={`${id}-policy`}
        value={policy}
        disabled={!filters || action.busy || session.role !== 'admin'}
        onChange={(event) =>
          setDraft({
            policy: event.target.value as RepeatCollectorPolicy,
            revision: filters!.revision,
          })
        }
      >
        {choices.map((choice) => (
          <option key={choice.id} value={choice.id}>
            {choice.name}
          </option>
        ))}
      </select>
      {session.role !== 'admin' ? (
        <p>{appText.repeatCollectorReadOnly}</p>
      ) : (
        <div className="admin-actions">
          <button
            className="site-button"
            disabled={!dirty || action.busy}
            onClick={() =>
              void action.execute(async (signal) => {
                const saved = await client.saveSubmissionFilters(
                  filters!.filterCollected,
                  draft!.revision,
                  session.csrfToken,
                  signal,
                  policy,
                );
                if (!signal.aborted) {
                  onSaved(saved);
                  setDraft(undefined);
                  action.setMessage(appText.repeatCollectorSaved);
                }
              }, reload)
            }
          >
            {appText.repeatCollectorSave}
          </button>
        </div>
      )}
      {action.error && <p role="alert">{action.error}</p>}
      {action.message && <p role="status">{action.message}</p>}
    </section>
  );
}
