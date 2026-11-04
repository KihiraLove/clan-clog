import * as appText from '@clog/domain';
import { formatCollectionDate } from '@clog/domain';
import { collectorHistory } from './collector-history.ts';
import { creditLine, type Credit } from './model.ts';
export function MergedHistory({ credits }: { credits: readonly Credit[] }) {
  return (
    <>
      {collectorHistory(credits).map((group) => (
        <p key={group.key}>
          {group.count === 1
            ? creditLine(group.credits[0]!)
            : appText.repeatCollectorSummary(
                group.count,
                group.collectorName,
                formatCollectionDate(group.firstOn),
              )}
        </p>
      ))}
    </>
  );
}
