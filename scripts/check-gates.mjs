/** Run independent acceptance stages to completion, retaining failures and prerequisites. */
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { finished } from 'node:stream/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { sha256 } from './check-source.mjs';
import { toolchain, checkToolchain } from './check-toolchain.mjs';
import { containerEnvironment } from './check-environment.mjs';

export function checkPlan(env) {
  const gates = [];
  const add = (name, command, needs = [], group, nodeTests = false) =>
    gates.push({
      name,
      command,
      needs,
      group,
      nodeTests,
      evidenceClass:
        name === 'dependencies' ? 'live-network' : 'reproducible-inputs',
    });
  const npm = (name, script, needs = [], workspace, group = 'validate') =>
    add(
      name,
      [
        'npm',
        'run',
        script,
        ...(workspace ? ['-w', '@clog/' + workspace] : []),
      ],
      needs,
      group,
      script === 'test',
    );
  add('toolchain', ['node', 'scripts/check-toolchain-cli.mjs']);
  add('workflows', [
    'bash',
    '-c',
    'actionlint -config-file .github/actionlint.yaml .github/workflows/*.yml',
  ]);
  add('supervisor', [
    'bash',
    '-c',
    'shellcheck -x infra/*.sh infra/clog scripts/check-container.sh scripts/compose-smoke.sh scripts/check-apt-snapshot.sh',
  ]);
  add('tools', ['npm', 'run', 'test:tools'], [], undefined, true);
  add('dependencies', ['node', 'scripts/check-dependencies.mjs']);
  npm('format', 'format:check');
  npm('lint', 'lint');
  const dependencies = {
    domain: [],
    database: ['domain'],
    bot: ['domain'],
    api: ['domain', 'database'],
    web: ['domain'],
  };
  for (const [workspace, upstream] of Object.entries(dependencies))
    npm(
      'build-' + workspace,
      'build',
      upstream.map((name) => 'build-' + name),
      workspace,
    );
  npm('catalog', 'catalog:check', ['build-database']);
  for (const workspace of ['api', 'bot', 'web', 'database', 'domain']) {
    const needs =
      workspace === 'web' ? ['build-domain'] : ['build-' + workspace];
    npm(
      'typecheck-' + workspace,
      'typecheck',
      dependencies[workspace].map((name) => 'build-' + name),
      workspace,
    );
    npm('test-' + workspace, 'test', needs, workspace);
  }
  npm('docs', 'check:docs');
  add(
    'workloads',
    ['node', 'scripts/benchmark-workloads.mjs'],
    ['build-api', 'build-bot'],
  );
  add(
    'projections',
    [
      'env',
      'PROJECTION_BENCH_DISPOSABLE=true',
      'node',
      'scripts/benchmark-projections.mjs',
    ],
    ['build-api'],
  );
  npm('browser', 'test:e2e', ['build-domain'], 'web', 'browser');
  npm('loading', 'test:loading', ['build-web'], 'web', 'loading');
  // Build failures belong in the stage report, not in the host's prerequisites.
  add('app-image', [
    'node',
    'scripts/check-app-image.mjs',
    'buildx',
    'build',
    '--load',
    '--platform',
    toolchain.platform,
    '--metadata-file',
    '.data/local-checks/app-build.json',
    ...(env.CHECK_COLD_CACHE === '1' ? ['--no-cache'] : []),
    '--target',
    'app',
    '--build-arg',
    `RELEASE_REVISION=${env.CHECK_REVISION}`,
    '--tag',
    env.CHECK_APP_IMAGE,
    '-',
  ]);
  const smoke = (name, needs) =>
    add(name, ['bash', 'scripts/compose-smoke.sh', name], needs, 'smoke');
  smoke('compose-config', []);
  smoke('traefik', []);
  smoke('runtime-image', ['app-image']);
  add(
    'app-up',
    [
      'docker',
      'compose',
      'up',
      '-d',
      '--wait',
      '--wait-timeout',
      '180',
      'clan-clog',
    ],
    ['app-image', 'compose-config'],
    'smoke',
  );
  for (const name of [
    'startup',
    'permissions',
    'competitions',
    'review',
    'projections-proxy',
    'branding-proxy',
  ])
    smoke(name, ['app-up']);
  add(
    'security',
    [
      'env',
      'SECURITY_PROXY_TEST=1',
      'npm',
      'run',
      'test:security',
      '-w',
      '@clog/web',
    ],
    ['app-up'],
    'smoke',
  );
  add(
    'stack',
    [
      'env',
      'STACK_BROWSER_TEST=1',
      'npm',
      'run',
      'test:stack',
      '-w',
      '@clog/web',
    ],
    ['app-up'],
    'smoke',
  );
  for (const name of [
    'preview-maintenance',
    'catalog-proxy',
    'asset-maintenance',
    'lifecycle',
    'database-recovery',
    'availability',
  ])
    smoke(name, ['app-up', ...(name === 'lifecycle' ? ['competitions'] : [])]);
  add(
    'installation',
    ['node', 'scripts/installation-smoke.mjs'],
    ['app-image'],
    'smoke',
  );
  add(
    'recovery',
    ['node', 'scripts/recovery-drill.mjs'],
    ['app-image', 'competitions', 'catalog-proxy', 'branding-proxy', 'review'],
    'smoke',
  );
  add('browser-results', ['node', 'scripts/check-browser-results.mjs']);
  // Never issue release acceptance if an earlier gate failed or could not run.
  add(
    'release-results',
    ['node', 'scripts/check-release-results.mjs'],
    gates.map(({ name }) => name),
  );
  if (env.CHECK_SCOPE === 'catalog')
    return [
      ...gates.filter(({ name }) =>
        ['toolchain', 'build-domain'].includes(name),
      ),
      {
        name: 'catalog',
        command: ['node', 'scripts/check-catalog-replay.mjs'],
        needs: ['build-domain'],
        group: 'browser',
      },
    ];
  return gates;
}

export function planFingerprint(gates) {
  return sha256(
    JSON.stringify(
      gates.map((gate) => ({
        ...gate,
        command: gate.command
          .map((arg) =>
            arg.startsWith('RELEASE_REVISION=')
              ? 'RELEASE_REVISION=<revision>'
              : /^clog-local-app:/u.test(arg)
                ? '<application-image>'
                : arg,
          )
          .filter((arg) => arg !== '--no-cache'),
      })),
    ),
  );
}

export async function runGates(
  gates,
  {
    cwd = process.cwd(),
    output = path.join(cwd, '.data/local-checks'),
    env = process.env,
    signal,
    write = (chunk) => process.stdout.write(chunk),
  } = {},
) {
  if (!gates.length) throw Error('At least one check stage is required');
  const names = new Set();
  for (const gate of gates) {
    if (
      !/^[a-z0-9-]+$/u.test(gate.name) ||
      names.has(gate.name) ||
      gate.needs?.some((name) => !names.has(name)) ||
      (gate.group && !/^[a-z0-9-]+$/u.test(gate.group)) ||
      !gate.command?.length ||
      gate.command.some((arg) => typeof arg !== 'string')
    )
      throw Error('Invalid or unordered check stage: ' + gate.name);
    names.add(gate.name);
  }
  await mkdir(output, { recursive: true });
  for (const group of new Set(gates.map(({ group }) => group).filter(Boolean)))
    await writeFile(path.join(output, group + '.log'), '');
  const report = {
    format: 1,
    planFingerprint: planFingerprint(gates),
    status: 'running',
    startedAt: new Date().toISOString(),
    gates: gates.map(({ name, command, evidenceClass }) => ({
      name,
      command,
      evidenceClass: evidenceClass ?? 'reproducible-inputs',
      status: 'pending',
      log: name + '.log',
    })),
  };
  const save = async () => {
    await writeFile(
      path.join(output, 'gates.json.tmp'),
      JSON.stringify(report, null, 2) + '\n',
    );
    await rename(
      path.join(output, 'gates.json.tmp'),
      path.join(output, 'gates.json'),
    );
  };
  await save();
  for (const gate of gates) {
    const blockedBy = (gate.needs ?? []).filter(
      (name) =>
        report.gates.find((value) => value.name === name)?.status !== 'passed',
    );
    const result = report.gates.find(({ name }) => name === gate.name);
    result.status = 'running';
    result.startedAt = new Date().toISOString();
    const log = createWriteStream(path.join(output, result.log));
    const group =
      gate.group && gate.group !== gate.name
        ? createWriteStream(path.join(output, gate.group + '.log'), {
            flags: 'a',
          })
        : undefined;
    const emit = (chunk) => {
      log.write(chunk);
      group?.write(chunk);
      write(chunk);
    };
    const started = Date.now();
    try {
      if (signal?.aborted || blockedBy.length) {
        result.status = 'blocked';
        result.reason = signal?.aborted
          ? 'Run interrupted'
          : 'Requires passing stages: ' + blockedBy.join(', ');
        emit(`\nBLOCKED ${gate.name}: ${result.reason}\n`);
      } else {
        emit(`\nRUNNING ${gate.name}\n`);
        await save();
        const outcome = await new Promise((resolve) => {
          const child = spawn(gate.command[0], gate.command.slice(1), {
            cwd,
            env,
            signal,
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'pipe'],
          });
          let error;
          child.stdout.on('data', emit);
          child.stderr.on('data', emit);
          child.on('error', (value) => {
            error = value.message;
          });
          child.on('close', (code, termination) =>
            resolve({ code, signal: termination, ...(error ? { error } : {}) }),
          );
        });
        Object.assign(result, outcome);
        result.status = signal?.aborted
          ? 'interrupted'
          : outcome.code === 0
            ? 'passed'
            : 'failed';
      }
    } finally {
      log.end();
      if (group) group.end();
      await Promise.all([finished(log), ...(group ? [finished(group)] : [])]);
    }
    const text = await readFile(path.join(output, result.log), 'utf8');
    if (
      result.status === 'passed' &&
      gate.nodeTests &&
      /(?:ℹ|#) (?:skipped|todo|cancelled) [1-9]/u.test(text)
    ) {
      result.status = 'failed';
      result.reason =
        'Full validation must not skip, cancel or leave TODO tests.';
    }
    if (result.status === 'failed')
      result.failureLines = text
        .split(/\r?\n/u)
        .filter((line) =>
          /^\s*(?:✖|not ok\b|Error:|AssertionError)/u.test(line),
        )
        .slice(0, 20);
    result.durationMs = Date.now() - started;
    write(
      `${result.status.toUpperCase()} ${gate.name}${result.reason ? ': ' + result.reason : ''}\n`,
    );
    await save();
  }
  report.status = signal?.aborted
    ? 'interrupted'
    : report.gates.every(({ status }) => status === 'passed')
      ? 'passed'
      : 'failed';
  report.finishedAt = new Date().toISOString();
  await save();
  return report;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  if (
    !process.env.TEST_DATABASE_URL ||
    !/^clog-checks-[a-z0-9-]+$/u.test(process.env.COMPOSE_PROJECT_NAME ?? '') ||
    !process.env.CHECK_APP_IMAGE
  )
    throw Error('Use the disposable local acceptance runner');
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  try {
    await mkdir('.data/local-checks', { recursive: true });
    await writeFile(
      '.data/local-checks/container-environment.json',
      JSON.stringify(await containerEnvironment(process.cwd()), null, 2) + '\n',
    );
    await checkToolchain();
    if (process.versions.node !== toolchain.node)
      throw Error('Container Node toolchain mismatch');
    const result = await runGates(checkPlan(process.env), {
      signal: controller.signal,
    });
    const failed = result.gates.filter(({ status }) => status !== 'passed');
    console.log(
      failed.length
        ? `\nChecks failed/blocked: ${failed.map(({ name }) => name).join(', ')}. See gates.json and the per-stage logs.`
        : '\nAll local gates passed.',
    );
    process.exitCode = result.status === 'passed' ? 0 : 1;
  } finally {
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
  }
}
