import * as appText from '@clog/domain';
import {
  formatCollectionDate,
  gameModeIcon,
  gameModeLabel,
} from '@clog/domain';
import type { Credit } from './model.ts';
export function CreditLine({
  credit,
  count = 1,
}: {
  credit: Credit;
  count?: number;
}) {
  const icon = gameModeIcon(credit.gameMode ?? null),
    date = formatCollectionDate(credit.collectedOn);
  return (
    <>
      {count > 1
        ? appText.gameModeCreditRepeat(count)
        : appText.gameModeCreditPrefix}
      <span className="collector-name">
        {icon && (
          <img
            className="collector-helmet"
            src={icon}
            alt={gameModeLabel(credit.gameMode ?? null)}
          />
        )}
        <span>{credit.collectorName}</span>
      </span>
      {count > 1
        ? appText.gameModeCreditFirst(date)
        : appText.gameModeCreditOn(date)}
    </>
  );
}
