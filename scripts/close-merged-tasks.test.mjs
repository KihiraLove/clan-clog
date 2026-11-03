/** Exercise the exact no-checkout workflow program without contacting GitHub. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
const workflow = (
  await readFile(
    new URL('../.github/workflows/close-merged-tasks.yml', import.meta.url),
    'utf8',
  )
).replaceAll('\r\n', '\n');
const program = workflow
  .split("          node <<'NODE'\n")[1]
  .split('\n          NODE')[0]
  .split('\n')
  .map((line) => line.slice(10))
  .join('\n');
const repository = 'KihiraLove/clan-clog';
const fixture = () => ({
  action: 'closed',
  pull_request: {
    number: 999,
    merged: true,
    body: 'Closes #128.\n',
    head: { repo: { full_name: repository } },
    base: { ref: 'minor/1.1.0', repo: { full_name: repository } },
  },
});
async function run(event, issue = { state: 'open' }, status = 200) {
  const calls = [],
    errors = [],
    process = {
      env: {
        GITHUB_EVENT_PATH: 'fixture.json',
        GITHUB_REPOSITORY: repository,
        GH_TOKEN: 'synthetic-token',
      },
      exitCode: 0,
    };
  await vm.runInNewContext(program, {
    process,
    require: (name) => {
      assert.equal(name, 'node:fs');
      return { readFileSync: () => JSON.stringify(event) };
    },
    console: { log: () => {}, error: (message) => errors.push(message) },
    fetch: async (url, options) => {
      calls.push({ url, ...options });
      const code =
        typeof status === 'function' ? status(options.method) : status;
      return { ok: code === 200, status: code, json: async () => issue };
    },
  });
  return { calls, errors, exitCode: process.exitCode };
}
test('a merged release PR closes only its explicit same-repository task issues', async () => {
  const event = fixture();
  event.pull_request.body +=
    'Closes #128\nFixes #129\n> Closes #130\n```text\nCloses #131\n```\nCloses other/repo#132\nAn example: Closes #133\n';
  const result = await run(event);
  assert.deepEqual(
    result.calls.map(({ url, method }) => [
      url.split('/').at(-1),
      method ?? 'GET',
    ]),
    [
      ['128', 'GET'],
      ['128', 'PATCH'],
      ['129', 'GET'],
      ['129', 'PATCH'],
    ],
  );
  for (const call of result.calls.filter(({ method }) => method === 'PATCH'))
    assert.deepEqual(JSON.parse(call.body), {
      state: 'closed',
      state_reason: 'completed',
    });
});
test('unmerged, foreign, wrong-base and undeclared PRs never close an issue', async () => {
  for (const change of [
    (e) => (e.pull_request.merged = false),
    (e) => (e.action = 'opened'),
    (e) => (e.pull_request.head.repo.full_name = 'other/repo'),
    (e) => (e.pull_request.base.ref = 'main'),
    (e) => (e.pull_request.body = 'Refs #128'),
  ]) {
    const event = fixture();
    change(event);
    assert.equal((await run(event)).calls.length, 0);
  }
  assert.equal((await run(fixture(), { state: 'closed' })).calls.length, 1);
  assert.equal(
    (await run(fixture(), { state: 'open', pull_request: {} })).calls.length,
    1,
  );
});
test('an unavailable issue or denied closure fails visibly without printing credentials', async () => {
  for (const status of [403, (method) => (method === 'PATCH' ? 403 : 200)]) {
    const result = await run(fixture(), { state: 'open' }, status);
    assert.equal(result.exitCode, 1);
    assert.match(result.errors[0], /403/u);
    assert.ok(!result.errors.join('').includes('synthetic-token'));
  }
  assert.doesNotMatch(workflow, /actions\/checkout/u);
});
