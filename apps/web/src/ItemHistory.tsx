/** Load hover history on interaction; a failed chunk must not unmount the log. */
import { lazy, Suspense, type ComponentProps } from 'react';
import * as appText from '@clog/domain';
import { RenderBoundary } from './RenderBoundary.tsx';
export type { OpenItem } from './ItemMenu.tsx';
const Menu = lazy(() =>
  import('./ItemMenu.tsx').then((module) => ({ default: module.ItemMenu })),
);
export function ItemMenu(props: ComponentProps<typeof Menu>) {
  return (
    <RenderBoundary
      fallback={
        <p role="alert">
          {appText.eventHistoryUnavailable}
          <button type="button" onClick={() => window.location.reload()}>
            {appText.webCollectionLogRetry}
          </button>
        </p>
      }
    >
      <Suspense fallback={<p role="status">{appText.eventHistoryLoading}</p>}>
        <Menu {...props} />
      </Suspense>
    </RenderBoundary>
  );
}
