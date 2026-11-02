/** One shared fixed-window policy for all credential verification routes. */
import { createHash } from 'node:crypto';
import { isIP } from 'node:net';

export const authPolicy = {
  windowSeconds: 60,
  source: 20,
  identity: 5,
  account: 5,
  maxBuckets: 10000,
  cleanupBatch: 64,
} as const;
export type AuthScope = 'source' | 'identity' | 'account';
export type AuthAttempt =
  { sourceHash: string; username: string } | { accountId: string };
export type AuthAdmission =
  | { allowed: true }
  | {
      allowed: false;
      scope: AuthScope | 'capacity';
      retryAfterSeconds: number;
    };

/** Canonicalize equivalent trusted socket/proxy addresses before hashing. */
export function loginSourceHash(address: string) {
  let canonical = address;
  if (isIP(address) === 6) {
    canonical = new URL(
      'http://[' + address.split('%')[0] + ']',
    ).hostname.slice(1, -1);
    const mapped = /^::ffff:([a-f\d]{1,4}):([a-f\d]{1,4})$/u.exec(canonical);
    if (mapped) {
      const value = parseInt(mapped[1]!, 16) * 65536 + parseInt(mapped[2]!, 16);
      canonical = [24, 16, 8, 0]
        .map((shift) => (value >>> shift) & 255)
        .join('.');
    }
  } else if (isIP(address) !== 4) {
    // Fail closed instead of accepting an unvalidated forwarding identifier.
    throw new TypeError();
  }
  return createHash('sha256').update(canonical).digest('hex');
}
