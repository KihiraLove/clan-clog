import assert from 'node:assert/strict';
import test from 'node:test';
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  captureSource,
  fingerprintFile,
  fingerprintTar,
  sha256,
} from './check-source.mjs';
import { verifyAcceptedSource } from './check-app-image.mjs';

function archive(files) {
  const parts = [];
  for (const {
    name,
    text = '',
    mode = 0o644,
    type = '0',
    target = '',
    mtime = 0,
  } of files) {
    const bytes = Buffer.from(text),
      header = Buffer.alloc(512);
    const put = (value, offset, size) =>
      header.write(value, offset, size, 'utf8');
    const oct = (value, offset, size) =>
      put(value.toString(8).padStart(size - 1, '0') + '\0', offset, size);
    put(name, 0, 100);
    oct(mode, 100, 8);
    oct(bytes.length, 124, 12);
    oct(mtime, 136, 12);
    put('        ', 148, 8);
    put(type, 156, 1);
    put(target, 157, 100);
    oct(
      header.reduce((sum, byte) => sum + byte, 0),
      148,
      8,
    );
    parts.push(header, bytes, Buffer.alloc((512 - (bytes.length % 512)) % 512));
  }
  return Buffer.concat([...parts, Buffer.alloc(1024)]);
}
test('source fingerprints ignore tar order and timestamps but retain actual bytes, line endings and modes', () => {
  const a = { name: 'a.ts', text: 'line\n' },
    b = { name: 'b.ts', text: 'other\n' };
  const baseline = fingerprintTar(archive([a, b]));
  assert.equal(
    baseline.fingerprint,
    fingerprintTar(archive([{ ...b, mtime: 999 }, a])).fingerprint,
  );
  for (const changed of [
    { ...a, text: 'line\r\n' },
    { ...a, text: 'changed\n' },
    { ...a, mode: 0o755 },
  ])
    assert.notEqual(
      baseline.fingerprint,
      fingerprintTar(archive([changed, b])).fingerprint,
    );
  assert.notEqual(
    baseline.fingerprint,
    fingerprintTar(archive([a, b, { name: 'untracked.ts', text: 'new' }]))
      .fingerprint,
  );
  assert.deepEqual(
    baseline.entries.find(({ pathHash }) => pathHash === sha256(a.name))
      .lineEndings,
    { crlf: 0, lf: 1, cr: 0 },
  );
});
test('source evidence exposes hashes instead of arbitrary filenames, symlink targets or source contents', () => {
  const source = fingerprintTar(
    archive([
      { name: 'private-name.ts', text: 'secret-source-bytes' },
      { name: 'link', type: '2', target: '/private/secret' },
    ]),
  );
  const json = JSON.stringify({ ...source, contents: undefined });
  for (const secret of ['private-name', 'secret-source', '/private/secret'])
    assert.ok(!json.includes(secret));
  for (const files of [
    [{ name: '../escape' }],
    [{ name: '/absolute' }],
    [{ name: 'duplicate' }, { name: 'duplicate' }],
    [{ name: 'device', type: '3' }],
  ])
    assert.throws(() => fingerprintTar(archive(files)));
  const broken = archive([{ name: 'valid' }]);
  broken[0] ^= 1;
  assert.throws(() => fingerprintTar(broken), /checksum/);
  assert.throws(
    () =>
      fingerprintTar(
        archive([{ name: 'large', text: '123' }]).subarray(0, 513),
      ),
    /Truncated/,
  );
});

test('application builds reject a changed or unidentified accepted archive before calling Docker', async (t) => {
  const data = await fixture(t),
    archivePath = path.join(data.temporary, 'accepted.tar');
  const original = archive([{ name: 'app.ts', text: 'accepted' }]);
  const hash = fingerprintTar(original).fingerprint;
  await writeFile(archivePath, original);
  await verifyAcceptedSource(archivePath, hash);
  await assert.rejects(
    verifyAcceptedSource(archivePath, undefined),
    /missing or changed/,
  );
  await writeFile(
    archivePath,
    archive([{ name: 'app.ts', text: 'dirty post-build mutation' }]),
  );
  await assert.rejects(
    verifyAcceptedSource(archivePath, hash),
    /missing or changed/,
  );
});

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'clog-source-test-'));
  t.after(async () => {
    assert.equal(path.dirname(root), path.resolve(tmpdir()));
    assert.ok(path.basename(root).startsWith('clog-source-test-'));
    await rm(root, { recursive: true, force: true });
  });
  const project = path.join(root, 'project'),
    temporary = path.join(root, 'capture');
  await mkdir(path.join(project, 'scripts'), { recursive: true });
  await mkdir(temporary);
  const run = (command, args, options = {}) =>
    new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: project,
        windowsHide: true,
        stdio: [options.input ? 'pipe' : 'ignore', 'pipe', 'pipe'],
      });
      let stdout = '',
        stderr = '';
      child.stdout.on('data', (chunk) => (stdout += chunk));
      child.stderr.on('data', (chunk) => (stderr += chunk));
      child.once('error', reject);
      child.once('close', (code) =>
        code === 0
          ? resolve(options.raw ? stdout : stdout.trim())
          : reject(Error(stderr)),
      );
      if (options.input) {
        child.stdin.on('error', () => {});
        createReadStream(options.input).pipe(child.stdin);
      }
    });
  await writeFile(
    path.join(project, '.dockerignore'),
    '.git\n.env\n*.ignore\n',
  );
  await writeFile(
    path.join(project, 'scripts/check-toolchain.json'),
    '{"format":1}',
  );
  await writeFile(path.join(project, 'compose.yaml'), 'services: {}\n');
  await writeFile(path.join(project, 'source.txt'), 'committed\n');
  await run('git', ['init', '-q']);
  await run('git', ['add', '.']);
  await run('git', [
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.invalid',
    'commit',
    '-qm',
    'Fixture',
  ]);
  return { root: project, temporary, run, platform: 'linux/amd64' };
}
test('clean-ref archive isolates dirty and unrelated untracked files without changing the checkout', async (t) => {
  const fixtureData = await fixture(t);
  await writeFile(path.join(fixtureData.root, 'source.txt'), 'dirty\n');
  await writeFile(path.join(fixtureData.root, 'untracked.txt'), 'untracked\n');
  const captured = await captureSource({
    ...fixtureData,
    ref: 'HEAD',
    docker: async (_args, { input }) => {
      assert.ok(input.endsWith('commit.tar'));
      await copyFile(input, path.join(fixtureData.temporary, 'source.tar'));
    },
  });
  const actual = await fingerprintFile(captured.archive, {
    select: ['source.txt', 'untracked.txt'],
  });
  assert.equal(actual.contents.get('source.txt').toString(), 'committed\n');
  assert.equal(actual.contents.has('untracked.txt'), false);
  assert.equal(captured.manifest.mode, 'clean-ref');
  assert.equal(captured.manifest.workingTree.trackedDirty, true);
  assert.deepEqual(captured.manifest.untrackedParticipants, []);
  assert.equal(
    await readFile(path.join(fixtureData.root, 'source.txt'), 'utf8'),
    'dirty\n',
  );
});

// Explicit focused integration only; normal tooling tests do not require a daemon.
if (process.env.CHECK_SOURCE_DOCKER_TEST === '1')
  test('Docker applies exclusions and clean-ref context before the fingerprint is recorded', async (t) => {
    const data = await fixture(t);
    await writeFile(
      path.join(data.root, '.env'),
      'NEVER_CAPTURE_THIS_SECRET=private',
    );
    await writeFile(path.join(data.root, 'protected.ignore'), 'ignored');
    await writeFile(path.join(data.root, 'untracked.txt'), 'participates');
    await writeFile(path.join(data.root, ' leading.txt'), 'participates too');
    await writeFile(path.join(data.root, 'source.txt'), 'dirty\r\n');
    const dirty = await captureSource({
      ...data,
      docker: (args, options) => data.run('docker', args, options),
    });
    const selected = await fingerprintFile(dirty.archive, {
      select: ['.env', 'protected.ignore', 'untracked.txt', 'source.txt'],
    });
    assert.equal(selected.contents.has('.env'), false);
    assert.equal(selected.contents.has('protected.ignore'), false);
    assert.equal(
      selected.contents.get('untracked.txt').toString(),
      'participates',
    );
    assert.equal(dirty.manifest.untrackedParticipants.length, 2);
    assert.ok(
      dirty.manifest.untrackedParticipants.includes(sha256(' leading.txt')),
    );
    assert.ok(
      !dirty.manifest.entries.some(
        ({ pathHash }) =>
          pathHash === sha256('.clog-check-source-driver.Dockerfile'),
      ),
    );
    const temporary = path.join(path.dirname(data.temporary), 'clean');
    await mkdir(temporary);
    const clean = await captureSource({
      ...data,
      temporary,
      ref: 'HEAD',
      docker: (args, options) => data.run('docker', args, options),
    });
    assert.notEqual(dirty.manifest.fingerprint, clean.manifest.fingerprint);
    assert.equal(
      (
        await fingerprintFile(clean.archive, { select: ['source.txt'] })
      ).contents
        .get('source.txt')
        .toString(),
      'committed\n',
    );
    const overridden = path.join(path.dirname(data.temporary), 'override');
    await mkdir(overridden);
    await writeFile(
      path.join(data.root, 'Dockerfile.dockerignore'),
      '.git\n.env\n*.ignore\nuntracked.txt\n',
    );
    const override = await captureSource({
      ...data,
      temporary: overridden,
      docker: (args, options) => data.run('docker', args, options),
    });
    assert.equal(
      (
        await fingerprintFile(override.archive, { select: ['untracked.txt'] })
      ).contents.has('untracked.txt'),
      false,
    );
    const coldRoot = path.join(path.dirname(data.temporary), 'cold');
    await mkdir(coldRoot);
    const cold = await captureSource({
      ...data,
      temporary: coldRoot,
      docker: (args, options) =>
        data.run(
          'docker',
          [...args.slice(0, 2), '--no-cache', ...args.slice(2)],
          options,
        ),
    });
    assert.equal(cold.manifest.fingerprint, override.manifest.fingerprint);
  });
