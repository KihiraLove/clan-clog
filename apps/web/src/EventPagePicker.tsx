/** Availability is advisory; the server rechecks it under the canonical item lock. */
import { useEffect, useState } from 'react';
import * as appText from '@clog/domain';
import { parseCollections, type Page } from './model.ts';
export function EventPagePicker({
  itemId,
  pages,
  value,
  onChange,
  disabled,
  occupied,
}: {
  itemId: number;
  pages: readonly Page[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  occupied?: readonly string[] | undefined;
}) {
  const [known, setKnown] = useState<readonly string[]>();
  const [legacy, setLegacy] = useState(false);
  useEffect(() => {
    if (occupied) return;
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 10000);
    setKnown(undefined);
    setLegacy(false);
    void fetch('/api/v1/collections', {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (r) => {
        if (!r.ok) throw Error();
        return parseCollections(await r.json());
      })
      .then((data) => {
        if (!controller.signal.aborted)
          setLegacy(
            data.credits.some(
              (c) => c.itemId === itemId && c.eventPageAssignmentPending,
            ),
          );
        if (!controller.signal.aborted)
          setKnown(
            data.credits
              .filter(
                (c) =>
                  c.itemId === itemId &&
                  c.collectionType === 'event' &&
                  c.eventPageId,
              )
              .map((c) => c.eventPageId!),
          );
      })
      .catch(() => {})
      .finally(() => clearTimeout(timer));
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [itemId, occupied]);
  const taken = occupied ?? known;
  return (
    <div>
      <label>
        {appText.eventPageChoose}
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{appText.eventPageChoose}</option>
          {value && !pages.some((p) => p.id === value) && (
            <option value={value}>{appText.eventPageUnavailable}</option>
          )}
          {pages.map((p) => (
            <option key={p.id} value={p.id}>
              {taken
                ? appText.eventPageAvailability(p.name, taken.includes(p.id))
                : p.name}
            </option>
          ))}
        </select>
      </label>
      <p className="admin-note">{appText.eventPageSelectionHelp}</p>
      {legacy && <p role="status">{appText.eventPageLegacyBlocked}</p>}
      {!taken && (
        <p className="admin-note">{appText.eventPageAvailabilityRecheck}</p>
      )}
    </div>
  );
}
