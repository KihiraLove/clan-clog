/** Bounded artifact allowlists; never upload a checkout, .env, dumps or raw inspect. */
import {
  copyFile,
  lstat,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';

export const artifactPolicy = {
  format: 1,
  retentionDays: 14,
  compactBytes: 8 * 1024 * 1024,
  traceBytes: 64 * 1024 * 1024,
  maxFiles: 200,
};
export async function browserEvidence(output, suites) {
  const result = {};
  for (const suite of suites) {
    try {
      const report = JSON.parse(
        await readFile(path.join(output, suite + '-report.json'), 'utf8'),
      );
      const policy = JSON.parse(
        await readFile(path.join(output, suite + '-policy.json'), 'utf8').catch(
          () => '{"unavailable":true}',
        ),
      );
      const cases = [];
      const visit = (groups) => {
        for (const group of groups ?? []) {
          for (const spec of group.specs ?? [])
            for (const test of spec.tests ?? [])
              cases.push({
                file: spec.file,
                line: spec.line,
                title: spec.title,
                project: test.projectName,
                repeat: test.repeatEachIndex,
                expected: test.expectedStatus,
                status: test.status,
                attempts: (test.results ?? []).map(
                  ({ status, retry, duration, startTime }) => ({
                    status,
                    retry,
                    duration,
                    startTime,
                  }),
                ),
              });
          visit(group.suites);
        }
      };
      visit(report.suites);
      result[suite] = { policy, stats: report.stats, cases };
    } catch {
      result[suite] = { unavailable: true };
    }
  }
  return result;
}

export async function prepareArtifacts(
  output,
  manifest,
  result,
  policy = artifactPolicy,
) {
  const compact = path.join(output, 'artifacts', 'compact'),
    traces = path.join(output, 'artifacts', 'traces');
  await mkdir(compact, { recursive: true });
  let compactBytes = 0;
  const writeCompact = async (name, value) => {
    const text = JSON.stringify(value, null, 2) + '\n';
    compactBytes += Buffer.byteLength(text);
    if (compactBytes > Math.max(0, policy.compactBytes - 4096))
      throw Error('Compact artifact exceeds its evidence budget');
    await writeFile(path.join(compact, name), text);
  };
  const summary = {
    format: 1,
    runId: manifest.runId,
    manifestSha256: result.manifestSha256,
    sourceFingerprint: result.sourceFingerprint,
    scope: result.scope,
    status: result.status,
    interrupted: result.interrupted,
    gates: result.gates.map(({ name, status, durationMs, code }) => ({
      name,
      status,
      durationMs,
      code,
    })),
    browser: manifest.browserEvidence,
    evidenceErrors: result.evidenceErrors,
    missingReports: result.missingReports,
    cleanupErrors: result.cleanupErrors,
    policy,
  };
  for (const [name, value] of [
    ['manifest.json', manifest],
    ['summary.json', summary],
  ]) {
    await writeCompact(name, value);
  }
  // Traces contain only disposable synthetic test traffic; no host files/logs.
  const retained = [],
    omitted = [];
  let bytes = 0,
    omittedCount = 0;
  async function visit(directory, relative = '') {
    const directoryState = await lstat(directory).catch(() => undefined);
    if (!directoryState?.isDirectory() || directoryState.isSymbolicLink())
      return;
    const children = await readdir(directory, { withFileTypes: true }).catch(
      () => [],
    );
    for (const entry of children.sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
    )) {
      if (entry.isSymbolicLink()) continue;
      const name = path.join(relative, entry.name),
        file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(file, name);
        continue;
      }
      if (!entry.isFile() || !/\.(?:zip|png)$/u.test(entry.name)) continue;
      const info = await lstat(file);
      if (!info.isFile() || info.isSymbolicLink()) continue;
      if (
        bytes + info.size > policy.traceBytes ||
        retained.length >= policy.maxFiles
      ) {
        omittedCount++;
        if (omitted.length < policy.maxFiles) omitted.push(name);
        continue;
      }
      const destination = path.join(traces, name);
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(file, destination);
      retained.push({ path: name.replaceAll('\\', '/'), bytes: info.size });
      bytes += info.size;
    }
  }
  if (result.status !== 'passed' || result.scope === 'catalog')
    await visit(path.join(output, 'browser'));
  await writeCompact('retention.json', {
    ...policy,
    retained,
    omitted,
    omittedCount,
    bytes,
  });
  const advisory = await readFile(
    path.join(output, 'dependencies.json'),
    'utf8',
  ).catch(() => undefined);
  if (advisory && Buffer.byteLength(advisory) < 128 * 1024) {
    const {
      format,
      checkedAt,
      status,
      lockfileSha256,
      counts,
      packages,
      reason,
    } = JSON.parse(advisory);
    await writeCompact('dependencies.json', {
      format,
      checkedAt,
      status,
      lockfileSha256,
      counts,
      packages,
      reason,
    });
  }
  return { retained: retained.length, omitted: omittedCount, bytes };
}
