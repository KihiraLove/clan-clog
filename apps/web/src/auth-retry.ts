/** Authentication endpoints emit bounded delta-seconds, not an untrusted date. */
export function authRetrySeconds(value: string | null): number | undefined {
  if (value === null || !/^\d{1,2}$/u.test(value)) return undefined;
  const seconds = Number(value);
  return seconds >= 1 && seconds <= 60 ? seconds : undefined;
}
