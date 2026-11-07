/** Full Linux acceptance on a local Docker engine, including on Windows/macOS. */
import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { consoleSummary, writeRunReport } from './check-report.mjs';
import { captureSource, sha256 } from './check-source.mjs';
import {
  buildEvidence,
  collectEnvironment,
  containerEvidence,
  imageEvidence,
  saveManifest,
} from './check-environment.mjs';
import {
  replayOptions,
  resourceArgs,
  supportedVersion,
  toolchain,
} from './check-toolchain.mjs';
import { browserEvidence, prepareArtifacts } from './check-artifacts.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const label = 'clog.local-checks';

export function configuration(id, password = randomBytes(32).toString('hex')) {
  if (!/^clog-checks-[a-z0-9-]+$/.test(id))
    throw new Error('Invalid disposable project name');
  return {
    id,
    network: `${id}-network`,
    database: `${id}-database`,
    runner: `${id}-runner`,
    runnerImage: `clog-local-checks:${id}`,
    appImage: `clog-local-app:${id}`,
    env: {
      COMPOSE_PROJECT_NAME: id,
      COMPOSE_DISABLE_ENV_FILE: 'true',
      COMPOSE_PROFILES: '',
      BUILDX_METADATA_PROVENANCE: 'max',
      CHECK_NETWORK: `${id}-network`,
      CHECK_APP_IMAGE: `clog-local-app:${id}`,
      IMAGE_TAG: id,
      POSTGRES_PASSWORD: password,
      APP_DB_PASSWORD: randomBytes(32).toString('hex'),
      AUTH_ENABLED: 'true',
      PUBLIC_ORIGIN: 'https://clog.example.com',
      SESSION_SECRET: randomBytes(32).toString('hex'),
      ADMIN_BOOTSTRAP_PASSWORD: randomBytes(32).toString('hex'),
      BOT_ENABLED: 'false',
      BOT_SETTINGS_MODE: 'environment',
      BOT_API_TOKEN: '',
      DISCORD_BOT_TOKEN: '',
      DISCORD_APPLICATION_ID: '',
      DISCORD_GUILD_ID: '',
      DISCORD_TEST_GUILD_ID: '',
      TRUSTED_PROXY_CIDRS: '',
      TEST_DATABASE_URL: `postgresql://clog:${password}@${id}-database:5432/clog_test`,
    },
  };
}

export async function main(args = process.argv.slice(2)) {
  if (args.includes('--help')) {
    console.log(
      'Usage: node scripts/check-local.mjs [--ref <commit-or-ref>] [--cache normal|cold] [--profile normal|constrained] [--scope acceptance|catalog] [--repeat 1..10] [--seed 0..2147483647]\nRequires the declared Node runtime and a supported Linux Docker engine. Default: full working-tree acceptance. Catalog scope is investigation evidence only.',
    );
    return;
  }
  const options = replayOptions(args);
  const config = configuration(
    `clog-checks-${Date.now()}-${randomBytes(4).toString('hex')}`,
  );
  const output = path.join(root, '.data', 'local-checks', config.id);
  await mkdir(output, { recursive: true });
  const temporary = await mkdtemp(path.join(tmpdir(), 'clog-check-source-'));
  const emptyEnv = path.join(output, 'empty.env');
  await writeFile(emptyEnv, '');
  const log = createWriteStream(path.join(output, 'run.log'));
  let active;
  let interrupted = false;
  let runnerCreated = false;
  let networkCreated = false;
  let databaseCreated = false;
  let status = 'failed';
  const cleanupErrors = [];
  const evidenceErrors = [];
  const env = {
    ...process.env,
    ...config.env,
    COMPOSE_ENV_FILES: emptyEnv,
    BUILDX_METADATA_PROVENANCE: 'max',
  };
  let commandRoot = root;
  const manifest = {
    format: 1,
    runId: config.id,
    startedAt: new Date().toISOString(),
    options,
    toolchain,
    driver: {
      format: 1,
      entrySha256: sha256(await readFile(fileURLToPath(import.meta.url))),
      modules: Object.fromEntries(
        await Promise.all(
          [
            'check-local.mjs',
            'check-source.mjs',
            'check-environment.mjs',
            'check-toolchain.mjs',
            'check-toolchain.json',
            'check-artifacts.mjs',
            'check-report.mjs',
          ].map(async (name) => [
            name,
            sha256(await readFile(new URL(name, import.meta.url))),
          ]),
        ),
      ),
    },
    ...(process.env.GITHUB_ACTIONS === 'true'
      ? {
          github: {
            runId: process.env.GITHUB_RUN_ID,
            attempt: process.env.GITHUB_RUN_ATTEMPT,
            revision: process.env.GITHUB_SHA,
          },
        }
      : {}),
    hostCommands: [],
  };
  let phase = 'setup';
  const compose = [
    'compose',
    '--project-name',
    config.id,
    '--env-file',
    emptyEnv,
    '-f',
    'compose.yaml',
    '-f',
    'compose.checks.yaml',
  ];
  function run(command, commandArgs, settings = {}) {
    const {
      quiet = false,
      input,
      raw = false,
    } = typeof settings === 'boolean' ? { quiet: settings } : settings;
    const started = Date.now(),
      commandPhase = phase;
    return new Promise((resolve, reject) => {
      const child = spawn(command, commandArgs, {
        cwd: commandRoot,
        env,
        windowsHide: true,
        stdio: [input ? 'pipe' : 'ignore', 'pipe', 'pipe'],
      });
      active = child;
      if (input) {
        child.stdin.on('error', () => {});
        const stream = createReadStream(input);
        stream.on('error', reject);
        stream.pipe(child.stdin);
        child.once('close', () => stream.destroy());
      }
      let stdout = '';
      child.stdout.on('data', (chunk) => {
        stdout += chunk;
        if (!quiet) {
          process.stdout.write(chunk);
          log.write(chunk);
        }
      });
      child.stderr.on('data', (chunk) => {
        if (!quiet) {
          process.stderr.write(chunk);
          log.write(chunk);
        }
      });
      child.on('error', reject);
      child.on('close', (code) => {
        manifest.hostCommands.push({
          phase: commandPhase,
          tool: command,
          operation: commandArgs[0],
          code,
          durationMs: Date.now() - started,
        });
        if (active === child) active = undefined;
        if (code !== 0)
          reject(
            new Error(
              `${command} ${commandArgs[0]} failed (${code}); see ${output}`,
            ),
          );
        else resolve(raw ? stdout : stdout.trim());
      });
    });
  }
  const docker = (args, quiet) => run('docker', args, quiet);
  const cleanup = async (description, action) => {
    try {
      await action();
    } catch (error) {
      cleanupErrors.push(description);
      console.error(`${description}: ${error.message}`);
    }
  };
  const owned = async (kind, name) => {
    const args =
      kind === 'network'
        ? [
            'network',
            'inspect',
            '--format',
            `{{index .Labels "${label}"}}`,
            name,
          ]
        : ['inspect', '--format', `{{index .Config.Labels "${label}"}}`, name];
    if ((await docker(args, true)) !== config.id)
      throw new Error(`Ownership mismatch for ${name}`);
  };
  const interrupt = () => {
    if (interrupted) return;
    interrupted = true;
    if (runnerCreated) {
      // Stop only our container; its attached docker process then exits and runs finally.
      void docker(['stop', '--time', '10', config.runner], true).catch(() =>
        active?.kill(),
      );
    } else active?.kill();
  };
  process.on('SIGINT', interrupt);
  process.on('SIGTERM', interrupt);
  let failure;
  let revision = 'unavailable';
  try {
    manifest.host = await collectEnvironment(root);
    await saveManifest(output, manifest);
    if (process.versions.node !== toolchain.node)
      throw Error(`Use Node ${toolchain.node} for acceptance`);
    if ((await docker(['info', '--format', '{{.OSType}}'], true)) !== 'linux')
      throw new Error(
        'Start Docker with Linux containers before running the full checks.',
      );
    for (const [name, [value, command]] of Object.entries({
      docker: [manifest.host.docker.server.Version, 'docker version'],
      compose: [manifest.host.docker.compose, 'docker compose version --short'],
      buildx: [manifest.host.docker.buildx, 'docker buildx version'],
    })) {
      if (typeof value !== 'string')
        throw Error(
          `Could not detect the ${name} version. Run "${command}" in the same shell to diagnose.`,
        );
      const policy = toolchain.supported[name];
      if (!supportedVersion(value, policy))
        throw Error(
          `Unsupported ${name} version ${value}. Expected ${policy.min} through ${policy.maxMajor}.x per scripts/check-toolchain.json.`,
        );
    }
    phase = 'source-snapshot';
    const source = await captureSource({
      root,
      temporary,
      ref: options.ref,
      run,
      docker,
      platform: toolchain.platform,
    });
    manifest.source = source.manifest;
    if (JSON.stringify(source.toolchain) !== JSON.stringify(toolchain))
      throw Error(
        'Replay ref uses a different toolchain contract; run its own replay driver',
      );
    revision = source.manifest.revision;
    commandRoot = source.composeRoot;
    const profile = toolchain.profiles[options.profile];
    Object.assign(config.env, {
      CHECK_PROFILE: options.profile,
      CHECK_SCOPE: options.scope,
      CHECK_REPEAT: String(options.repeat),
      CHECK_SEED: String(options.seed),
      CHECK_COLD_CACHE: options.cache === 'cold' ? '1' : '0',
      CHECK_PLATFORM: toolchain.platform,
      CHECK_APP_CPUS: profile.application.cpus,
      CHECK_APP_MEMORY: profile.application.memory,
      TZ: 'UTC',
      LANG: 'C.UTF-8',
      LC_ALL: 'C.UTF-8',
      CI: 'true',
    });
    Object.assign(env, config.env);
    await saveManifest(output, manifest);
    console.log(
      `Local checks: ${config.id}\nLogs and browser evidence: ${output}`,
    );
    phase = 'checks-image';
    await docker(
      [
        'buildx',
        'build',
        '--load',
        '--platform',
        toolchain.platform,
        '--metadata-file',
        path.join(output, 'runner-build.json'),
        ...(options.cache === 'cold' ? ['--no-cache'] : []),
        '--target',
        'checks',
        '--tag',
        config.runnerImage,
        '-',
      ],
      { input: source.archive },
    );
    manifest.images = {
      runner: await imageEvidence(config.runnerImage),
      runnerBuild: await buildEvidence(path.join(output, 'runner-build.json')),
    };
    await saveManifest(output, manifest);
    if (interrupted) throw new Error('Interrupted');
    phase = 'disposable-services';
    await docker([
      'network',
      'create',
      '--label',
      `${label}=${config.id}`,
      config.network,
    ]);
    networkCreated = true;
    await docker([
      'run',
      '--detach',
      '--name',
      config.database,
      '--label',
      `${label}=${config.id}`,
      '--network',
      config.network,
      '--env',
      'POSTGRES_USER=clog',
      '--env',
      `POSTGRES_PASSWORD=${config.env.POSTGRES_PASSWORD}`,
      '--env',
      'POSTGRES_DB=clog_test',
      '--platform',
      toolchain.platform,
      ...resourceArgs(profile.database),
      '--health-cmd',
      'pg_isready -U clog -d clog_test',
      '--health-interval',
      '2s',
      '--health-timeout',
      '3s',
      '--health-retries',
      '30',
      toolchain.images.postgres,
    ]);
    databaseCreated = true;
    manifest.images.testDatabase = await imageEvidence(
      toolchain.images.postgres,
    );
    let healthy = false;
    for (let attempt = 0; attempt < 60 && !interrupted; attempt++) {
      if (
        (await docker(
          ['inspect', '--format', '{{.State.Health.Status}}', config.database],
          true,
        )) === 'healthy'
      ) {
        healthy = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (!healthy)
      throw new Error('Disposable PostgreSQL did not become healthy');
    const containerEnv = Object.entries({
      ...config.env,
      CHECK_REVISION: revision,
      CHECK_RUN_ID: config.id,
      CHECK_SOURCE_FINGERPRINT: source.manifest.fingerprint,
    }).flatMap(([key, value]) => ['--env', `${key}=${value}`]);
    // Source is copied by Dockerfile; no checkout, .env or host database is mounted.
    await docker([
      'create',
      '--init',
      '--name',
      config.runner,
      '--label',
      `${label}=${config.id}`,
      '--network',
      config.network,
      '--platform',
      toolchain.platform,
      ...resourceArgs(profile.runner),
      // Browser TLS stays inside this runner; PUBLIC_ORIGIN matches real cookies/CSRF.
      '--add-host',
      'clog.example.com:127.0.0.1',
      '--mount',
      `type=bind,source=${process.env.LOCAL_DOCKER_SOCKET || '/var/run/docker.sock'},target=/var/run/docker.sock`,
      ...containerEnv,
      config.runnerImage,
    ]);
    runnerCreated = true;
    if (options.scope === 'acceptance')
      await docker(
        [
          'cp',
          source.archive,
          `${config.runner}:/tmp/clog-accepted-source.tar`,
        ],
        true,
      );
    phase = 'gates';
    await docker(['start', '--attach', config.runner]);
    if (interrupted) throw new Error('Interrupted');
    status = 'passed';
  } catch (error) {
    failure = error;
  } finally {
    phase = 'evidence';
    if (runnerCreated) {
      // Evidence retrieval must not turn a failed test into success.
      await docker(
        ['cp', `${config.runner}:/app/.data/local-checks/.`, output],
        true,
      ).catch(() =>
        evidenceErrors.push(
          'Could not copy stage logs and reports from the runner.',
        ),
      );
      await docker(
        [
          'cp',
          `${config.runner}:/app/apps/web/test-results`,
          path.join(output, 'browser'),
        ],
        true,
      ).catch(() =>
        evidenceErrors.push(
          'Could not copy browser screenshots and traces from the runner.',
        ),
      );
    }
    try {
      manifest.container = JSON.parse(
        await readFile(path.join(output, 'container-environment.json'), 'utf8'),
      );
    } catch {
      manifest.container = { unavailable: true };
    }
    try {
      manifest.gatePlanFingerprint = JSON.parse(
        await readFile(path.join(output, 'gates.json'), 'utf8'),
      ).planFingerprint;
    } catch {
      /* Setup failures keep explicitly missing evidence. */
    }
    manifest.images = {
      ...manifest.images,
      application: await imageEvidence(config.appImage),
      appBuild: await buildEvidence(path.join(output, 'app-build.json')),
    };
    manifest.containerLimits = {
      runner: runnerCreated
        ? await containerEvidence(config.runner)
        : { unavailable: true },
      database: databaseCreated
        ? await containerEvidence(config.database)
        : { unavailable: true },
    };
    if (networkCreated && options.scope === 'acceptance') {
      const application = await docker(
        [...compose, 'ps', '-q', 'clan-clog'],
        true,
      ).catch(() => undefined);
      manifest.containerLimits.application = application
        ? await containerEvidence(application)
        : { unavailable: true };
      if (application) {
        const packages = await docker(
          ['exec', application, 'cat', '/opt/clog-toolchain-packages.txt'],
          true,
        ).catch(() => undefined);
        manifest.applicationPackages = packages
          ?.split('\n')
          .map((line) => line.split('\t')) ?? { unavailable: true };
      }
    }
    phase = 'cleanup';
    if (networkCreated)
      await cleanup('Compose cleanup', async () => {
        await owned('network', config.network);
        if (status !== 'passed')
          await docker([
            ...compose,
            'logs',
            '--no-color',
            '--tail',
            '80',
          ]).catch(() => {});
        await docker([...compose, 'down', '--volumes', '--remove-orphans']);
      });
    for (const [created, name] of [
      [runnerCreated, config.runner],
      [databaseCreated, config.database],
    ]) {
      if (created)
        await cleanup(`Container cleanup ${name}`, async () => {
          await owned('container', name);
          await docker(['rm', '--force', '--volumes', name]);
        });
    }
    if (networkCreated)
      await cleanup('Network cleanup', async () => {
        await owned('network', config.network);
        await docker(['network', 'rm', config.network]);
      });
    // Remove run-specific tags, retaining Docker's reusable build cache.
    for (const image of [config.runnerImage, config.appImage])
      await docker(['image', 'rm', image], true).catch(() => {});
    await cleanup('Source snapshot cleanup', async () => {
      if (
        path.dirname(temporary) !== path.resolve(tmpdir()) ||
        !path.basename(temporary).startsWith('clog-check-source-')
      )
        throw Error('Source cleanup scope mismatch');
      await rm(temporary, { recursive: true, force: true });
    });
    process.off('SIGINT', interrupt);
    process.off('SIGTERM', interrupt);
    if (cleanupErrors.length) status = 'failed';
    manifest.browserEvidence = await browserEvidence(
      output,
      options.scope === 'catalog'
        ? ['catalog']
        : ['browser', 'loading', 'security', 'stack'],
    );
    manifest.browserPolicy = Object.fromEntries(
      Object.entries(manifest.browserEvidence).map(([name, value]) => [
        name,
        value.policy ?? { unavailable: true },
      ]),
    );
    if (
      status === 'passed' &&
      (!manifest.source?.fingerprint ||
        !manifest.gatePlanFingerprint ||
        !manifest.container?.environment ||
        Object.values(manifest.browserPolicy).some(
          (policy) => policy.unavailable,
        ))
    )
      evidenceErrors.push(
        'Required source, environment, gate or browser policy evidence is missing.',
      );
    manifest.finishedAt = new Date().toISOString();
    const manifestSha256 = await saveManifest(output, manifest);
    let result = await writeRunReport(output, {
      project: config.id,
      revision,
      scope: options.scope,
      sourceFingerprint: manifest.source?.fingerprint,
      manifestSha256,
      status,
      interrupted,
      cleanupErrors,
      evidenceErrors,
      error: failure?.message,
      finishedAt: new Date().toISOString(),
      note: `Tests cover the frozen ${options.ref ? 'clean commit' : 'effective working-tree'} Docker context. Catalog scope never grants release acceptance.`,
    });
    try {
      await prepareArtifacts(output, manifest, result);
    } catch {
      result = await writeRunReport(output, {
        ...result,
        status: 'failed',
        evidenceErrors: [
          ...result.evidenceErrors,
          'Bounded artifact export failed; local original evidence is retained.',
        ],
      });
      const compact = path.join(output, 'artifacts/compact');
      await mkdir(compact, { recursive: true });
      await writeFile(
        path.join(compact, 'export-failure.json'),
        JSON.stringify(
          {
            format: 1,
            runId: config.id,
            status: 'failed',
            manifestSha256,
            sourceFingerprint: manifest.source?.fingerprint,
            reason: 'Artifact export incomplete; inspect local originals.',
          },
          null,
          2,
        ) + '\n',
      );
    }
    status = result.status;
    console.log(consoleSummary(result, output));
    await new Promise((resolve) => log.end(resolve));
  }
  if (failure) throw failure;
  if (cleanupErrors.length)
    throw new Error(`Cleanup incomplete: ${cleanupErrors.join(', ')}`);
  if (status !== 'passed')
    throw new Error(
      `Checks or evidence incomplete; see ${path.join(output, 'summary.md')}`,
    );
  console.log(`All ${options.scope} gates passed. Evidence: ${output}`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
