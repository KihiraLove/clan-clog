/** Public discovery verifies selected bytes before applying any cache validator. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import { createApp } from './app.js';
import { BrandingStorage, type LogoRecord } from './branding-storage.js';
import {
  defaultBranding,
  type Branding,
  type BrandingStore,
} from './branding-store.js';

test('current bookmark images revalidate, separate worlds and retain immutable encoded assets', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'clog-current-icons-'));
  const storage = new BrandingStorage(directory);
  const records = new Map<string, LogoRecord>();
  let normal: Branding = defaultBranding,
    hardcore: Branding = {
      ...defaultBranding,
      faviconPath: '/favicon.webp?hardcore=1',
    },
    unavailable = false;
  const store: BrandingStore = {
    async settings(hc) {
      if (unavailable) throw Error('unavailable');
      return hc ? hardcore : normal;
    },
    async asset(id) {
      return records.get(id) ?? null;
    },
    async save() {
      throw Error('not a write fixture');
    },
  };
  const app = createApp(undefined, undefined, {
    branding: store,
    logos: storage,
    logger: false,
  });
  const select = async (color: string) => {
    const record = await storage.saveLogo(
      Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="20"><rect width="30" height="20" fill="${color}"/></svg>`,
      ),
    );
    records.set(record.logo.id, record);
    return {
      record,
      branding: {
        revision: 'branding-' + (records.size + 1),
        logoPath: `/api/v1/branding/${record.logo.id}.webp`,
        faviconPath: `/api/v1/branding/${record.logo.id}/favicon.webp`,
      },
    };
  };
  try {
    await storage.initialize();
    const defaults = await Promise.all(
      ['/favicon.webp', '/favicon.ico', '/apple-touch-icon.png'].map((url) =>
        app.inject(url),
      ),
    );
    for (const r of defaults) assert.equal(r.statusCode, 200, r.body);
    const red = await select('#ff000080');
    normal = red.branding;
    const blue = await select('#0000ff');
    hardcore = blue.branding;
    for (const [path, type] of [
      ['/favicon.webp', 'image/webp'],
      ['/favicon.ico', 'image/vnd.microsoft.icon'],
      ['/apple-touch-icon.png', 'image/png'],
    ] as const) {
      const index =
        path === '/favicon.webp' ? 0 : path === '/favicon.ico' ? 1 : 2;
      const r = await app.inject({
        url: path,
        headers: { 'if-none-match': defaults[index]!.headers.etag as string },
      });
      assert.equal(r.statusCode, 200);
      assert.equal(r.headers['content-type'], type);
      assert.equal(
        r.headers['cache-control'],
        'public, max-age=0, must-revalidate',
      );
      assert.equal(r.headers['x-content-type-options'], 'nosniff');
      const png = path.endsWith('.ico')
        ? r.rawPayload.subarray(22)
        : r.rawPayload;
      const meta = await sharp(png).metadata();
      assert.equal(meta.width, path.endsWith('.png') ? 180 : 64);
      assert.equal(meta.hasAlpha, true);
      if (path.endsWith('.ico')) {
        assert.deepEqual([...r.rawPayload.subarray(0, 6)], [0, 0, 1, 0, 1, 0]);
        assert.equal(r.rawPayload.readUInt32LE(14), png.length);
        assert.equal(r.rawPayload.readUInt32LE(18), 22);
      }
      const conditional = await app.inject({
        url: path,
        headers: { 'if-none-match': 'W/' + r.headers.etag },
      });
      assert.equal(conditional.statusCode, 304);
      assert.equal(conditional.body, '');
      const head = await app.inject({ method: 'HEAD', url: path });
      assert.equal(head.statusCode, 200);
      assert.equal(head.body, '');
      assert.equal(head.headers.etag, r.headers.etag);
      const hc = await app.inject(path + '?hardcore=1');
      assert.notEqual(hc.headers.etag, r.headers.etag);
      assert.equal((await app.inject(path)).headers.etag, r.headers.etag);
      const suffix = path.endsWith('.png')
        ? 'apple-touch-icon.png'
        : path.slice(1);
      const immutable = await app.inject(
        `/api/v1/branding/${red.record.logo.id}/${suffix}`,
      );
      assert.deepEqual(immutable.rawPayload, r.rawPayload);
      assert.match(immutable.headers['cache-control'] as string, /immutable/u);
      normal = { ...defaultBranding, revision: 'branding-10' };
      const reset = await app.inject({
        url: path,
        headers: { 'if-none-match': r.headers.etag as string },
      });
      assert.equal(reset.statusCode, 200);
      assert.deepEqual(reset.rawPayload, defaults[index]!.rawPayload);
      normal = red.branding;
    }
    unavailable = true;
    for (const path of [
      '/favicon.webp',
      '/favicon.ico',
      '/apple-touch-icon.png',
    ]) {
      const r = await app.inject({
        url: path,
        headers: { 'if-none-match': '*' },
      });
      assert.equal(r.statusCode, 503);
      assert.equal(r.headers['cache-control'], 'no-store');
    }
    unavailable = false;
    await writeFile(
      join(directory, red.record.favicon.id + '.webp'),
      'corrupt',
    );
    const corrupt = await app.inject({
      url: '/apple-touch-icon.png',
      headers: { 'if-none-match': '*' },
    });
    assert.equal(corrupt.statusCode, 503);
    assert.equal(corrupt.headers['cache-control'], 'no-store');
    normal = {
      ...red.branding,
      faviconPath: `/api/v1/branding/${randomUUID()}/favicon.webp`,
    };
    assert.equal((await app.inject('/favicon.ico')).statusCode, 503);
  } finally {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  }
});
