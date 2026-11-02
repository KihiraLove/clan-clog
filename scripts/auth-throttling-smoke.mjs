/** Focused auth/storage/Nginx checks. Creates only uniquely named disposable resources. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
const image = process.env.CHECK_APP_IMAGE;
if (!image) throw Error('Set CHECK_APP_IMAGE to the disposable test image');
const prefix = 'clog-auth-' + randomBytes(6).toString('hex');
const names = [],
  volume = prefix + '-data';
const origin = 'https://auth.example.test',
  password = 'a'.repeat(64);
async function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: options.env ?? process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '',
      stderr = '';
    const timer = setTimeout(() => child.kill('SIGTERM'), 180000);
    child.stdout.on('data', (s) => (stdout += s));
    child.stderr.on('data', (s) => (stderr += s));
    child.once('error', reject);
    child.once('close', (code) => {
      clearTimeout(timer);
      if (code !== 0 && !options.ignore)
        reject(
          Error(
            command +
              ' ' +
              args[0] +
              ' failed: ' +
              (stderr || stdout).replace(
                /Temporary password: \S+/gu,
                'Temporary password: [redacted]',
              ),
          ),
        );
      else resolve((options.combine ? stdout + '\n' + stderr : stdout).trim());
    });
    child.stdin.on('error', () => {});
    child.stdin.end(options.input);
  });
}
const docker = (args, options) => run('docker', args, options);
const exec = (name, code) =>
  docker(['exec', '-i', name, 'node', '--input-type=module'], { input: code });
async function start(name, args) {
  await docker(['run', '-d', '--name', name, ...args]);
  names.push(name);
  return name;
}
async function until(check) {
  for (let n = 0; n < 120; n++) {
    if (await check().catch(() => false)) return;
    await delay(500);
  }
  throw Error('Disposable readiness deadline expired');
}
try {
  await docker(['network', 'create', prefix]);
  await docker(['volume', 'create', volume]);
  const clientArgs = [
    '--network',
    prefix,
    '--entrypoint',
    'node',
    image,
    '-e',
    'setInterval(()=>{},1000)',
  ];
  const a = await start(prefix + '-a', clientArgs),
    b = await start(prefix + '-b', clientArgs),
    edge = await start(prefix + '-edge', clientArgs);
  const inspect = JSON.parse(await docker(['inspect', edge]));
  const edgeIp = Object.values(inspect[0].NetworkSettings.Networks)[0]
    .IPAddress;
  const app = await start(prefix + '-app', [
    '--network',
    prefix,
    '-v',
    volume + ':/data',
    '-e',
    'PUBLIC_ORIGIN=' + origin,
    '-e',
    'ADMIN_BOOTSTRAP_PASSWORD=' + password,
    '-e',
    'BOT_SETTINGS_MODE=disabled',
    '-e',
    'TRUSTED_PROXY_CIDRS=127.0.0.1/32,::1/128,' + edgeIp + '/32',
    image,
  ]);
  await until(
    async () =>
      (await exec(
        a,
        `console.log((await fetch('http://${app}:8080/readyz').catch(()=>({status:0}))).status)`,
      )) === '200',
  );
  async function request(client, route, body, headers = {}) {
    return JSON.parse(
      await exec(
        client,
        `const r=await fetch(${JSON.stringify('http://' + app + ':8080' + route)},{method:${JSON.stringify(body === undefined ? 'GET' : route.endsWith('/account') ? 'PATCH' : 'POST')},headers:${JSON.stringify({ Origin: origin, 'Content-Type': 'application/json', ...headers })},${body === undefined ? '' : 'body:' + JSON.stringify(JSON.stringify(body)) + ','}});console.log(JSON.stringify({status:r.status,retry:r.headers.get('retry-after'),cache:r.headers.get('cache-control'),cookie:r.headers.get('set-cookie'),body:await r.text()}));`,
      ),
    );
  }
  const login = (client, username, password = 'wrong-password', forwarded) =>
    request(
      client,
      '/api/v1/auth/login',
      { username, password },
      forwarded ? { 'X-Forwarded-For': forwarded } : {},
    );
  const first = await login(a, 'admin', password);
  assert.equal(first.status, 200);
  const session = JSON.parse(first.body);
  const saved = await request(
    a,
    '/api/v1/auth/account',
    {
      currentPassword: password,
      newPassword: 'permanent-auth-test-password',
      username: 'owner',
    },
    { Cookie: first.cookie.split(';')[0], 'X-CSRF-Token': session.csrfToken },
  );
  assert.equal(saved.status, 200);
  // All successes count. Rotated usernames exhaust this real client's source.
  for (let n = 0; n < 19; n++)
    assert.equal((await login(a, 'unknown-' + n)).status, 401);
  const spoofed = await login(
    a,
    'owner',
    'permanent-auth-test-password',
    '203.0.113.200',
  );
  assert.equal(spoofed.status, 429);
  assert.equal(spoofed.cache, 'no-store');
  assert.ok(Number(spoofed.retry) > 0 && Number(spoofed.retry) <= 60);
  assert.equal(
    (await login(b, 'owner', 'permanent-auth-test-password')).status,
    200,
  );
  const cookie = saved.cookie.split(';')[0],
    csrf = JSON.parse(saved.body).csrfToken;
  assert.equal(
    JSON.parse(
      (await request(a, '/api/v1/auth/session', undefined, { Cookie: cookie }))
        .body,
    ).authenticated,
    true,
  );
  assert.equal(
    (
      await request(
        a,
        '/api/v1/auth/logout',
        {},
        { Cookie: cookie, 'X-CSRF-Token': csrf },
      )
    ).status,
    204,
  );
  // Explicitly trusted external proxy: forged left prefixes cannot change the
  // nearest untrusted client bucket carried through bundled Nginx.
  for (let n = 0; n < 20; n++)
    assert.equal(
      (await login(edge, 'edge-unknown-' + n, undefined, '198.51.100.10'))
        .status,
      401,
    );
  assert.equal(
    (await login(edge, 'edge-extra', undefined, '203.0.113.9, 198.51.100.10'))
      .status,
    429,
  );
  assert.equal(
    (await login(edge, 'fresh-client', undefined, '198.51.100.11')).status,
    401,
  );
  for (let n = 0; n < 4; n++)
    assert.equal(
      (await login(edge, 'OWNER', undefined, '198.51.100.' + (20 + n))).status,
      401,
    );
  assert.equal(
    (
      await login(
        edge,
        'owner',
        'permanent-auth-test-password',
        '198.51.100.24',
      )
    ).status,
    429,
  );
  const logs = await docker(['logs', app], { combine: true });
  assert.ok(
    logs.includes('AUTH_SOURCE_LIMIT') && logs.includes('AUTH_IDENTITY_LIMIT'),
  );
  for (const value of [
    '198.51.100.',
    '203.0.113.',
    'wrong-password',
    'edge-unknown-',
  ])
    assert.ok(!logs.includes(value));
  console.log(
    'Disposable Nginx auth checks passed: distinct clients, trusted proxy chain, spoofed prefixes, source/identity budgets, session/logout and sanitized diagnostics.',
  );

  // Compile the current host checkout, not the image's isolated runtime output.
  for (const workspace of [
    '@clog/domain',
    '@clog/database',
    '@clog/bot',
    '@clog/api',
  ])
    await run('npm', ['run', 'build', '-w', workspace]);

  const db = await start(prefix + '-db', [
    '-e',
    'POSTGRES_PASSWORD=disposable-auth-test',
    '-e',
    'POSTGRES_DB=auth_test',
    '-p',
    '127.0.0.1::5432',
    'postgres:17-bookworm',
  ]);
  await until(async () => {
    await docker([
      'exec',
      db,
      'pg_isready',
      '-U',
      'postgres',
      '-d',
      'auth_test',
    ]);
    return true;
  });
  const port = (await docker(['port', db, '5432/tcp'])).split(':').at(-1);
  const output = await run(
    process.execPath,
    [
      '--test',
      'apps/api/dist/auth-rate-store.test.js',
      'apps/api/dist/store.test.js',
    ],
    {
      env: {
        ...process.env,
        TEST_DATABASE_URL: `postgres://postgres:disposable-auth-test@127.0.0.1:${port}/auth_test`,
      },
    },
  );
  console.log(output);
  console.log(
    'Disposable PostgreSQL concurrency, expiry, cleanup, capacity, storage-failure and existing account/session checks passed.',
  );
} finally {
  for (const name of names.reverse()) {
    assert.ok(name.startsWith(prefix + '-'));
    await docker(['rm', '-f', '-v', name], { ignore: true });
  }
  await docker(['volume', 'rm', volume], { ignore: true });
  await docker(['network', 'rm', prefix], { ignore: true });
}
