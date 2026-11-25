/** Build the application from the accepted archive, after other gates may write outputs. */
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compressSourceArchive, fingerprintFile } from './check-source.mjs';

export async function verifyAcceptedSource(archive, expected) {
  if (
    !/^[a-f0-9]{64}$/u.test(expected ?? '') ||
    (await fingerprintFile(archive)).fingerprint !== expected
  )
    throw Error('Accepted source archive is missing or changed');
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (
    !/^clog-checks-[a-z0-9-]+$/u.test(process.env.COMPOSE_PROJECT_NAME ?? '') ||
    !process.env.CHECK_APP_IMAGE
  )
    throw Error('Use the disposable acceptance runner');
  const archive = '/tmp/clog-accepted-source.tar';
  await verifyAcceptedSource(archive, process.env.CHECK_SOURCE_FINGERPRINT);
  const temporary = await mkdtemp(path.join(tmpdir(), 'clog-app-source-'));
  const compressed = path.join(temporary, 'source.tar.gz');
  try {
    await compressSourceArchive(archive, compressed);
    const child = spawn('docker', process.argv.slice(2), {
      stdio: ['pipe', 'inherit', 'inherit'],
    });
    const input = createReadStream(compressed);
    input.on('error', () => child.kill('SIGTERM'));
    child.stdin.on('error', () => {});
    input.pipe(child.stdin);
    const stop = () => child.kill('SIGTERM');
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
    try {
      process.exitCode = await new Promise((resolve, reject) => {
        child.once('error', reject);
        child.once('close', (code) => resolve(code ?? 1));
      });
    } finally {
      input.destroy();
      process.off('SIGINT', stop);
      process.off('SIGTERM', stop);
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
