/** Group presentation only: original credit objects and obtain counts stay intact. */
import { normalizePlayerName } from '@clog/domain';
import type { Credit } from './model.ts';
export function collectorHistory(credits: readonly Credit[]) {
  const groups = new Map<string, Credit[]>();
  for (const credit of credits) {
    const key = JSON.stringify([
      credit.itemId,
      credit.hardcore,
      normalizePlayerName(credit.collectorName),
    ]);
    const rows = groups.get(key) ?? [];
    rows.push(credit);
    groups.set(key, rows);
  }
  return [...groups]
    .map(([key, rows]) => {
      rows.sort(
        (a, b) =>
          a.collectedOn.localeCompare(b.collectedOn) ||
          a.submissionId.localeCompare(b.submissionId),
      );
      return {
        key,
        credits: rows,
        collectorName: rows[0]!.collectorName,
        firstOn: rows[0]!.collectedOn,
        count: rows.length,
      };
    })
    .sort(
      (a, b) =>
        a.firstOn.localeCompare(b.firstOn) || a.key.localeCompare(b.key),
    );
}
