/** Focused real-Nginx favicon check; only the synthetic bookmark fixture is accepted. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

if (
  process.env.FAVICON_PROXY_SMOKE_TEST !== '1' ||
  process.env.PUBLIC_ORIGIN !== 'https://clog.example.com'
)
  throw Error('Run only in a disposable bookmark fixture at the CI origin');
const origin = process.env.PUBLIC_ORIGIN;
async function request(path, options = {}) {
  const r = await fetch('http://127.0.0.1:8080' + path, {
    signal: AbortSignal.timeout(15000),
    ...options,
  });
  for (const [header, value] of [
    ['x-content-type-options', 'nosniff'],
    ['referrer-policy', 'no-referrer'],
    ['x-frame-options', 'DENY'],
  ])
    assert.equal(r.headers.get(header), value);
  assert.match(r.headers.get('content-security-policy'), /script-src 'self'/);
  return r;
}
const login = await request('/api/v1/auth/login', {
  method: 'POST',
  headers: { Origin: origin, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'bookmark-owner',
    password: 'bookmark129-fixture-password',
  }),
});
assert.equal(login.status, 200);
const session = await login.json(),
  auth = {
    Origin: origin,
    Cookie: login.headers.get('set-cookie').split(';')[0],
    'X-CSRF-Token': session.csrfToken,
  };
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function icon(path, prior) {
  const r = await request(path, {
    headers: prior ? { 'If-None-Match': prior } : {},
  });
  assert.equal(r.status, 200, path);
  const bytes = Buffer.from(await r.arrayBuffer());
  assert.equal(r.headers.get('etag'), '"' + digest(bytes) + '"');
  assert.equal(
    r.headers.get('cache-control'),
    'public, max-age=0, must-revalidate',
  );
  const type = path.endsWith('.ico')
    ? 'image/vnd.microsoft.icon'
    : path.endsWith('.webp')
      ? 'image/webp'
      : 'image/png';
  assert.equal(r.headers.get('content-type'), type);
  const image = path.endsWith('.ico') ? bytes.subarray(22) : bytes;
  if (path.endsWith('.ico'))
    assert.deepEqual([...bytes.subarray(0, 6)], [0, 0, 1, 0, 1, 0]);
  const meta = await sharp(image).metadata();
  assert.equal(meta.format, type === 'image/webp' ? 'webp' : 'png');
  assert.equal(meta.width, type === 'image/png' ? 180 : 64);
  const head = await request(path, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('etag'), r.headers.get('etag'));
  assert.equal((await head.arrayBuffer()).byteLength, 0);
  for (const method of ['GET', 'HEAD']) {
    const cached = await request(path, {
      method,
      headers: { 'If-None-Match': r.headers.get('etag') },
    });
    assert.equal(cached.status, 304);
    assert.equal((await cached.arrayBuffer()).byteLength, 0);
  }
  return { bytes, etag: r.headers.get('etag') };
}
async function settings(hardcore = false) {
  return (
    await request('/api/v1/branding' + (hardcore ? '/hardcore' : ''))
  ).json();
}
async function upload(color, hardcore = false) {
  const before = await settings(hardcore),
    f = new FormData();
  const png = await sharp({
    create: { width: 40, height: 30, channels: 4, background: color },
  })
    .png()
    .toBuffer();
  f.set('logo', new Blob([png], { type: 'image/png' }), 'fixture.png');
  const r = await request(
    '/api/v1/admin/branding' + (hardcore ? '/hardcore' : '') + '/logo',
    {
      method: 'PUT',
      headers: { ...auth, 'If-Match': before.revision },
      body: f,
    },
  );
  assert.equal(r.status, 200);
  return r.json();
}
try {
  const before = await settings();
  assert.match(
    before.faviconPath,
    /^\/api\/v1\/branding\//,
    'fixture needs a distinctive saved logo',
  );
  const paths = ['/favicon.webp', '/favicon.ico', '/apple-touch-icon.png'];
  const old = await Promise.all(paths.map((p) => icon(p)));
  assert.deepEqual(
    old[0].bytes,
    Buffer.from(await (await request(before.faviconPath)).arrayBuffer()),
  );
  for (const path of ['/', '/xp', '/admin/settings']) {
    const html = await (await request(path)).text();
    assert.match(html, /rel="icon"[^>]+type="image\/png"/);
    assert.match(
      html,
      /rel="apple-touch-icon"[^>]+href="\/apple-touch-icon.png"/,
    );
    assert.ok(!html.includes('alternate icon'));
  }
  const hardcore = await upload('#0000ff', true);
  assert.notEqual(hardcore.faviconPath, before.faviconPath);
  assert.deepEqual(
    (await icon('/favicon.webp')).bytes,
    old[0].bytes,
    'Hardcore visitor/settings cannot change origin fallback',
  );
  assert.notDeepEqual(
    Buffer.from(
      await (await request('/favicon.webp?hardcore=1')).arrayBuffer(),
    ),
    old[0].bytes,
  );
  const next = await upload('#ff00ff80');
  for (let i = 0; i < paths.length; i++) {
    const current = await icon(paths[i], old[i].etag);
    assert.notEqual(current.etag, old[i].etag);
    const suffix =
      paths[i] === '/favicon.webp' ? 'favicon.webp' : paths[i].slice(1);
    const immutable = await request(
      next.faviconPath.replace('favicon.webp', suffix),
    );
    assert.match(immutable.headers.get('cache-control'), /immutable/);
    assert.deepEqual(Buffer.from(await immutable.arrayBuffer()), current.bytes);
  }
  const latest = await icon('/favicon.webp');
  const reset = await request('/api/v1/admin/branding/logo', {
    method: 'DELETE',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expectedRevision: next.revision }),
  });
  assert.equal(reset.status, 200);
  assert.deepEqual(
    (await icon('/favicon.webp', latest.etag)).bytes,
    await readFile('apps/web/public/favicon.webp'),
  );
  await icon('/favicon.ico');
  await icon('/apple-touch-icon.png');
  assert.equal(
    (await request('/apple-touch-icon-precomposed.png')).headers.get(
      'content-type',
    ),
    'image/png',
  );
  assert.deepEqual(
    Buffer.from(await (await request(before.faviconPath)).arrayBuffer()),
    old[0].bytes,
    'historical bytes remain',
  );
  console.log(
    JSON.stringify({
      status: 'passed',
      checks: [
        'initial root/deep HTML',
        'current custom WebP/PNG/ICO bytes and MIME',
        'GET/HEAD 200/304',
        'replacement/reset validators',
        'immutable historical bytes',
        'Hardcore independence',
        'security headers',
      ],
    }),
  );
} finally {
  await request('/api/v1/auth/logout', { method: 'POST', headers: auth });
}
