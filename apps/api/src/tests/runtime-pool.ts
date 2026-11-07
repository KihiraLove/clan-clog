import { createHash } from 'node:crypto';
import pg from 'pg';
import {
  provisionRuntimeRole,
  runtimeRole,
} from '@clog/database/dist/runtime-role.js';

export async function createRuntimeTestPool(ownerUrl: URL, max?: number) {
  const connectionString = process.env.TEST_DATABASE_URL;
  if (!connectionString) throw new Error('Disposable test database required');
  const password = createHash('sha256')
    .update('clog-api-test-runtime\0')
    .update(ownerUrl.password)
    .digest('hex');

  // The role is cluster-wide, so coordinate through the shared test database.
  const coordinator = new pg.Client({ connectionString });
  await coordinator.connect();
  try {
    await coordinator.query(
      "SELECT pg_advisory_lock(hashtext('clog-api-test-runtime'))",
    );
    await provisionRuntimeRole(ownerUrl.href, password);
  } finally {
    await coordinator.end();
  }

  const runtimeUrl = new URL(ownerUrl);
  runtimeUrl.username = runtimeRole;
  runtimeUrl.password = password;
  return new pg.Pool({ connectionString: runtimeUrl.href, max });
}
