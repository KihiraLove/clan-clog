import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyWomNameChange } from './wom-names.js';
const player = (username: string, id = 42) => ({
  id,
  username,
  status: 'active',
});
const change = (
  oldName = 'Old Name',
  newName = 'New Name',
  id = 10,
  resolvedAt = '2026-11-01T12:00:00Z',
) => ({ id, playerId: 42, oldName, newName, status: 'approved', resolvedAt });
function fixture(values: Record<string, unknown | Response | Error>) {
  const calls: string[] = [];
  const request: typeof fetch = async (url, init) => {
    assert.equal(init?.method, 'GET');
    assert.equal(init?.redirect, 'error');
    assert.ok(init?.signal);
    const parsed = new URL(String(url));
    assert.equal(parsed.origin, 'https://api.wiseoldman.net');
    calls.push(parsed.pathname);
    const value =
      values[decodeURIComponent(parsed.pathname.replace('/v2/players/', ''))];
    if (value instanceof Error) throw value;
    return value instanceof Response
      ? value
      : Response.json(value ?? {}, { status: value === undefined ? 404 : 200 });
  };
  return { request, calls };
}
test('approved exact current-player proof succeeds even when the old WOM profile no longer exists', async () => {
  const { request, calls } = fixture({
    'new name': player('new_name'),
    'new name/names': [change()],
  });
  const value = await verifyWomNameChange(
    'Old_Name',
    'New Name',
    undefined,
    request,
  );
  assert.equal(value.kind, 'verified');
  if (value.kind === 'verified') {
    assert.equal(value.evidence.playerId, 42);
    assert.deepEqual(value.evidence.changes, [change()]);
  }
  assert.deepEqual(calls, [
    '/v2/players/new%20name',
    '/v2/players/new%20name/names',
    '/v2/players/old%20name',
  ]);
});
test('ordered approved chains use parsed timestamps and ignore unrelated prefix matches', async () => {
  const rows = [
    change('Middle', 'New Name', 12, '2026-11-01T11:30:00Z'),
    change('Old Name', 'Middle', 11, '2026-11-01T12:00:00+01:00'),
  ];
  const { request } = fixture({
    'new name': player('New Name'),
    'new name/names': rows,
  });
  const result = await verifyWomNameChange(
    'Old Name',
    'New Name',
    undefined,
    request,
  );
  assert.equal(result.kind, 'verified');
  if (result.kind === 'verified')
    assert.deepEqual(
      result.evidence.changes.map((c) => c.id),
      [11, 12],
    );
});
test('missing proof requests WOM first only when the old current profile exists', async () => {
  for (const names of [
    [],
    [change('Old Names')],
    [change('Other', 'New Name')],
  ]) {
    const { request } = fixture({
      'new name': player('New Name'),
      'new name/names': names,
      'old name': player('Old Name'),
    });
    assert.deepEqual(
      await verifyWomNameChange('Old Name', 'New Name', undefined, request),
      { kind: 'wom_first' },
    );
  }
  assert.deepEqual(
    await verifyWomNameChange(
      'Old Name',
      'New Name',
      undefined,
      fixture({}).request,
    ),
    { kind: 'staff_required' },
  );
});
test('pending, mismatched, recycled, archived, malformed and unavailable WOM data never authorize mutation', async () => {
  const cases = [
    { 'new name/names': [{ ...change(), status: 'pending' }] },
    { 'new name/names': [{ ...change(), playerId: 43 }] },
    { 'new name/names': [{ ...change(), resolvedAt: 'not a date' }] },
    { 'new name/names': [change(), change()] },
    { 'old name': player('Old Name', 77) },
    { 'new name': { ...player('New Name'), status: 'archived' } },
    { 'new name': { id: 42, username: 'New Name' } },
    { 'new name': player('New Names') },
    { 'new name/names': new Response('x', { status: 503 }) },
    { 'new name/names': new Response('{') },
    {
      'new name/names': new Response('[]', {
        headers: { 'content-length': String(1024 * 1024) },
      }),
    },
    { 'new name/names': new Response(' '.repeat(512 * 1024 + 1)) },
    { 'new name': new Error('network') },
  ];
  for (const value of cases) {
    const { request } = fixture({
      'new name': player('New Name'),
      'new name/names': [change()],
      ...value,
    });
    assert.deepEqual(
      await verifyWomNameChange('Old Name', 'New Name', undefined, request),
      { kind: 'staff_required' },
    );
  }
});
test('cancelled WOM requests fail closed', async () => {
  const controller = new AbortController();
  controller.abort();
  const request: typeof fetch = async (_url, init) => {
    assert.ok(init?.signal?.aborted);
    throw Error('aborted');
  };
  assert.deepEqual(
    await verifyWomNameChange('Old', 'New', controller.signal, request),
    { kind: 'staff_required' },
  );
});
