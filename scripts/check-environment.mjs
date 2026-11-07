/** Allowlisted environment facts only: no host names, endpoints, labels or env dump. */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import { readFile, statfs, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256 } from './check-source.mjs';

const exec = promisify(execFile);
const unavailable = { unavailable: true };
export async function probe(command, args) {
  try {
    const { stdout } = await exec(
      command === 'npm.cmd' ? 'cmd.exe' : command,
      command === 'npm.cmd' ? ['/d', '/c', 'npm.cmd --version'] : args,
      {
        timeout: 15000,
        maxBuffer: 2 * 1024 * 1024,
        windowsHide: true,
        env: { ...process.env, LC_ALL: 'C' },
      },
    );
    return stdout.trim();
  } catch {
    return undefined;
  }
}
const version = (value) => /(?:^|\s|v)(\d+\.\d+\.\d+)/u.exec(value ?? '')?.[1];
const read = (name) =>
  readFile(name, 'utf8').then(
    (value) => value.trim(),
    () => undefined,
  );
const disk = (name) =>
  statfs(name).then(
    (value) => ({
      capacityBytes: value.blocks * value.bsize,
      availableBytes: value.bavail * value.bsize,
    }),
    () => unavailable,
  );
const parse = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};
export async function collectEnvironment(root, execute = probe) {
  const pluginVersion = async (...args) => {
    const detect = async () => version(await execute('docker', args));
    // Give Docker Desktop's plugins a second chance if startup is slow.
    return (await detect()) ?? (await detect()) ?? unavailable;
  };
  const [
    npm,
    docker,
    info,
    compose,
    buildx,
    builder,
    cpuQuota,
    memoryLimit,
    cpuSet,
    osRelease,
  ] = await Promise.all([
    execute(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['--version']),
    execute('docker', ['version', '--format', 'json']),
    execute('docker', ['info', '--format', '{{json .}}']),
    pluginVersion('compose', 'version', '--short'),
    pluginVersion('buildx', 'version'),
    execute('docker', ['buildx', 'inspect']),
    read('/sys/fs/cgroup/cpu.max'),
    read('/sys/fs/cgroup/memory.max'),
    read('/sys/fs/cgroup/cpuset.cpus.effective'),
    read('/etc/os-release'),
  ]);
  const engine = parse(docker),
    daemon = parse(info);
  const selected = (value, keys) =>
    value
      ? Object.fromEntries(
          keys
            .filter((key) => value[key] !== undefined)
            .map((key) => [key, value[key]]),
        )
      : unavailable;
  return {
    node: process.versions.node,
    npm: version(npm) ?? unavailable,
    os: {
      platform: process.platform,
      release: os.release(),
      architecture: process.arch,
      distribution: /^PRETTY_NAME="?([^"\n]+)"?$/mu.exec(osRelease ?? '')?.[1],
    },
    resources: {
      cpuCount: os.cpus().length,
      availableParallelism: os.availableParallelism(),
      totalMemoryBytes: os.totalmem(),
      availableMemoryBytes: os.freemem(),
      cpuQuota: cpuQuota ?? unavailable,
      memoryLimit: memoryLimit ?? unavailable,
      cpuSet: cpuSet ?? unavailable,
      disk: await disk(root),
      sharedMemory: await disk('/dev/shm'),
    },
    locale: {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: Intl.DateTimeFormat().resolvedOptions().locale,
      lang: process.env.LANG,
      lcAll: process.env.LC_ALL,
    },
    docker: {
      client: selected(engine?.Client, ['Version', 'ApiVersion', 'Os', 'Arch']),
      server: selected(engine?.Server, [
        'Version',
        'ApiVersion',
        'Os',
        'Arch',
        'KernelVersion',
      ]),
      daemon: selected(daemon, [
        'OSType',
        'Architecture',
        'NCPU',
        'MemTotal',
        'Driver',
        'CgroupVersion',
      ]),
      compose,
      buildx,
      buildkit:
        /BuildKit version:\s*(v?[\w.-]+)/u.exec(builder ?? '')?.[1] ??
        unavailable,
      driver: /^Driver:\s*(\w[\w-]*)/mu.exec(builder ?? '')?.[1] ?? unavailable,
    },
  };
}
export async function imageEvidence(image, execute = probe) {
  const values = parse(
    await execute('docker', [
      'image',
      'inspect',
      '--format',
      '{{json .}}',
      image,
    ]),
  );
  if (!values) return unavailable;
  return {
    id: values.Id,
    repoDigests: values.RepoDigests ?? [],
    os: values.Os,
    architecture: values.Architecture,
  };
}
export async function containerEvidence(container, execute = probe) {
  const value = parse(
    await execute('docker', ['inspect', '--format', '{{json .}}', container]),
  );
  if (!value) return unavailable;
  return {
    imageId: value.Image,
    limits: {
      nanoCpus: value.HostConfig?.NanoCpus,
      memoryBytes: value.HostConfig?.Memory,
      sharedMemoryBytes: value.HostConfig?.ShmSize,
    },
  };
}
export async function buildEvidence(file) {
  const metadata = parse(await read(file));
  if (!metadata) return unavailable;
  const provenance = metadata['buildx.build.provenance'];
  const rawMaterials = provenance?.materials;
  const materials =
    Array.isArray(rawMaterials) &&
    rawMaterials.every(
      (value) =>
        value &&
        typeof value.uri === 'string' &&
        typeof value.digest?.sha256 === 'string',
    )
      ? rawMaterials.map(({ uri, digest }) => ({
          uri,
          digest: { sha256: digest.sha256 },
        }))
      : undefined;
  return {
    imageDigest: metadata['containerimage.digest'],
    configDigest: metadata['containerimage.config.digest'],
    materials:
      materials
        ?.filter(({ uri }) => !uri.startsWith('http://buildkit-session/'))
        ?.map(({ uri, digest }) => ({ uri, digest }))
        .sort((a, b) => (a.uri < b.uri ? -1 : a.uri > b.uri ? 1 : 0)) ??
      unavailable,
    sourceTransports:
      materials
        ?.filter(({ uri }) => uri.startsWith('http://buildkit-session/'))
        .map(({ digest }) => ({ kind: 'stdin-tar', digest })) ?? unavailable,
  };
}
export async function saveManifest(output, manifest) {
  const text = JSON.stringify(manifest, null, 2) + '\n';
  await writeFile(path.join(output, 'manifest.json.tmp'), text);
  await rename(
    path.join(output, 'manifest.json.tmp'),
    path.join(output, 'manifest.json'),
  );
  return sha256(text);
}
export async function installedBrowserVersions(scope) {
  const versions = {};
  try {
    const browsers = await import('playwright');
    for (const name of scope === 'catalog'
      ? ['chromium']
      : ['chromium', 'firefox', 'webkit']) {
      let browser;
      try {
        browser = await browsers[name].launch({
          headless: true,
          timeout: 15000,
          ...(name === 'chromium' ? { channel: 'chromium' } : {}),
        });
        versions[name] = browser.version();
      } catch {
        versions[name] = unavailable;
      } finally {
        await browser?.close().catch(() => {});
      }
    }
  } catch {
    return unavailable;
  }
  return versions;
}
export async function containerEnvironment(root) {
  const [environment, packages, browsers, playwright] = await Promise.all([
    collectEnvironment(root),
    read('/opt/clog-toolchain-packages.txt'),
    read(path.join(root, 'node_modules/playwright-core/browsers.json')),
    read(path.join(root, 'node_modules/@playwright/test/package.json')),
  ]);
  return {
    format: 1,
    environment,
    packages:
      packages?.split('\n').map((line) => line.split('\t')) ?? unavailable,
    browserTooling: {
      installedVersions: await installedBrowserVersions(
        process.env.CHECK_SCOPE,
      ),
      playwright: parse(playwright)?.version ?? unavailable,
      browsers:
        parse(browsers)?.browsers?.map(
          ({ name, revision, browserVersion }) => ({
            name,
            revision,
            browserVersion,
          }),
        ) ?? unavailable,
    },
    configuration: {
      ci: process.env.CI === 'true',
      profile: process.env.CHECK_PROFILE,
      scope: process.env.CHECK_SCOPE,
      seed: process.env.CHECK_SEED,
      repeat: process.env.CHECK_REPEAT,
      timezone: process.env.TZ,
      lang: process.env.LANG,
      lcAll: process.env.LC_ALL,
      publicOrigin: 'https://clog.example.com',
      authEnabled: true,
      botEnabled: false,
    },
  };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await writeFile(
    '.data/local-checks/container-environment.json',
    JSON.stringify(await containerEnvironment(process.cwd()), null, 2) + '\n',
  );
}
