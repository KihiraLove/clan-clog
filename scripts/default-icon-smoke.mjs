/** Focused production-image/static/default-icon/restart/logical-restore check on owned disposable data. */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { DEFAULT_ITEM_ICON_PATH } from '../packages/domain/src/catalog-icons.ts';

const image = process.env.CHECK_APP_IMAGE;
if (!image) throw Error('Set CHECK_APP_IMAGE to a built disposable test image');
const id = 'clog-checks-default-icon-' + randomBytes(6).toString('hex'),
  volume = id + '-data';
const exec = promisify(execFile),
  label = 'clog.local-checks';
const origin = 'https://clog.example.com',
  password = randomBytes(32).toString('hex');
const provenance = JSON.parse(
  await readFile(
    new URL('../catalog/default-icon.json', import.meta.url),
    'utf8',
  ),
);
async function docker(...args) {
  return (
    await exec('docker', args, {
      timeout: 180000,
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
    })
  ).stdout.trim();
}
const node = (code) =>
  docker('exec', id, 'node', '--input-type=module', '-e', code);
async function diagnostics() {
  if (
    (await docker(
      'inspect',
      '--format',
      `{{index .Config.Labels "${label}"}}`,
      id,
    ).catch(() => undefined)) !== id
  )
    return;
  const logs = await exec('docker', ['logs', '--tail', '50', id], {
    windowsHide: true,
  }).catch(() => undefined);
  if (logs)
    console.error(
      (logs.stdout + logs.stderr).replaceAll(password, '[synthetic password]'),
    );
}
async function ready() {
  for (let n = 0; n < 90; n++) {
    if (
      (await docker('inspect', '--format', '{{.State.Status}}', id)) !==
      'running'
    )
      throw Error('Disposable installation exited during startup');
    if (n === 5) await diagnostics();
    if (
      (await node(
        "console.log((await fetch('http://127.0.0.1:8080/readyz',{signal:AbortSignal.timeout(3000)}).catch(()=>({status:0}))).status)",
      ).catch(() => '')) === '200'
    )
      return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw Error('Disposable installation did not become ready');
}
async function request(
  path,
  body,
  headers = {},
  method = body === undefined ? 'GET' : 'POST',
) {
  return JSON.parse(
    await node(
      `const r=await fetch(${JSON.stringify('http://127.0.0.1:8080' + path)},{method:${JSON.stringify(method)},headers:${JSON.stringify({ Origin: origin, 'Content-Type': 'application/json', ...headers })},${body === undefined ? '' : 'body:' + JSON.stringify(JSON.stringify(body)) + ','}});console.log(JSON.stringify({status:r.status,cookie:r.headers.get('set-cookie'),body:await r.json()}));`,
    ),
  );
}
async function asset(path) {
  return JSON.parse(
    await node(
      `import {createHash} from 'node:crypto';const r=await fetch(${JSON.stringify('http://127.0.0.1:8080' + path)});const b=Buffer.from(await r.arrayBuffer());console.log(JSON.stringify({status:r.status,type:r.headers.get('content-type'),bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')}));`,
    ),
  );
}
const sql = (database, statement) =>
  docker(
    'exec',
    '--user',
    '999',
    id,
    'psql',
    '-h',
    '/run/clog/postgres',
    '-U',
    'clog',
    '-d',
    database,
    '-Atc',
    statement,
  );
try {
  await docker('image', 'inspect', image);
  await docker('volume', 'create', '--label', `${label}=${id}`, volume);
  await docker(
    'run',
    '--detach',
    '--pull',
    'never',
    '--name',
    id,
    '--label',
    `${label}=${id}`,
    '--network',
    'none',
    '--mount',
    `type=volume,source=${volume},target=/data`,
    '--env',
    'PUBLIC_ORIGIN=' + origin,
    '--env',
    'ADMIN_BOOTSTRAP_PASSWORD=' + password,
    '--env',
    'BOT_SETTINGS_MODE=disabled',
    image,
  );
  await ready();
  const bundled = await asset(DEFAULT_ITEM_ICON_PATH);
  assert.deepEqual(bundled, {
    status: 200,
    type: 'image/webp',
    bytes: provenance.bytes,
    sha256: provenance.sha256,
  });
  const login = await request('/api/v1/auth/login', {
    username: 'admin',
    password,
  });
  assert.equal(login.status, 200);
  const setup = await request(
    '/api/v1/auth/account',
    {
      username: 'icon-owner',
      currentPassword: password,
      newPassword: 'default-icon-smoke-permanent',
    },
    {
      Cookie: login.cookie.split(';')[0],
      'X-CSRF-Token': login.body.csrfToken,
    },
    'PATCH',
  );
  assert.equal(setup.status, 200);
  const headers = {
    Cookie: setup.cookie.split(';')[0],
    'X-CSRF-Token': setup.body.csrfToken,
  };
  const catalog = await request('/api/v1/admin/catalog', undefined, headers);
  assert.equal(catalog.status, 200);
  const pageIds = catalog.body.pages.slice(0, 2).map((page) => page.id);
  assert.equal(pageIds.length, 2);
  const fields = {
    name: 'Default icon smoke first',
    gameItemIds: [1900000101],
    pageIds,
  };
  const create = async (body, key) => {
    const result = await request('/api/v1/admin/catalog/items', body, {
      ...headers,
      'Idempotency-Key': key,
    });
    assert.equal(result.status, 201);
    return result.body;
  };
  const first = await create(fields, 'default-icon-smoke-first');
  assert.equal(first.item.iconPath, DEFAULT_ITEM_ICON_PATH);
  assert.ok(!first.item.overrides.includes('icon'));
  assert.deepEqual(await create(fields, 'default-icon-smoke-first'), first);
  const second = await create(
    { ...fields, name: 'Default icon smoke second', gameItemIds: [1900000102] },
    'default-icon-smoke-second',
  );
  assert.equal(second.item.iconPath, first.item.iconPath);
  assert.equal(await sql('clog', 'SELECT count(*) FROM catalog_assets'), '0');
  const upload = JSON.parse(
    await node(
      `import {readFile} from 'node:fs/promises';const f=new FormData();f.set('icon',new Blob([await readFile('/usr/share/nginx/html/catalog/default.webp')],{type:'image/webp'}),'selected.webp');const r=await fetch('http://127.0.0.1:8080/api/v1/admin/catalog/icons',{method:'POST',headers:${JSON.stringify({ Origin: origin, ...headers })},body:f});console.log(JSON.stringify({status:r.status,body:await r.json()}));`,
    ),
  );
  assert.equal(upload.status, 201);
  const custom = await create(
    {
      ...fields,
      name: 'Default icon smoke custom',
      gameItemIds: [1900000103],
      iconAssetId: upload.body.assetId,
    },
    'default-icon-smoke-custom',
  );
  assert.notEqual(custom.item.iconPath, DEFAULT_ITEM_ICON_PATH);
  assert.ok(custom.item.overrides.includes('icon'));
  const customBytes = await asset(custom.item.iconPath);
  assert.equal(customBytes.status, 200);
  const snapshot = `SELECT json_build_object('items',(SELECT json_agg(row_to_json(i) ORDER BY id) FROM items i WHERE name LIKE 'Default icon smoke %'),'receipts',(SELECT json_agg(row_to_json(r) ORDER BY request_key) FROM catalog_requests r WHERE request_key LIKE 'default-icon-smoke-%'),'memberships',(SELECT json_agg(row_to_json(p) ORDER BY page_id,item_id) FROM page_items p WHERE item_id IN(SELECT id FROM items WHERE name LIKE 'Default icon smoke %')))`;
  const before = JSON.parse(await sql('clog', snapshot));
  await docker(
    'exec',
    '--user',
    '999',
    id,
    'pg_dump',
    '-h',
    '/run/clog/postgres',
    '-U',
    'clog',
    '-d',
    'clog',
    '-Fc',
    '--file=/tmp/default-icon.dump',
  );
  await docker(
    'exec',
    '--user',
    '999',
    id,
    'createdb',
    '-h',
    '/run/clog/postgres',
    '-U',
    'clog',
    'default_icon_restored',
  );
  await docker(
    'exec',
    '--user',
    '999',
    id,
    'pg_restore',
    '-h',
    '/run/clog/postgres',
    '-U',
    'clog',
    '--no-owner',
    '--dbname=default_icon_restored',
    '/tmp/default-icon.dump',
  );
  assert.deepEqual(
    JSON.parse(await sql('default_icon_restored', snapshot)),
    before,
  );
  await docker('restart', '--timeout', '30', id);
  await ready();
  assert.deepEqual(await asset(DEFAULT_ITEM_ICON_PATH), bundled);
  assert.deepEqual(await asset(custom.item.iconPath), customBytes);
  assert.deepEqual(await create(fields, 'default-icon-smoke-first'), first);
  console.log(
    JSON.stringify({
      status: 'passed',
      defaultSha256: bundled.sha256,
      checks: [
        'production WebP bytes/MIME',
        'shared defaults without uploads',
        'custom WebP upload',
        'exact idempotent replay',
        'logical database dump/restore preserves items, receipts and memberships',
        'restart preserves bundled/custom bytes and receipt',
      ],
    }),
  );
} catch (error) {
  await diagnostics();
  throw error;
} finally {
  if (
    (await docker(
      'inspect',
      '--format',
      `{{index .Config.Labels "${label}"}}`,
      id,
    ).catch(() => undefined)) === id
  )
    await docker('rm', '--force', '--volumes', id);
  if (
    (await docker(
      'volume',
      'inspect',
      '--format',
      `{{index .Labels "${label}"}}`,
      volume,
    ).catch(() => undefined)) === id
  )
    await docker('volume', 'rm', volume);
}
