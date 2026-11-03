import * as appText from '@clog/domain';
import { formatCollectionDate } from '@clog/domain';
import { collectorHistory, pageEvent } from './collector-history.ts';
import { creditLine, type Credit } from './model.ts';
export function MergedHistory({
  credits,
  pageId,
}: {
  credits: readonly Credit[];
  pageId?: string | undefined;
}) {
  const label = (credit: Credit) =>
    credit.eventPageAssignmentPending
      ? appText.eventPageLegacyLabel
      : pageEvent(credit, pageId)
        ? appText.webItemMenuFirstEventCollection
        : appText.webItemMenuRegularCollection;
  return (
    <>
      {collectorHistory(credits, pageId).map((group) => (
        <div
          key={group.key}
          className={group.event ? 'item-menu__event' : 'item-menu__regular'}
        >
          <strong>
            {group.event
              ? appText.webItemMenuFirstEventCollection
              : group.legacy
                ? appText.eventPageLegacyLabel
                : appText.webItemMenuRegularCollection}
          </strong>
          <p>
            {group.count === 1
              ? creditLine(group.credits[0]!)
              : appText.repeatCollectorSummary(
                  group.count,
                  group.collectorName,
                  formatCollectionDate(group.firstOn),
                )}
          </p>
          {group.count > 1 && (
            <details>
              <summary>{appText.repeatCollectorHistory}</summary>
              {group.credits.map((credit) => (
                <p key={credit.submissionId}>
                  {appText.repeatCollectorHistoryDate(
                    label(credit),
                    formatCollectionDate(credit.collectedOn),
                  )}
                </p>
              ))}
            </details>
          )}
        </div>
      ))}
    </>
  );
}
