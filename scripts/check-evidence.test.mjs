import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  collectEnvironment,
  buildEvidence,
  containerEvidence,
  imageEvidence,
  saveManifest,
} from './check-environment.mjs';
import { compareManifests } from './check-compare.mjs';
import { prepareArtifacts } from './check-artifacts.mjs';
import {
  replayOptions,
  supportedVersion,
  toolchain,
  checkToolchain,
  applicationLimits,
} from './check-toolchain.mjs';
import { checkPlan, planFingerprint } from './check-gates.mjs';

test('missing tools leave explicit facts without raw errors, environment values or Docker endpoints', async () => {
  const original = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = 'must-never-appear';
  try {
    const facts = await collectEnvironment(tmpdir(), async () => undefined);
    assert.deepEqual(facts.docker.server, { unavailable: true });
    assert.deepEqual(facts.docker.compose, { unavailable: true });
    assert.ok(!JSON.stringify(facts).includes('must-never-appear'));
    assert.deepEqual(await imageEvidence('missing', async () => undefined), {
      unavailable: true,
    });
    const image = await imageEvidence('fixture', async () =>
      JSON.stringify({
        Id: 'sha256:abc',
        Os: 'linux',
        Architecture: 'amd64',
        Config: { Env: ['SECRET=private'] },
        RepoDigests: ['fixture@sha256:abc'],
      }),
    );
    assert.ok(!JSON.stringify(image).includes('private'));
    const container = await containerEvidence('fixture', async () =>
      JSON.stringify({
        Image: 'sha256:fixture',
        HostConfig: { Memory: 42, NanoCpus: 1000, ShmSize: 1024 },
        Config: { Env: ['SECRET=private'] },
        Mounts: [{ Source: '/private/data' }],
      }),
    );
    assert.deepEqual(container.limits, {
      nanoCpus: 1000,
      memoryBytes: 42,
      sharedMemoryBytes: 1024,
    });
    assert.ok(!JSON.stringify(container).includes('private'));
  } finally {
    if (original === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = original;
  }
});
test('comparison distinguishes source/configuration drift, execution differences and missing evidence', () => {
  const base = {
    format: 1,
    runId: 'one',
    source: {
      fingerprint: 'abc',
      lockfileSha256: 'lock',
      revision: 'head',
      mode: 'working-tree',
    },
    toolchain,
    driver: { format: 1, entrySha256: 'fixture' },
    gatePlanFingerprint: 'plan',
    options: {
      scope: 'catalog',
      profile: 'normal',
      cache: 'normal',
      repeat: 3,
      seed: 126,
    },
    container: {
      environment: {
        node: toolchain.node,
        npm: toolchain.npm,
        os: {},
        resources: {},
        docker: {},
      },
      packages: [],
      browserTooling: {},
    },
    host: {},
    browserPolicy: {},
    images: { runnerBuild: { materials: [] } },
  };
  const same = structuredClone(base);
  same.source.revision = 'another-head';
  same.options.cache = 'cold';
  assert.equal(compareManifests(base, same).comparableInputs, true);
  same.source.fingerprint = 'dirty';
  assert.equal(compareManifests(base, same).comparableInputs, false);
  delete same.source.fingerprint;
  assert.equal(compareManifests(base, same).comparableInputs, null);
  assert.ok(
    compareManifests(base, same).missingEvidence.includes('source.fingerprint'),
  );
});
test('declared toolchain and replay gates stay consistent, bounded and strict', async () => {
  await checkToolchain();
  for (const [name, values] of Object.entries({
    docker: ['28.5.2', '29.8.2'],
    compose: ['2.30.0', '5.6.0'],
    buildx: ['0.17.0', '0.37.2'],
  }))
    for (const value of values)
      assert.equal(supportedVersion(value, toolchain.supported[name]), true);
  for (const value of ['', '27.9.9', '30.0.0'])
    assert.equal(supportedVersion(value, toolchain.supported.docker), false);
  for (const args of [
    ['--repeat', '11'],
    ['--profile', '__proto__'],
    ['--seed', '-1'],
    ['--ref', '--all'],
    ['--scope', 'skip-security'],
    ['--cache', 'prune'],
  ])
    assert.throws(() => replayOptions(args));
  assert.deepEqual(applicationLimits({ CHECK_PROFILE: 'constrained' }), {
    cpus: 1,
    mem_limit: '1g',
  });
  const plan = checkPlan({
    CHECK_REVISION: 'a'.repeat(40),
    CHECK_APP_IMAGE: 'clog-local-app:first',
  });
  const other = checkPlan({
    CHECK_REVISION: 'b'.repeat(40),
    CHECK_APP_IMAGE: 'clog-local-app:second',
    CHECK_COLD_CACHE: '1',
  });
  assert.equal(planFingerprint(plan), planFingerprint(other));
  assert.equal(
    plan.find(({ name }) => name === 'app-image').command[1],
    'scripts/check-app-image.mjs',
  );
  assert.equal(
    plan.find(({ name }) => name === 'app-image').command.at(-1),
    '-',
  );
  assert.ok(
    other
      .find(({ name }) => name === 'app-image')
      .command.includes('--no-cache'),
  );
  const focused = checkPlan({ CHECK_SCOPE: 'catalog' });
  assert.deepEqual(
    focused.map(({ name }) => name),
    ['toolchain', 'build-domain', 'catalog'],
  );
  assert.ok(!focused.some(({ name }) => name === 'release-results'));
});
test('setup interruption retains atomic compact evidence; trace retention is allowlisted and bounded', async (t) => {
  const output = await mkdtemp(path.join(tmpdir(), 'clog-artifact-test-'));
  t.after(async () => {
    assert.equal(path.dirname(output), path.resolve(tmpdir()));
    assert.ok(path.basename(output).startsWith('clog-artifact-test-'));
    await rm(output, { recursive: true, force: true });
  });
  const manifest = {
    format: 1,
    runId: 'interrupted',
    options: { scope: 'catalog' },
  };
  const hash = await saveManifest(output, manifest);
  assert.match(hash, /^[a-f0-9]{64}$/u);
  assert.deepEqual(
    JSON.parse(await readFile(path.join(output, 'manifest.json'), 'utf8')),
    manifest,
  );
  await mkdir(path.join(output, 'browser/first'), { recursive: true });
  await writeFile(path.join(output, 'browser/first/trace.zip'), 'trace-bytes');
  await writeFile(path.join(output, 'browser/first/screenshot.png'), 'image');
  await writeFile(path.join(output, 'browser/first/.env'), 'private');
  const result = {
    status: 'failed',
    scope: 'catalog',
    interrupted: true,
    gates: [],
    evidenceErrors: ['Stage report unavailable'],
    missingReports: ['catalog-report.json'],
    cleanupErrors: [],
    manifestSha256: hash,
  };
  const retained = await prepareArtifacts(output, manifest, result, {
    compactBytes: 100000,
    traceBytes: 10,
    maxFiles: 1,
    retentionDays: 14,
  });
  assert.equal(retained.retained, 1);
  assert.equal(retained.omitted, 1);
  const summary = await readFile(
    path.join(output, 'artifacts/compact/summary.json'),
    'utf8',
  );
  assert.ok(!summary.includes('private'));
  assert.match(summary, /interrupted/);
  const retention = JSON.parse(
    await readFile(
      path.join(output, 'artifacts/compact/retention.json'),
      'utf8',
    ),
  );
  assert.equal(retention.retentionDays, 14);
  assert.ok(!JSON.stringify(retention).includes('.env'));
  await assert.rejects(
    prepareArtifacts(
      output,
      { ...manifest, oversized: 'x'.repeat(1000) },
      result,
      { compactBytes: 100 },
    ),
    /budget/,
  );
});

test('toolchain guard rejects drift in images, host runtime, workflow retention and browser configuration', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'clog-toolchain-test-'));
  t.after(async () => {
    assert.equal(path.dirname(root), path.resolve(tmpdir()));
    assert.ok(path.basename(root).startsWith('clog-toolchain-test-'));
    await rm(root, { recursive: true, force: true });
  });
  const files = [
    'Dockerfile',
    '.nvmrc',
    '.github/workflows/ci.yml',
    'apps/web/package.json',
    ...['', '.loading', '.security', '.stack'].map(
      (name) => `apps/web/playwright${name}.config.ts`,
    ),
  ];
  const originals = new Map();
  for (const file of files) {
    const text = await readFile(new URL('../' + file, import.meta.url), 'utf8');
    originals.set(file, text);
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), text);
  }
  await checkToolchain(root);
  for (const [file, change] of [
    [
      'Dockerfile',
      (value) => value.replace(toolchain.images.node, 'node:24-bookworm-slim'),
    ],
    ['.nvmrc', () => '24\n'],
    [
      '.github/workflows/ci.yml',
      (value) => value.replaceAll('retention-days: 14', 'retention-days: 1'),
    ],
    [
      'apps/web/playwright.config.ts',
      (value) =>
        value.replace(
          '../../scripts/check-browser-policy.mjs',
          'other-reporter.mjs',
        ),
    ],
    ['apps/web/package.json', (value) => value.replace('1.62.1', '1.62.0')],
  ]) {
    await writeFile(path.join(root, file), change(originals.get(file)));
    await assert.rejects(checkToolchain(root), /drift|reporter/);
    await writeFile(path.join(root, file), originals.get(file));
  }
});

test('build provenance separates ephemeral stdin sessions from comparable base materials', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'clog-provenance-test-'));
  t.after(async () => {
    assert.equal(path.dirname(root), path.resolve(tmpdir()));
    assert.ok(path.basename(root).startsWith('clog-provenance-test-'));
    await rm(root, { recursive: true, force: true });
  });
  const facts = [];
  for (const session of ['random-one', 'random-two']) {
    const file = path.join(root, session + '.json');
    await writeFile(
      file,
      JSON.stringify({
        'buildx.build.provenance': {
          materials: [
            {
              uri: 'http://buildkit-session/' + session,
              digest: { sha256: 'transport-hash' },
            },
            {
              uri: 'pkg:docker/node@sha256:pinned',
              digest: { sha256: 'pinned' },
            },
          ],
        },
      }),
    );
    facts.push(await buildEvidence(file));
  }
  assert.deepEqual(facts[0], facts[1]);
  assert.equal(facts[0].materials.length, 1);
  assert.deepEqual(facts[0].sourceTransports, [
    { kind: 'stdin-tar', digest: { sha256: 'transport-hash' } },
  ]);
  assert.ok(!JSON.stringify(facts).includes('random-one'));
  const malformed = path.join(root, 'malformed.json');
  await writeFile(malformed, '{"buildx.build.provenance":{"materials":{}}}');
  assert.deepEqual((await buildEvidence(malformed)).materials, {
    unavailable: true,
  });
});
