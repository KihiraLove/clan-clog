import * as appText from '@clog/domain';
import { formatCollectionDate } from '@clog/domain';
import { CollectorName } from './CollectorName.tsx';
import type { Credit } from './model.ts';
export function CreditLine({
  credit,
  count = 1,
}: {
  credit: Credit;
  count?: number;
}) {
  const date = formatCollectionDate(credit.collectedOn);
  return (
    <>
      {count > 1
        ? appText.gameModeCreditRepeat(count)
        : appText.gameModeCreditPrefix}
      <CollectorName
        name={credit.collectorName}
        gameMode={credit.gameMode ?? null}
      />
      {count > 1
        ? appText.gameModeCreditFirst(date)
        : appText.gameModeCreditOn(date)}
    </>
  );
}
