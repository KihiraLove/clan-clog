import * as appText from '@clog/domain';
/** One-shot container initialization: additive migrations, then the pinned first import. */
import { migrate } from './migrate.js';
import { importBundledCatalog } from './catalog-import.js';
import { applyBundledClueTaxonomy } from './clue-taxonomy.js';
import { databaseUrl, readSecret } from './secrets.js';
import {
  provisionRuntimeRole,
  validateRuntimePassword,
} from './runtime-role.js';
const url = databaseUrl();
if (!url) throw new Error(appText.databaseBootstrapDatabaseUrlIsRequired);
const runtimePassword = validateRuntimePassword(readSecret('APP_DB_PASSWORD'));
await migrate(url);
console.log(
  appText.databaseBootstrapDatabaseMigrationsAppliedCatalog(
    await importBundledCatalog(url),
  ),
);

console.log(
  appText.databaseBootstrapClueTaxonomy(await applyBundledClueTaxonomy(url)),
);
await provisionRuntimeRole(url, runtimePassword);
console.log(appText.databaseBootstrapRestrictedDatabaseRuntimeRoleReady);
