import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import pg from 'pg';
import {
  normalizePlayerName,
  type CollectionHiScoreMetric,
} from '@clog/domain';
import { migrate } from '@clog/database/dist/migrate.js';
import { createRuntimeTestPool } from './tests/runtime-pool.js';
import { PgStore } from './store.js';
import { PgCollectorNames } from './collector-name-store.js';
import { createApp } from './app.js';
import { collectionHiScoresSql } from './collection-hiscores-store.js';

async function fixture(
  run: (context: {
    owner: pg.Pool;
    runtime: pg.Pool;
    store: PgStore;
  }) => Promise<void>,
) {
  const root = new pg.Pool({
      connectionString: process.env.TEST_DATABASE_URL!,
    }),
    database = 'hiscores_' + randomUUID().replaceAll('-', '');
  await root.query('CREATE DATABASE ' + database);
  const url = new URL(process.env.TEST_DATABASE_URL!);
  url.pathname = '/' + database;
  const owner = new pg.Pool({ connectionString: url.href });
  let runtime: pg.Pool | undefined;
  try {
    await migrate(url.href);
    runtime = await createRuntimeTestPool(url, 8);
    await owner.query(
      "INSERT INTO items(id,name) VALUES(1,'Shared item'),(2,'Second item'),(3,'Inactive item'); UPDATE items SET active=false WHERE id=3; INSERT INTO pages(id,name,category,sort_order) VALUES('a','Page A','bosses',0),('b','Page B','bosses',1); INSERT INTO page_items(page_id,item_id,slot) VALUES('a',1,0),('b',1,0),('a',2,1)",
    );
    await owner.query(
      "INSERT INTO item_aliases(item_id,alias) VALUES(1,'Old shared item'),(1,'Another item alias')",
    );
    await owner.query(
      "INSERT INTO items(id,name) VALUES(4,'Legacy shared item'); INSERT INTO page_items(page_id,item_id,slot) VALUES('a',4,2),('b',4,1)",
    );
    await run({ owner, runtime, store: new PgStore(runtime) });
  } finally {
    await runtime?.end();
    await owner.end();
    await root.query('DROP DATABASE ' + database);
    await root.end();
  }
}
async function collector(
  owner: pg.Pool,
  name: string,
  mode: string | null = null,
) {
  const id = randomUUID();
  await owner.query(
    'INSERT INTO collectors(id,display_name,normalized_name,game_mode) VALUES($1,$2,$3,$4)',
    [id, name, normalizePlayerName(name), mode],
  );
  return id;
}
async function obtain(
  owner: pg.Pool,
  id: string,
  options: {
    item?: number;
    type?: 'regular' | 'event';
    page?: string;
    hardcore?: boolean;
    pendingPage?: boolean;
    status?: string;
  } = {},
) {
  const submission = randomUUID();
  // Retained pre-005 obtains cannot be created through current intake. Seed
  // that historical fixture only in this disposable database.
  if (options.pendingPage)
    await owner.query(
      'ALTER TABLE submissions DISABLE TRIGGER submissions_page_event_credit',
    );
  try {
    await owner.query(
      `INSERT INTO submissions(id,source,raw_item_text,item_id,collector_name,collector_id,collected_on,date_source,proof_url,status,reviewed_at,reviewed_by,hardcore,collection_type,event_page_id,event_page_assignment_pending,review_reason)
    SELECT $1,'manual','Item',$3,display_name,id,'2026-10-01','admin','',$4,now(),'staff',$5,$6,$7,$8,'Fixture review' FROM collectors WHERE id=$2`,
      [
        submission,
        id,
        options.item ?? 1,
        options.status ?? 'approved',
        options.hardcore ?? false,
        options.type ?? 'regular',
        options.page ?? null,
        options.pendingPage ?? false,
      ],
    );
  } finally {
    if (options.pendingPage)
      await owner.query(
        'ALTER TABLE submissions ENABLE TRIGGER submissions_page_event_credit',
      );
  }
  return submission;
}
test(
  'Collection HiScores scores canonical approved obtains, merges identities and respects public world visibility',
  { skip: !process.env.TEST_DATABASE_URL },
  async (t) =>
    fixture(async ({ owner, runtime, store }) => {
      const alice = await collector(owner, 'Alice', 'hardcore_ironman'),
        bob = await collector(owner, 'Bob', 'normal'),
        legacy = await collector(owner, 'Legacy');
      await obtain(owner, alice);
      await obtain(owner, alice);
      await obtain(owner, alice, { type: 'event', page: 'a' });
      await obtain(owner, alice, { type: 'event', page: 'b' });
      await obtain(owner, alice, { hardcore: true });
      await obtain(owner, alice, { hardcore: true });
      for (const status of ['pending', 'rejected', 'revoked'])
        await obtain(owner, alice, { status });
      await obtain(owner, alice, { item: 3 });
      await obtain(owner, bob, { item: 2 });
      await obtain(owner, bob, { item: 2, type: 'event', page: 'a' });
      await obtain(owner, bob, { hardcore: true });
      await obtain(owner, legacy, {
        item: 4,
        type: 'event',
        pendingPage: true,
      });
      await owner.query(
        'UPDATE site_settings SET hardcore_enabled=true,version=version+1',
      );
      const read = (metric: CollectionHiScoreMetric, player?: string) =>
        store.collectionHiScores({
          metric,
          page: 1,
          ...(player ? { player } : {}),
        });
      await t.test(
        'normal and Hardcore world scores are separate from account mode, aliases, pages and display policy',
        async () => {
          const expected = {
            total: '4',
            unique: '1',
            event: '2',
            hardcore: '2',
          };
          for (const metric of [
            'total',
            'unique',
            'event',
            'hardcore',
          ] as const)
            assert.equal(
              (await read(metric, 'aLiCe')).players.find(
                (row) => row.name === 'Alice',
              )!.score,
              expected[metric],
            );
          assert.equal(
            (await read('event', 'Legacy')).players.find(
              (row) => row.name === 'Legacy',
            )!.score,
            '1',
          );
          const before = (await read('total')).players;
          await owner.query(
            "UPDATE submission_filter_settings SET repeat_collector_policy='merge',filter_collected=false,version=version+1",
          );
          assert.deepEqual((await read('total')).players, before);
          const unresolved = (
            await owner.query(
              'SELECT original_collector_name,event_page_assignment_pending FROM submissions WHERE collector_id=$1',
              [legacy],
            )
          ).rows[0];
          assert.equal(unresolved.event_page_assignment_pending, true);
          const pendingScore = await read('event');
          await owner.query(
            "UPDATE submissions SET event_page_assignment_pending=false,event_page_id='a' WHERE collector_id=$1",
            [legacy],
          );
          const assignedScore = await read('event');
          assert.notEqual(assignedScore.revision, pendingScore.revision);
          assert.deepEqual(assignedScore.players, pendingScore.players);
        },
      );
      await t.test(
        'renames and merges resolve current identity and union canonical items',
        async () => {
          const names = new PgCollectorNames(runtime),
            preview = await names.preview(alice, 'Alice Renamed', 'staff');
          await names.apply(preview.token, randomUUID(), 'staff', 'Staff');
          const renamed = await read('total', 'alice_renamed');
          assert.equal(renamed.match!.name, 'Alice Renamed');
          assert.equal((await read('total', 'Alice')).match, null);
          const merge = await names.preview(
            alice,
            'Bob',
            'staff',
            'hardcore_ironman',
          );
          await names.apply(merge.token, randomUUID(), 'staff', 'Staff');
          for (const [metric, score] of [
            ['total', '6'],
            ['unique', '2'],
            ['event', '3'],
            ['hardcore', '3'],
          ] as const) {
            const snapshot = await read(metric, 'Bob');
            assert.equal(
              snapshot.players.find((row) => row.name === 'Bob')!.score,
              score,
            );
            assert.equal(
              snapshot.players.some((row) => row.name.startsWith('Alice')),
              false,
            );
          }
          assert.equal(
            (
              await owner.query(
                'SELECT original_collector_name FROM submissions WHERE collector_id=$1 LIMIT 1',
                [alice],
              )
            ).rows[0].original_collector_name,
            'Alice',
          );
        },
      );
      await t.test(
        'visibility, corrections, approvals/revocations and item activation invalidate coherent snapshots',
        async () => {
          const before = await read('hardcore', 'Bob');
          await owner.query(
            'UPDATE site_settings SET hardcore_enabled=false,version=version+1',
          );
          const hidden = await read('hardcore', 'Bob');
          assert.notEqual(hidden.revision, before.revision);
          assert.equal(hidden.match, null);
          assert.deepEqual(hidden.players, []);
          assert.equal(hidden.totalPlayers, 0);
          await owner.query(
            'UPDATE site_settings SET hardcore_enabled=true,version=version+1',
          );
          const writer = await owner.connect(),
            previous = await read('total', 'Bob');
          try {
            await writer.query('BEGIN');
            await writer.query(
              "UPDATE submissions SET status='revoked',review_reason='Fixture revoke' WHERE status='approved' AND NOT hardcore AND collector_id=$1",
              [bob],
            );
            const during = await read('total', 'Bob');
            assert.equal(during.revision, previous.revision);
            assert.deepEqual(during.players, previous.players);
            await writer.query('COMMIT');
            const after = await new PgStore(runtime).collectionHiScores({
              metric: 'total',
              page: 1,
              player: 'Bob',
            });
            assert.notEqual(after.revision, previous.revision);
            assert.equal(
              after.players.find((row) => row.name === 'Bob')!.score,
              '4',
            );
          } finally {
            await writer.query('ROLLBACK');
            writer.release();
          }
          const active = await read('total');
          await owner.query('UPDATE items SET active=false WHERE id=1');
          assert.notEqual((await read('total')).revision, active.revision);
          assert.equal((await read('total', 'Bob')).match, null);
        },
      );
    }),
);

test(
  'Collection HiScores has 25-player deterministic pages, exact normalized search, coherent ETags and bounded query plans',
  { skip: !process.env.TEST_DATABASE_URL },
  async () =>
    fixture(async ({ owner, store }) => {
      const people = Array.from({ length: 1925 }, (_, index) => ({
        id: randomUUID(),
        name:
          index === 1924
            ? 'KihiraVD'
            : `A${String(index + 1).padStart(4, '0')}_User`,
      }));
      await owner.query(
        'INSERT INTO collectors(id,display_name,normalized_name) SELECT id,name,key FROM jsonb_to_recordset($1::jsonb) AS x(id uuid,name text,key text)',
        [
          JSON.stringify(
            people.map((row) => ({
              ...row,
              key: normalizePlayerName(row.name),
            })),
          ),
        ],
      );
      await owner.query(`INSERT INTO submissions(id,source,raw_item_text,item_id,collector_name,collector_id,collected_on,date_source,proof_url,status,reviewed_at,reviewed_by,hardcore,collection_type)
    SELECT gen_random_uuid(),'manual','Shared item',1,c.display_name,c.id,'2026-10-01','admin','','approved',now(),'staff',false,'regular' FROM collectors c CROSS JOIN generate_series(1,12)`);
      const zero = await collector(owner, 'No Score');
      await obtain(owner, zero, { status: 'pending' });
      const page2 = await store.collectionHiScores({
        metric: 'total',
        page: 2,
      });
      assert.equal(page2.players.length, 25);
      assert.equal(page2.players[0]!.rank, 26);
      assert.equal(page2.players.at(-1)!.rank, 50);
      assert.equal(page2.totalPlayers, 1925);
      assert.equal(page2.totalPages, 77);
      for (const [name, rank, page] of [
        ['  kIhIrAvD  ', 1925, 77],
        ['a0026 user', 26, 2],
        ['A0050_USER', 50, 2],
        ['A0025\u00a0USER', 25, 1],
      ] as const) {
        const result = await store.collectionHiScores({
          metric: 'total',
          page: 1,
          player: name,
        });
        assert.equal(result.match!.rank, rank);
        assert.equal(result.page, page);
        assert.equal(result.players.length, 25);
      }
      assert.equal(
        (
          await store.collectionHiScores({
            metric: 'total',
            page: 2,
            player: 'No_Score',
          })
        ).match,
        null,
      );
      assert.equal(
        (
          await store.collectionHiScores({
            metric: 'total',
            page: 2,
            player: 'Missing',
          })
        ).page,
        2,
      );
      assert.equal(
        (await store.collectionHiScores({ metric: 'total', page: 999999999 }))
          .page,
        77,
      );
      const indexes = (
        await owner.query(
          "SELECT indexname FROM pg_indexes WHERE tablename IN('submissions','collectors') ORDER BY indexname",
        )
      ).rows;
      const plan = (
        await owner.query(
          'EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) ' + collectionHiScoresSql,
          ['unique', 77, normalizePlayerName('KihiraVD')],
        )
      ).rows[0];
      await mkdir('.data/local-checks', { recursive: true });
      await writeFile(
        '.data/local-checks/hiscores153-query-plan.json',
        JSON.stringify(
          { approvedObtains: 1925 * 12, collectors: 1925, indexes, plan },
          null,
          2,
        ),
      );
      const app = createApp(undefined, undefined, { store, logger: false });
      try {
        const first = await app.inject(
          '/api/v1/collections/hiscores?metric=total&page=77&player=KihiraVD',
        );
        assert.equal(first.statusCode, 200, first.body);
        assert.equal(
          (
            await app.inject({
              url: '/api/v1/collections/hiscores?metric=total&page=77&player=KihiraVD',
              headers: { 'if-none-match': String(first.headers.etag) },
            })
          ).statusCode,
          304,
        );
        assert.deepEqual(Object.keys(first.json().players[0]).sort(), [
          'name',
          'rank',
          'score',
        ]);
        await owner.query(
          "UPDATE submissions SET status='revoked',review_reason='Fixture revoke' WHERE collector_id IN(SELECT id FROM collectors WHERE display_name<>'KihiraVD')",
        );
        const next = await app.inject({
          url: '/api/v1/collections/hiscores?metric=total&page=77&player=KihiraVD',
          headers: { 'if-none-match': String(first.headers.etag) },
        });
        assert.equal(next.statusCode, 200);
        assert.notEqual(next.headers.etag, first.headers.etag);
        assert.equal(next.json().page, 1);
        assert.equal(next.json().match.rank, 1);
        assert.equal(next.json().totalPlayers, 1);
        assert.equal(
          (await store.collectionHiScores({ metric: 'event', page: 999 }))
            .players.length,
          0,
        );
      } finally {
        await app.close();
      }
    }),
);
