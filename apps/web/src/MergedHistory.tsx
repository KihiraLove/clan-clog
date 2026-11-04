import { collectorHistory } from './collector-history.ts';
import { type Credit } from './model.ts';
import { CreditLine } from './CreditLine.tsx';
export function MergedHistory({ credits }: { credits: readonly Credit[] }) {
  return (
    <>
      {collectorHistory(credits).map((group) => (
        <p key={group.key}>
          <CreditLine credit={group.credits[0]!} count={group.count} />
        </p>
      ))}
    </>
  );
}
