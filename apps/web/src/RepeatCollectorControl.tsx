import { useId, useState } from 'react';
import * as appText from '@clog/domain';
import type { RepeatCollectorPolicy, SubmissionFilters } from '@clog/domain';
import type { AdminClient } from './admin-model.ts';
import type { AdminSession } from './xp-model.ts';
import { useAdminAction } from './use-admin-action.ts';
import { useAdminDraft } from './admin-route-data.ts';
export function RepeatCollectorControl({
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
  const stale = dirty && draft?.revision !== filters?.revision;
  useAdminDraft(dirty, action.busy);
  const choices = [
    {
      id: 'reject',
      name: appText.repeatCollectorReject,
      help: appText.repeatCollectorRejectHelp,
    },
    {
      id: 'separate',
      name: appText.repeatCollectorSeparate,
      help: appText.repeatCollectorSeparateHelp,
    },
    {
      id: 'merge',
      name: appText.repeatCollectorMerge,
      help: appText.repeatCollectorMergeHelp,
    },
  ] as const;
  const reload = async (signal: AbortSignal) => {
    const current = (await client.queue('pending', undefined, signal)).filters;
    if (!signal.aborted && current) {
      onSaved(current);
      setDraft((saved) =>
        saved ? { ...saved, revision: current.revision } : undefined,
      );
    }
  };
  return (
    <section className="admin-panel repeat-collector-panel">
      <h2 id={id}>{appText.repeatCollectorTitle}</h2>
      <select
        aria-labelledby={id}
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
      <p>{choices.find((choice) => choice.id === policy)!.help}</p>
      <p>{appText.repeatCollectorPrecedence}</p>
      {session.role !== 'admin' ? (
        <p>{appText.repeatCollectorReadOnly}</p>
      ) : (
        <div className="admin-actions">
          <button
            className="site-button"
            disabled={!dirty || stale || action.busy}
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
          <button
            className="site-button"
            disabled={action.busy || !filters}
            onClick={() => void action.execute(reload)}
          >
            {appText.repeatCollectorReload}
          </button>
        </div>
      )}
      {stale && <p role="alert">{appText.repeatCollectorChanged}</p>}
      {action.error && <p role="alert">{action.error}</p>}
      {action.message && <p role="status">{action.message}</p>}
    </section>
  );
}
