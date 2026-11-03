/** Compare recorded inputs; missing evidence is never proof of equivalence. */
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const get = (value, key) =>
  key.split('.').reduce((item, part) => item?.[part], value);
const incomplete = (value) =>
  value == null ||
  value?.unavailable === true ||
  (value && typeof value === 'object' && Object.values(value).some(incomplete));
export function compareManifests(left, right) {
  const matching = [],
    materialDifferences = [],
    environmentDifferences = [],
    missingEvidence = [];
  const compare = (key, material = true) => {
    const a = get(left, key),
      b = get(right, key);
    if (
      a === undefined ||
      b === undefined ||
      a?.unavailable ||
      b?.unavailable ||
      (material && (incomplete(a) || incomplete(b)))
    )
      missingEvidence.push(key);
    else if (JSON.stringify(a) === JSON.stringify(b)) matching.push(key);
    else
      (material ? materialDifferences : environmentDifferences).push({
        field: key,
        left: a,
        right: b,
      });
  };
  for (const key of [
    'format',
    'source.fingerprint',
    'source.lockfileSha256',
    'toolchain',
    'driver',
    'gatePlanFingerprint',
    'options.scope',
    'options.profile',
    'options.repeat',
    'options.seed',
    'container.environment.node',
    'container.environment.npm',
    'container.packages',
    'container.browserTooling',
    'browserPolicy',
    'images.runnerBuild.materials',
    ...(left.options?.scope === 'acceptance' ||
    right.options?.scope === 'acceptance'
      ? ['images.appBuild.materials', 'applicationPackages']
      : []),
  ])
    compare(key);
  for (const key of [
    'source.revision',
    'source.mode',
    'options.cache',
    'host',
    'container.environment.os',
    'container.environment.resources',
    'container.environment.docker',
  ])
    compare(key, false);
  if (left.format !== 1 || right.format !== 1)
    missingEvidence.push('supported manifest format');
  return {
    format: 1,
    leftRun: left.runId,
    rightRun: right.runId,
    comparableInputs: missingEvidence.length
      ? null
      : materialDifferences.length === 0,
    matching,
    materialDifferences,
    environmentDifferences,
    missingEvidence,
    liveEvidence:
      'Advisory/registry and external network results are fresh evidence; compare dependencies.json timestamps/findings separately. Equal inputs do not guarantee identical scheduling.',
  };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 4)
    throw Error(
      'Usage: node scripts/check-compare.mjs <run-or-manifest> <run-or-manifest>',
    );
  const manifests = await Promise.all(
    process.argv
      .slice(2)
      .map(async (name) =>
        JSON.parse(
          await readFile(
            (await stat(name)).isDirectory()
              ? path.join(name, 'manifest.json')
              : name,
            'utf8',
          ),
        ),
      ),
  );
  console.log(JSON.stringify(compareManifests(...manifests), null, 2));
}
