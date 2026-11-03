/** Bounded investigation, using the normal browser config and strict result policy. */
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { acceptance } from './check-browser-results.mjs';
import { replayOptions } from './check-toolchain.mjs';

const options = replayOptions([
  '--scope',
  'catalog',
  '--repeat',
  process.env.CHECK_REPEAT ?? '3',
  '--seed',
  process.env.CHECK_SEED ?? '126',
]);
const child = spawn(
  process.execPath,
  [
    '../../node_modules/@playwright/test/cli.js',
    'test',
    'tests/admin.spec.ts',
    'tests/catalog-updates.spec.ts',
    '--grep',
    'manual item creation|page candidate selection|icons-only reviews omit|acceptance scheduling:',
    '--repeat-each',
    String(options.repeat),
    '--trace',
    'on',
    '--output',
    'test-results/catalog',
    '--reporter',
    'list,json,../../scripts/check-browser-policy.mjs',
  ],
  {
    cwd: 'apps/web',
    env: {
      ...process.env,
      CI: 'true',
      CHECK_BROWSER_SUITE: 'catalog',
      CHECK_SEED: String(options.seed),
      PLAYWRIGHT_JSON_OUTPUT_NAME:
        '../../.data/local-checks/catalog-report.json',
    },
    stdio: 'inherit',
  },
);
const stop = () => child.kill('SIGTERM');
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
try {
  const code = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', resolve);
  });
  const result = acceptance(
    JSON.parse(
      await readFile('.data/local-checks/catalog-report.json', 'utf8'),
    ),
  );
  if (code !== 0)
    throw Error('Catalog replay failed; every first attempt must pass');
  console.log(
    JSON.stringify({
      scope: 'catalog-investigation-only',
      seed: options.seed,
      repeat: options.repeat,
      ...result,
    }),
  );
} finally {
  process.off('SIGINT', stop);
  process.off('SIGTERM', stop);
}
