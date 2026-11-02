import * as appText from '@clog/domain';
import { request } from 'node:http';
export interface InstallationStatus {
  instance: string;
  phase: string;
  database: boolean;
  workers: boolean;
  maintenance: boolean;
  databasePid?: number;
  supervisorPid?: number;
}
export function control(
  operation?: string,
  token?: string,
): Promise<InstallationStatus> {
  return new Promise((resolve, reject) => {
    const body = operation ? JSON.stringify({ operation, token }) : undefined;
    const req = request(
      {
        socketPath: '/run/clog/control.sock',
        path: operation ? '/operation' : '/status',
        method: operation ? 'POST' : 'GET',
        headers: body
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(body),
            }
          : {},
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += String(chunk);
          if (data.length > 8192)
            req.destroy(
              new Error(
                appText.apiInstallationControlInvalidInstallationResponse,
              ),
            );
        });
        res.once('end', () => {
          try {
            if (res.statusCode !== 200)
              throw new Error(
                appText.apiInstallationControlInstallationOperationFailedInspectClogStatusAndTheContainerLog,
              );
            resolve(JSON.parse(data) as InstallationStatus);
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    req.setTimeout(85000, () =>
      req.destroy(
        new Error(appText.apiInstallationControlInstallationOperationTimedOut),
      ),
    );
    req.once('error', reject);
    req.end(body);
  });
}
export async function waitForWebsite() {
  for (let i = 0; i < 60; i++) {
    try {
      const response = await fetch('http://127.0.0.1:8080/readyz', {
        signal: AbortSignal.timeout(1500),
      });
      await response.body?.cancel();
      if (response.ok) return;
    } catch {
      /* Starting/draining. */
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(
    appText.apiInstallationControlWebsiteReadinessDeadlineExpired,
  );
}
