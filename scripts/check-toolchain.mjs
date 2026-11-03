/** The declared acceptance inputs are shared by the host, container and workflow. */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { artifactPolicy } from './check-artifacts.mjs';

export const toolchain = JSON.parse(
  await readFile(new URL('./check-toolchain.json', import.meta.url), 'utf8'),
);

export function supportedVersion(value, policy) {
  const version = /(?:^|\s|v)(\d+)\.(\d+)\.(\d+)(?:\D|$)/u.exec(value ?? '');
  if (!version) return false;
  const parts = version.slice(1, 4).map(Number);
  const min = policy.min.split('.').map(Number);
  const firstDifference = parts.findIndex((part, i) => part !== min[i]);
  return (
    parts[0] <= policy.maxMajor &&
    (firstDifference === -1 || parts[firstDifference] > min[firstDifference])
  );
}

export function replayOptions(args) {
  const options = {
    ref: undefined,
    cache: 'normal',
    profile: 'normal',
    scope: 'acceptance',
    repeat: 3,
    seed: 126,
  };
  const keys = {
    '--ref': 'ref',
    '--cache': 'cache',
    '--profile': 'profile',
    '--scope': 'scope',
    '--repeat': 'repeat',
    '--seed': 'seed',
  };
  for (let i = 0; i < args.length; i += 2) {
    const key = Object.hasOwn(keys, args[i]) ? keys[args[i]] : undefined,
      value = args[i + 1];
    if (!key || !value) throw Error('Unknown arguments; use --help');
    options[key] = ['repeat', 'seed'].includes(key) ? Number(value) : value;
  }
  if (
    !['normal', 'cold'].includes(options.cache) ||
    !Object.hasOwn(toolchain.profiles, options.profile) ||
    !['acceptance', 'catalog'].includes(options.scope) ||
    !Number.isSafeInteger(options.repeat) ||
    options.repeat < 1 ||
    options.repeat > 10 ||
    !Number.isSafeInteger(options.seed) ||
    options.seed < 0 ||
    options.seed > 2147483647 ||
    options.ref?.startsWith('-')
  )
    throw Error('Invalid replay configuration; use --help');
  return options;
}

export const resourceArgs = ({ cpus, memory, shm }) => [
  ...(cpus !== '0' ? ['--cpus', cpus] : []),
  ...(memory !== '0' ? ['--memory', memory] : []),
  ...(shm ? ['--shm-size', shm] : []),
];

export function applicationLimits(env = process.env) {
  const name = env.CHECK_PROFILE ?? 'normal';
  const profile = Object.hasOwn(toolchain.profiles, name)
    ? toolchain.profiles[name]
    : undefined;
  if (!profile) throw Error('Unknown disposable resource profile');
  return {
    cpus: Number(profile.application.cpus),
    mem_limit: profile.application.memory,
  };
}

export async function checkToolchain(
  root = fileURLToPath(new URL('../', import.meta.url)),
) {
  const read = (name) => readFile(path.join(root, name), 'utf8');
  const [dockerfile, nvmrc, workflow, web, ...browsers] = await Promise.all([
    read('Dockerfile'),
    read('.nvmrc'),
    read('.github/workflows/ci.yml'),
    read('apps/web/package.json'),
    ...['', '.loading', '.security', '.stack'].map((name) =>
      read(`apps/web/playwright${name}.config.ts`),
    ),
  ]);
  const failures = [];
  const stages = new Set(),
    allowedImages = new Set(Object.values(toolchain.images));
  for (const [, image, stage] of dockerfile.matchAll(
    /^FROM\s+(\S+)(?:\s+AS\s+(\S+))?/gimu,
  )) {
    if (image !== 'scratch' && !stages.has(image) && !allowedImages.has(image))
      failures.push('Dockerfile image specification drift');
    if (stage) stages.add(stage);
  }
  for (const image of Object.values(toolchain.images)) {
    if (!/@sha256:[a-f0-9]{64}$/u.test(image) || !dockerfile.includes(image))
      failures.push('Dockerfile image specification drift');
  }
  if (nvmrc.trim() !== toolchain.node) failures.push('Host Node version drift');
  if (!dockerfile.includes(`ARG APT_SNAPSHOT=${toolchain.aptSnapshot}`))
    failures.push('APT snapshot drift');
  if (
    !workflow.includes(`runs-on: ${toolchain.hostedRunner}`) ||
    !workflow.includes('node scripts/check-local.mjs --ref HEAD') ||
    [...workflow.matchAll(/retention-days: (\d+)/gu)].length !== 2 ||
    [...workflow.matchAll(/retention-days: (\d+)/gu)].some(
      (match) => Number(match[1]) !== artifactPolicy.retentionDays,
    )
  )
    failures.push('Hosted acceptance configuration drift');
  if (
    JSON.parse(web).devDependencies['@playwright/test'] !==
    /:v([^@-]+)/u.exec(toolchain.images.playwright)?.[1]
  )
    failures.push('Playwright image/package version drift');
  for (const browser of browsers)
    if (
      (browser.match(/scripts\/check-browser-policy\.mjs/gu) ?? []).length !== 1
    )
      failures.push('Missing or duplicate browser policy reporter');
  if (failures.length) throw Error([...new Set(failures)].join('; '));
}
