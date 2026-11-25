/** The live cache batch must preserve released item identities and reviewed images. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import pg from 'pg';
import { migrate } from '@clog/database/dist/migrate.js';
import {
  importCatalog,
  importBundledCatalog,
  readBundledSnapshot,
} from '@clog/database/dist/catalog-import.js';
import { readCatalogUpdates } from '@clog/database/dist/catalog-update-bundle.js';
import {
  freezeBundledImages,
  prepareBundledCatalogImages,
} from '@clog/database/dist/catalog-update-install.js';
import {
  installCatalogUpdate,
  PgCatalogUpdates,
} from '@clog/database/dist/catalog-update-store.js';
import { suppliedImagePath } from '@clog/database/dist/catalog-update-model.js';

test(
  'Prison of Ræun installs in cache order and the Obligator image respects installation history',
  { skip: !process.env.TEST_DATABASE_URL },
  async (t) => {
    const baseline = await readBundledSnapshot();
    const { batches, images } = await readCatalogUpdates();
    const archive = batches.find(
      (b) => b.id === '2026-10-20-fractured-archive',
    )!;
    const prison = batches.find((b) => b.id === '2026-11-25-prison-of-raeun')!;
    const oldIcon = suppliedImagePath(
      archive.items.find((i) => i.key === 'fractured-archive-34717')!.image
        .sha256,
    );
    const newIcon = suppliedImagePath(
      prison.items.find((i) => i.key === 'fractured-archive-34717')!.image
        .sha256,
    );
    assert.notEqual(newIcon, oldIcon);
    const root = new pg.Client({
      connectionString: process.env.TEST_DATABASE_URL,
    });
    await root.connect();
    t.after(() => root.end());
    for (const mode of [
      'fresh',
      'interrupted',
      'interrupted-custom',
      'existing-apply',
      'existing-keep',
    ]) {
      await t.test(mode, async (t) => {
        const database = 'prison_content_' + randomUUID().replaceAll('-', '');
        await root.query('CREATE DATABASE ' + database);
        const url = new URL(process.env.TEST_DATABASE_URL!);
        url.pathname = '/' + database;
        url.searchParams.delete('options');
        const client = new pg.Client({ connectionString: url.href });
        const pool = new pg.Pool({ connectionString: url.href });
        await client.connect();
        t.after(async () => {
          await client.end();
          await pool.end();
          await root.query('DROP DATABASE ' + database);
        });
        await migrate(url.href);
        let originalId: number | undefined;
        const submission = randomUUID();
        if (mode !== 'fresh') {
          await importCatalog(client, baseline);
          await freezeBundledImages(
            client,
            await prepareBundledCatalogImages(baseline),
          );
          await installCatalogUpdate(client, archive, images, true);
          originalId = (
            await client.query(
              'SELECT item_id FROM game_item_ids WHERE game_item_id=34717',
            )
          ).rows[0].item_id;
          if (mode.startsWith('existing')) {
            await client.query(
              'UPDATE catalog_bootstrap_state SET complete=true',
            );
            await client.query(
              "INSERT INTO submissions(id,source,raw_item_text,item_id,collector_name,collected_on,date_source,proof_url,status,reviewed_by,reviewed_at) VALUES($1,'manual','Obligator',$2,'Original collector','2026-11-18','admin','','approved','owner',now())",
              [submission, originalId],
            );
          }
          if (mode === 'interrupted-custom')
            await client.query(
              "UPDATE items SET overrides=ARRAY['icon'] WHERE id=$1",
              [originalId],
            );
        }
        await importBundledCatalog(url.href);
        const store = new PgCatalogUpdates(pool);
        let review = await store.preview('owner');
        const icon = async () =>
          (
            await client.query(
              'SELECT i.id,i.icon_path FROM items i JOIN game_item_ids g ON g.item_id=i.id WHERE g.game_item_id=34717',
            )
          ).rows[0];
        if (mode.startsWith('existing')) {
          assert.equal((await icon()).icon_path, oldIcon);
          assert.ok(review.autoOpen);
          assert.equal(
            (
              await client.query(
                "SELECT 1 FROM pages WHERE id='prison_of_raeun'",
              )
            ).rowCount,
            0,
          );
          const image = review.proposals.find(
            (p) =>
              p.kind === 'image' && p.entityKey === 'fractured-archive-34717',
          )!;
          assert.ok(image);
          await store.apply('owner', randomUUID(), {
            revision: review.revision,
            catalogRevision: review.catalogRevision,
            apply: review.proposals
              .filter((p) => mode === 'existing-apply' || p.id !== image.id)
              .map((p) => p.id),
            keep: mode === 'existing-keep' ? [image.id] : [],
          });
          assert.equal((await icon()).id, originalId);
          assert.deepEqual(
            (
              await client.query(
                'SELECT item_id,collector_name FROM submissions WHERE id=$1',
                [submission],
              )
            ).rows[0],
            { item_id: originalId, collector_name: 'Original collector' },
          );
        }
        assert.equal(
          (await icon()).icon_path,
          ['existing-keep', 'interrupted-custom'].includes(mode)
            ? oldIcon
            : newIcon,
        );
        assert.deepEqual(
          (
            await client.query(
              "SELECT p.name,p.category,g.game_item_id FROM pages p JOIN page_items m ON m.page_id=p.id JOIN game_item_ids g ON g.item_id=m.item_id WHERE p.id='prison_of_raeun' ORDER BY m.slot",
            )
          ).rows,
          [35033, 35027, 35029].map((id) => ({
            name: 'Prison of Ræun',
            category: 'other',
            game_item_id: id,
          })),
        );
        assert.equal(
          (await client.query('SELECT count(*)::int AS n FROM items')).rows[0]
            .n,
          baseline.items.length + 21,
        );
        assert.deepEqual(
          (
            await client.query(
              "SELECT g.game_item_id FROM page_items p JOIN game_item_ids g ON g.item_id=p.item_id WHERE p.page_id='sailing_miscellaneous' ORDER BY p.slot",
            )
          ).rows.map((r) => r.game_item_id),
          [
            31996, 31406, 31916, 31946, 31952, 31954, 31959, 31961, 31949,
            32115, 31989, 33074, 35031,
          ],
        );
        assert.equal(
          (
            await client.query(
              'SELECT 1 FROM game_item_ids WHERE game_item_id=ANY($1::int[])',
              [[35028, 35030, 35032, 35034, 35035, 35036, 35037, 35038]],
            )
          ).rowCount,
          0,
        );
        await importBundledCatalog(url.href);
        review = await store.preview('owner');
        assert.equal(review.autoOpen, false);
        assert.equal(review.proposals.length, 0);
        assert.equal(
          (
            await client.query(
              'SELECT 1 FROM catalog_update_images WHERE sha256=$1',
              [oldIcon.split('/').at(-1)!.replace('.webp', '')],
            )
          ).rowCount,
          1,
        );
      });
    }
  },
);
