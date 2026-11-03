/** Load hover history on interaction; a failed chunk must not unmount the log. */
import {
  Component,
  lazy,
  Suspense,
  type ComponentProps,
  type ReactNode,
} from 'react';
import * as appText from '@clog/domain';
export type { OpenItem } from './ItemMenu.tsx';
const Menu = lazy(() =>
  import('./ItemMenu.tsx').then((module) => ({ default: module.ItemMenu })),
);
class HistoryBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p role="alert">
        {appText.eventHistoryUnavailable}
        <button type="button" onClick={() => window.location.reload()}>
          {appText.webCollectionLogRetry}
        </button>
      </p>
    ) : (
      this.props.children
    );
  }
}
export function ItemMenu(props: ComponentProps<typeof Menu>) {
  return (
    <HistoryBoundary>
      <Suspense fallback={<p role="status">{appText.eventHistoryLoading}</p>}>
        <Menu {...props} />
      </Suspense>
    </HistoryBoundary>
  );
}
