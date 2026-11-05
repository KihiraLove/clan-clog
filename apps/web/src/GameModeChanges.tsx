import { useEffect, useState } from 'react';
import * as appText from '@clog/domain';
import type { CollectorIdentity } from '@clog/domain';
import type { AdminClient } from './admin-model.ts';
import type { AdminSession } from './xp-model.ts';
import { classifyAccessFailure } from './admin-session.ts';
import { GameModeEditor } from './GameModeEditor.tsx';

export function GameModeChanges({
  client,
  session,
  onAccessLost,
  onChanged,
}: {
  client: AdminClient;
  session: AdminSession;
  onAccessLost: () => void;
  onChanged: () => void;
}) {
  const [search, setSearch] = useState(''),
    [collector, setCollector] = useState(''),
    [active, setActive] = useState(false),
    [options, setOptions] = useState<CollectorIdentity[]>([]),
    [loading, setLoading] = useState(false),
    [failed, setFailed] = useState(false),
    [hasMore, setHasMore] = useState(false),
    [refresh, setRefresh] = useState(0),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!active || !client.collectorNameClient) return;
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      void client.collectorNameClient!()
        .then((api) =>
          api.collectors(
            search,
            AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
          ),
        )
        .then((result) => {
          if (controller.signal.aborted) return;
          setOptions(result.collectors);
          setHasMore(result.hasMore);
          setFailed(false);
        })
        .catch((error) => {
          if (controller.signal.aborted) return;
          if (classifyAccessFailure(error) === 'expired') onAccessLost();
          else setFailed(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 200);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [active, client, search, refresh, onAccessLost]);
  return (
    <>
      <fieldset className="admin-fieldset" disabled={busy || dirty}>
        <div className="admin-form-grid">
          <label>
            {appText.gameModeSearch}
            <input
              type="search"
              value={search}
              maxLength={80}
              onFocus={() => setActive(true)}
              onChange={(event) => {
                setSearch(event.target.value);
                setCollector('');
                setActive(true);
              }}
            />
          </label>
          <label>
            {appText.gameModeSelectCollector}
            <select
              value={collector}
              disabled={loading}
              onFocus={() => setActive(true)}
              onChange={(event) => setCollector(event.target.value)}
            >
              <option value="">{appText.collectorNamesSelect}</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>
      {hasMore && <p>{appText.collectorNamesNarrowSearch}</p>}
      {failed && (
        <p className="admin-error" role="alert">
          {appText.gameModeUnavailable}{' '}
          <button
            type="button"
            className="site-button"
            onClick={() => setRefresh((value) => value + 1)}
          >
            {appText.gameModeReload}
          </button>
        </p>
      )}
      {collector && (
        <GameModeEditor
          key={collector}
          collectorId={collector}
          heading={false}
          client={client}
          session={session}
          onAccessLost={onAccessLost}
          onSaved={onChanged}
          onDirty={setDirty}
          onBusy={setBusy}
        />
      )}
    </>
  );
}
