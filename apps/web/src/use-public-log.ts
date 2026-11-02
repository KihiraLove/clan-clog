import * as appText from '@clog/domain';
/** Shared visibility cadence, independent conditional pair and retained last-good data. */
import { useCallback, useMemo } from 'react';
import { LogUnavailable, PublicLogClient } from './api.ts';
import { usePublicPolling } from './use-public-polling.ts';
export function usePublicLog() {
  const client = useMemo(() => new PublicLogClient(), []);
  const read = useCallback(
    (signal: AbortSignal) => client.load(signal),
    [client],
  );
  return usePublicPolling(read, (failure) =>
    failure instanceof LogUnavailable &&
    [404, 501, 503].includes(failure.status)
      ? appText.webUsePublicLogTheClanCollectionLogIsNotAvailableYet
      : appText.webUsePublicLogCouldNotRefreshTheClanCollectionLogTryAgainShortly,
  );
}
