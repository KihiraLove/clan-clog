/** Fingerprint Docker's exported context, not an approximation of .dockerignore. */
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { toolchain } from './check-toolchain.mjs';

export const sha256 = (bytes) =>
  createHash('sha256').update(bytes).digest('hex');
const order = (a, b) =>
  a.pathHash < b.pathHash ? -1 : a.pathHash > b.pathHash ? 1 : 0;
const field = (header, start, length) =>
  header
    .subarray(start, start + length)
    .toString('utf8')
    .replace(/\0.*$/su, '');
const octal = (header, start, length) => {
  const value = field(header, start, length).trim();
  if (!/^[0-7]*$/u.test(value))
    throw Error('Unsupported source archive number');
  return parseInt(value || '0', 8);
};
const safePath = (name) => {
  name = name.replace(/^\.\//u, '').replace(/\/$/u, '');
  if (!name || name === '.') return '';
  if (
    name.startsWith('/') ||
    name.includes('\\') ||
    name.split('/').some((part) => !part || part === '.' || part === '..')
  )
    throw Error('Unsafe source archive path');
  return name;
};
function paxFields(bytes) {
  const fields = {};
  let offset = 0;
  while (offset < bytes.length) {
    const space = bytes.indexOf(32, offset),
      size = Number(bytes.subarray(offset, space).toString());
    if (
      space < offset ||
      !Number.isSafeInteger(size) ||
      size <= space - offset + 1 ||
      offset + size > bytes.length
    )
      throw Error('Invalid source archive metadata');
    const record = bytes
        .subarray(space + 1, offset + size - 1)
        .toString('utf8'),
      equals = record.indexOf('=');
    if (equals < 1) throw Error('Invalid source archive metadata');
    fields[record.slice(0, equals)] = record.slice(equals + 1);
    offset += size;
  }
  if (Object.keys(fields).some((key) => key.startsWith('GNU.sparse')))
    throw Error('Sparse source archives are unsupported');
  return fields;
}

export function fingerprintTar(tar, { select = [] } = {}) {
  const entries = [],
    contents = new Map(),
    seen = new Set();
  let offset = 0,
    extended = {},
    global = {};
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const sum = header.reduce(
      (total, byte, i) => total + (i >= 148 && i < 156 ? 32 : byte),
      0,
    );
    if (octal(header, 148, 8) !== sum)
      throw Error('Invalid source archive checksum');
    const type = field(header, 156, 1) || '0',
      metadata = { ...global, ...extended };
    const size = Number(metadata.size ?? octal(header, 124, 12));
    if (
      !Number.isSafeInteger(size) ||
      size < 0 ||
      offset + 512 + size > tar.length
    )
      throw Error('Truncated source archive');
    const bytes = tar.subarray(offset + 512, offset + 512 + size);
    offset += 512 + Math.ceil(size / 512) * 512;
    if (type === 'x' || type === 'g') {
      if (type === 'x') extended = paxFields(bytes);
      else global = { ...global, ...paxFields(bytes) };
      continue;
    }
    const prefix = field(header, 345, 155);
    const name = safePath(
      metadata.path ?? (prefix ? prefix + '/' : '') + field(header, 0, 100),
    );
    extended = {};
    if (!name) continue;
    if (seen.has(name)) throw Error('Duplicate source archive path');
    seen.add(name);
    if (!['0', '2', '5'].includes(type))
      throw Error('Unsupported source archive entry');
    const data =
      type === '2'
        ? Buffer.from(metadata.linkpath ?? field(header, 157, 100))
        : bytes;
    const text =
      type === '0' && !data.includes(0) ? data.toString('utf8') : undefined;
    const entry = {
      pathHash: sha256(name),
      type,
      mode: octal(header, 100, 8) & 0o777,
      size: data.length,
      sha256: sha256(data),
      ...(text === undefined
        ? {}
        : {
            lineEndings: {
              crlf: (text.match(/\r\n/gu) ?? []).length,
              lf: (text.match(/(?<!\r)\n/gu) ?? []).length,
              cr: (text.match(/\r(?!\n)/gu) ?? []).length,
            },
          }),
    };
    entries.push(entry);
    if (type === '0' && select.includes(name))
      contents.set(name, Buffer.from(data));
  }
  if (!entries.length) throw Error('Empty source archive');
  entries.sort(order);
  return {
    format: 1,
    fingerprint: sha256(JSON.stringify(entries)),
    files: entries.filter(({ type }) => type !== '5').length,
    bytes: entries.reduce((n, entry) => n + entry.size, 0),
    entries,
    contents,
  };
}

export async function fingerprintFile(file, options) {
  if ((await stat(file)).size > 512 * 1024 * 1024)
    throw Error('Source context exceeds the 512 MiB evidence limit');
  return fingerprintTar(await readFile(file), options);
}

export async function captureSource({
  root,
  temporary,
  ref,
  run,
  docker,
  platform,
}) {
  const git = (args) =>
    run(
      'git',
      ['-c', `safe.directory=${root.replaceAll('\\', '/')}`, ...args],
      { quiet: true, raw: args.includes('-z') },
    );
  const revision = await git([
    'rev-parse',
    '--verify',
    '--end-of-options',
    (ref ?? 'HEAD') + '^{commit}',
  ]);
  if (!/^[a-f0-9]{40}$/u.test(revision))
    throw Error('Exact source revision unavailable');
  const branch = await git(['symbolic-ref', '--short', '-q', 'HEAD']).catch(
    () => undefined,
  );
  const dirty = (
    await git(['diff', '--no-renames', '--name-only', '-z', 'HEAD'])
  )
    .split('\0')
    .filter(Boolean)
    .map(sha256)
    .sort();
  const untracked = (
    await git(['ls-files', '--others', '--exclude-standard', '-z'])
  )
    .split('\0')
    .filter(Boolean)
    .map(sha256);
  let input;
  if (ref) {
    input = path.join(temporary, 'commit.tar');
    await git(['archive', '--format=tar', '--output=' + input, revision]);
  }
  const helper = '.clog-check-source-driver.Dockerfile';
  let specificIgnore;
  if (input) {
    const commit = await fingerprintFile(input, {
      select: ['Dockerfile.dockerignore'],
    });
    specificIgnore = commit.contents.get('Dockerfile.dockerignore');
    if (
      commit.entries.some(({ pathHash }) =>
        [sha256(helper), sha256(helper + '.dockerignore')].includes(pathHash),
      )
    )
      throw Error('Reserved source driver path exists in the replay ref');
  } else if (
    (
      await Promise.all(
        [helper, helper + '.dockerignore'].map((name) =>
          stat(path.join(root, name)).then(
            () => true,
            () => false,
          ),
        ),
      )
    ).some(Boolean)
  )
    throw Error('Reserved source driver path exists in the checkout');
  else
    specificIgnore = await readFile(
      path.join(root, 'Dockerfile.dockerignore'),
    ).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  const dockerfile = path.join(temporary, helper),
    archive = path.join(temporary, 'source.tar');
  await writeFile(
    dockerfile,
    `FROM ${toolchain.images.node} AS source\nCOPY . /source\nRUN rm -f /source/${helper} /source/${helper}.dockerignore\nFROM scratch\nCOPY --from=source /source/ /\n`,
  );
  if (specificIgnore)
    await writeFile(dockerfile + '.dockerignore', specificIgnore);
  if (input)
    await run(
      'tar',
      [
        '-rf',
        input,
        '-C',
        temporary,
        helper,
        ...(specificIgnore ? [helper + '.dockerignore'] : []),
      ],
      { quiet: true },
    );
  await docker(
    [
      'buildx',
      'build',
      '--platform',
      platform,
      '--file',
      input ? helper : dockerfile,
      '--output',
      `type=tar,dest=${archive}`,
      ...(input ? ['-'] : [root]),
    ],
    { input },
  );
  const source = await fingerprintFile(archive, {
    select: [
      'package-lock.json',
      'scripts/check-toolchain.json',
      'compose.yaml',
      'compose.checks.yaml',
      'compose.traefik.yaml',
    ],
  });
  const participating = new Set(source.entries.map(({ pathHash }) => pathHash));
  const composeRoot = path.join(temporary, 'compose');
  await mkdir(composeRoot);
  for (const [name, bytes] of source.contents)
    if (name.startsWith('compose.'))
      await writeFile(path.join(composeRoot, name), bytes);
  const spec = source.contents.get('scripts/check-toolchain.json');
  if (!spec) throw Error('This ref predates the replay toolchain contract');
  const manifest = {
    ...source,
    contents: undefined,
    mode: ref ? 'clean-ref' : 'working-tree',
    revision,
    ref: ref ? revision : branch,
    workingTree: {
      trackedDirty: dirty.length > 0,
      dirtyPathHashes: dirty,
      untrackedCount: untracked.length,
    },
    untrackedParticipants: ref
      ? []
      : untracked.filter((hash) => participating.has(hash)).sort(),
    lockfileSha256: source.contents.has('package-lock.json')
      ? sha256(source.contents.get('package-lock.json'))
      : undefined,
  };
  return { archive, composeRoot, manifest, toolchain: JSON.parse(spec) };
}
