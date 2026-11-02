/** Credential transport is loaded with staff sign-in, outside the public entry. */
import { AdminRequestError } from './admin-api.ts';
import { authRetrySeconds } from './auth-retry.ts';

export async function login(
  request: typeof fetch,
  username: string,
  password: string,
  signal: AbortSignal,
) {
  const response = await request('/api/v1/auth/login', {
    method: 'POST',
    signal,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok)
    throw new AdminRequestError(
      response.status,
      undefined,
      response.status === 429
        ? (authRetrySeconds(response.headers.get('Retry-After')) ?? 60)
        : undefined,
    );
}
