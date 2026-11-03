/** Both creation paths on a populated released schema, using disposable PostgreSQL/storage. */
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  utimes,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import pg from 'pg';
import sharp from 'sharp';
import { DEFAULT_ITEM_ICON_PATH } from '@clog/domain/catalog-icons';
import {
  runAssetMaintenance,
  assetMaintenanceDefaults,
} from '@clog/database/dist/asset-maintenance.js';
import { updateCatalog } from '@clog/database/dist/catalog-update-store.js';
import { createApp } from './app.js';
import { PgStore } from './store.js';
import {
  PgCatalogStore,
  type CreatedItem,
  type NewItem,
} from './catalog-store.js';
import { IconStorage } from './icon-storage.js';
import { hashPassword } from './passwords.js';
import { memoryProofFiles } from './tests/screenshot.js';

test(
  'optional catalog icons preserve atomic receipts, uploads, edits, restart state and shared-asset cleanup',
  { skip: !process.env.TEST_DATABASE_URL },
  async () => {
    const schema = 'default_icon_' + randomUUID().replaceAll('-', '');
    const connectionString = process.env.TEST_DATABASE_URL!;
    const root = new pg.Pool({ connectionString });
    await root.query('CREATE SCHEMA ' + schema);
    const pool = new pg.Pool({
      connectionString,
      options: '-c search_path=' + schema,
    });
    const directory = await mkdtemp(join(tmpdir(), 'clog-default-icon-'));
    const icons = new IconStorage(join(directory, 'icons')),
      store = new PgStore(pool),
      catalog = new PgCatalogStore(pool);
    const origin = 'https://clog.example.com',
      password = 'default-icon-fixture-password';
    const app = createApp(
      () => store.ready(),
      () => store.settings(),
      {
        store,
        proofs: memoryProofFiles(),
        catalog,
        icons,
        auth: { origin, secret: 'a'.repeat(64), secure: true },
        logger: false,
      },
    );
    try {
      const migrations = new URL(
        '../../../packages/database/migrations/',
        import.meta.url,
      );
      for (const file of (await readdir(migrations))
        .filter((name) => /^\d+_.+\.sql$/u.test(name))
        .sort())
        await pool.query(await readFile(new URL(file, migrations), 'utf8'));
      await icons.initialize();
      const passwordHash = await hashPassword(password);
      await store.ensureDefaultAdmin(passwordHash);
      await pool.query('UPDATE staff_accounts SET must_change_password=false');
      const actor = (await pool.query('SELECT id FROM staff_accounts LIMIT 1'))
        .rows[0].id as string;
      await pool.query(
        "INSERT INTO items(id,name,icon_path) VALUES(8000001,'Existing artwork','/catalog/items/1249.webp')",
      );
      await pool.query(
        "INSERT INTO pages(id,name,category,sort_order) VALUES('default-a','Default A','bosses',0),('default-b','Default B','bosses',1)",
      );
      const login = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: { origin },
        payload: { username: 'admin', password },
      });
      assert.equal(login.statusCode, 200, login.body);
      const headers = {
        origin,
        cookie: String(login.headers['set-cookie']).split(';')[0]!,
        'x-csrf-token': login.json().csrfToken as string,
      };
      const create = (body: unknown, key: string) =>
        app.inject({
          method: 'POST',
          url: '/api/v1/admin/catalog/items',
          headers: { ...headers, 'idempotency-key': key },
          payload: body as object,
        });
      const fields: NewItem = {
        name: 'Default trophy',
        gameItemIds: [1900000001],
        pageIds: ['default-a', 'default-b'],
      };
      const results = await Promise.all([
        create(fields, 'default-create-1'),
        create(fields, 'default-create-1'),
      ]);
      for (const result of results)
        assert.equal(result.statusCode, 201, result.body);
      const first = results[0]!.json<CreatedItem>();
      assert.deepEqual(results[1]!.json(), first);
      assert.equal(first.item.iconPath, DEFAULT_ITEM_ICON_PATH);
      assert.deepEqual(first.item.overrides, ['name', 'pages']);
      assert.equal(
        (
          await pool.query('SELECT icon_asset_id FROM items WHERE id=$1', [
            first.item.id,
          ])
        ).rows[0].icon_asset_id,
        null,
      );
      assert.equal(
        (await pool.query('SELECT count(*)::int n FROM catalog_assets')).rows[0]
          .n,
        0,
      );
      assert.equal(
        (await pool.query('SELECT count(*)::int n FROM catalog_requests'))
          .rows[0].n,
        1,
      );
      assert.equal(
        (await pool.query('SELECT count(*)::int n FROM catalog_audit')).rows[0]
          .n,
        1,
      );
      assert.equal(
        (
          await pool.query(
            'SELECT count(*)::int n FROM page_items WHERE item_id=$1',
            [first.item.id],
          )
        ).rows[0].n,
        2,
      );
      assert.deepEqual(await readdir(icons.directory), []);
      const second = await catalog.create(
        { ...fields, name: 'Another default', gameItemIds: [1900000002] },
        actor,
        'default-create-2',
        async () => {
          throw Error('Default must not verify an uploaded file');
        },
      );
      assert.equal(second.item.iconPath, first.item.iconPath);
      assert.equal(
        (await pool.query('SELECT count(*)::int n FROM catalog_assets')).rows[0]
          .n,
        0,
      );
      const persisted = await new PgCatalogStore(pool).catalog();
      assert.equal(
        persisted.items.find((i) => i.id === first.item.id)!.iconPath,
        DEFAULT_ITEM_ICON_PATH,
      );
      assert.equal(
        (await app.inject('/api/v1/catalog'))
          .json()
          .items.find((i: { id: number }) => i.id === first.item.id).iconPath,
        DEFAULT_ITEM_ICON_PATH,
      );

      for (const iconAssetId of ['', ' ', 'bad-asset', null, false, 42])
        assert.equal(
          (
            await create(
              { ...fields, gameItemIds: [1900000003], iconAssetId },
              'invalid-default-icon',
            )
          ).statusCode,
          400,
        );
      const record = await icons.save(
        await sharp({
          create: {
            width: 36,
            height: 32,
            channels: 4,
            background: '#aabbcc80',
          },
        })
          .png()
          .toBuffer(),
        'image/png',
      );
      const upload = await catalog.stage(record, actor);
      assert.equal(
        (
          await create(
            { ...fields, iconAssetId: upload.assetId },
            'default-create-1',
          )
        ).statusCode,
        409,
      );
      const customFields = {
        ...fields,
        name: 'Custom trophy',
        gameItemIds: [1900000003],
        iconAssetId: upload.assetId,
      };
      const custom = await create(customFields, 'custom-create-1');
      assert.equal(custom.statusCode, 201, custom.body);
      const customResult = custom.json<CreatedItem>();
      assert.equal(customResult.item.iconPath, upload.iconPath);
      assert.ok(customResult.item.overrides.includes('icon'));
      const reviewItems = (await updateCatalog(pool)).items;
      const defaultForReview = reviewItems.find((i) => i.id === first.item.id)!;
      assert.equal(defaultForReview.iconPath, DEFAULT_ITEM_ICON_PATH);
      assert.equal(defaultForReview.iconHash, null);
      assert.equal(
        reviewItems.find((i) => i.id === customResult.item.id)!.iconHash,
        record.sha256,
      );
      const legacyHash = createHash('sha256')
        .update(
          JSON.stringify({
            ...customFields,
            pageIds: [...customFields.pageIds].sort(),
          }),
        )
        .digest('hex');
      assert.equal(
        (
          await pool.query(
            'SELECT payload_hash FROM catalog_requests WHERE request_key=$1',
            ['custom-create-1'],
          )
        ).rows[0].payload_hash,
        legacyHash,
      );
      assert.deepEqual(
        (await create(customFields, 'custom-create-1')).json(),
        customResult,
      );
      assert.equal(
        (
          await create(
            { ...fields, gameItemIds: customFields.gameItemIds },
            'custom-create-1',
          )
        ).statusCode,
        409,
      );
      assert.equal(
        (
          await create(
            { ...customFields, gameItemIds: [1900000004] },
            'reused-asset-key',
          )
        ).statusCode,
        409,
      );
      const beforeInvalid = await catalog.catalog();
      for (const kind of [
        'missing',
        'expired',
        'foreign',
        'corrupt',
      ] as const) {
        let assetId: string = randomUUID();
        if (kind !== 'missing') {
          const next = await icons.save(
            await sharp({
              create: {
                width: 26,
                height: 26,
                channels: 4,
                background: '#ffff0080',
              },
            })
              .webp({ lossless: true })
              .toBuffer(),
            'image/webp',
          );
          assetId = (await catalog.stage(next, actor)).assetId;
          if (kind === 'expired')
            await pool.query(
              "UPDATE catalog_assets SET expires_at=now()-interval '1 second' WHERE id=$1",
              [assetId],
            );
          if (kind === 'foreign') {
            const foreign = await store.createModerator(
              'foreign',
              passwordHash,
              actor,
            );
            await pool.query(
              'UPDATE catalog_assets SET actor_discord_id=$2 WHERE id=$1',
              [assetId, foreign.id],
            );
          }
          if (kind === 'corrupt')
            await writeFile(
              join(icons.directory, assetId + '.webp'),
              'corrupt',
            );
        }
        assert.equal(
          (
            await create(
              { ...fields, gameItemIds: [1900000004], iconAssetId: assetId },
              'invalid-' + kind,
            )
          ).statusCode,
          kind === 'corrupt' ? 503 : 409,
        );
        assert.deepEqual(await catalog.catalog(), beforeInvalid);
      }
      assert.equal(
        (
          await create(
            { ...fields, gameItemIds: [1900000001] },
            'duplicate-game-id',
          )
        ).statusCode,
        409,
      );
      await catalog.editItem(
        first.item.id,
        { name: 'Default renamed', gameItemIds: fields.gameItemIds },
        (await catalog.catalog()).revision,
        actor,
        (asset) => icons.read(asset),
      );
      assert.equal(
        (await catalog.catalog()).items.find((i) => i.id === first.item.id)!
          .iconPath,
        DEFAULT_ITEM_ICON_PATH,
      );
      assert.ok(
        !(await catalog.catalog()).items
          .find((i) => i.id === first.item.id)!
          .overrides.includes('icon'),
      );
      const replacement = await catalog.stage(
        await icons.save(
          await sharp({
            create: {
              width: 26,
              height: 26,
              channels: 4,
              background: '#2222ff80',
            },
          })
            .webp({ lossless: true })
            .toBuffer(),
          'image/webp',
        ),
        actor,
      );
      await catalog.editItem(
        first.item.id,
        {
          name: 'Default renamed',
          gameItemIds: fields.gameItemIds,
          iconAssetId: replacement.assetId,
        },
        (await catalog.catalog()).revision,
        actor,
        (asset) => icons.read(asset),
      );
      const edited = (await catalog.catalog()).items.find(
        (i) => i.id === first.item.id,
      )!;
      assert.equal(edited.iconPath, replacement.iconPath);
      assert.ok(edited.overrides.includes('icon'));
      assert.deepEqual(
        (await create(fields, 'default-create-1')).json(),
        first,
        'Original receipt keeps its default icon after later edits',
      );
      assert.deepEqual(
        (await create(customFields, 'custom-create-1')).json(),
        customResult,
      );
      await catalog.deleteItem(
        second.item.id,
        (await catalog.catalog()).revision,
        actor,
      );
      assert.equal(
        (await catalog.catalog()).items.find((i) => i.id === 8000001)!.iconPath,
        '/catalog/items/1249.webp',
      );
      const defaultFile = new URL(
          '../../web/public/catalog/default.webp',
          import.meta.url,
        ),
        sharedBytes = await readFile(defaultFile);
      const branding = join(directory, 'branding'),
        proofs = join(directory, 'proofs');
      await mkdir(branding);
      await mkdir(proofs);
      const orphan = join(icons.directory, randomUUID() + '.webp');
      await writeFile(orphan, 'orphan');
      const old = new Date(Date.now() - 72 * 3600000);
      await utimes(orphan, old, old);
      const maintenance = new pg.Client({
        connectionString,
        options: '-c search_path=' + schema,
      });
      await maintenance.connect();
      try {
        await runAssetMaintenance(
          maintenance,
          { icons: icons.directory, branding, proofs },
          { ...assetMaintenanceDefaults, dryRun: false },
        );
      } finally {
        await maintenance.end();
      }
      await assert.rejects(readFile(orphan), { code: 'ENOENT' });
      assert.deepEqual(await readFile(defaultFile), sharedBytes);
      assert.ok(
        (await icons.read((await catalog.asset(upload.assetId))!)).length > 0,
      );
      assert.ok(
        (await icons.read((await catalog.asset(replacement.assetId))!)).length >
          0,
      );
    } finally {
      await app.close();
      await pool.end();
      await root.query('DROP SCHEMA ' + schema + ' CASCADE');
      await root.end();
      assert.equal(dirname(directory), resolve(tmpdir()));
      assert.ok(directory.includes('clog-default-icon-'));
      await rm(directory, { recursive: true, force: true });
    }
  },
);
