/** Real populated upgrade and serialized policy decisions through every writer. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pg from 'pg';
import { migrate } from '@clog/database/dist/migrate.js';
import { provisionRuntimeRole } from '@clog/database/dist/runtime-role.js';
import {
  defaultRuneLiteRules,
  repeatCollectorRejected,
  normalizePlayerName,
  type RepeatCollectorPolicy,
} from '@clog/domain';
import { PgStore } from './store.js';
import { PgReviewStore } from './review-store.js';
import { PgProofStore, insertImage } from './proof-store.js';
import { PgClanKeyStore, loadClanKeyRoot } from './clan-api-key.js';
import { claimHash } from './intake.js';
import { hashPassword } from './passwords.js';
import { createApp } from './app.js';
import { screenshotRecord, memoryProofFiles } from './tests/screenshot.js';
import type {
  ManualSubmissionInput,
  ReviewSubmission,
} from './review-types.js';

test(
  'repeat collector policy upgrades safely and serializes intake, approvals, corrections and public display',
  { skip: !process.env.TEST_DATABASE_URL },
  async (t) => {
    const root = new pg.Pool({
      connectionString: process.env.TEST_DATABASE_URL,
    });
    const name = 'repeat_policy_' + randomUUID().replaceAll('-', '');
    const url = new URL(process.env.TEST_DATABASE_URL!);
    url.pathname = '/' + name;
    url.searchParams.delete('options');
    await root.query('CREATE DATABASE ' + name);
    const owner = new pg.Pool({ connectionString: url.href }),
      directory = await mkdtemp(join(tmpdir(), 'clog-repeat-'));
    const resources: { runtime?: pg.Pool; app?: ReturnType<typeof createApp> } =
      {};
    t.after(async () => {
      await resources.app?.close();
      await resources.runtime?.end();
      await owner.end();
      await root.query('DROP DATABASE ' + name);
      await root.end();
      await rm(directory, { recursive: true, force: true });
    });
    const migrations = new URL(
      '../../../packages/database/migrations/',
      import.meta.url,
    );
    await owner.query(
      'CREATE TABLE schema_migrations(name text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())',
    );
    for (const file of (await readdir(migrations))
      .filter((f) => f.endsWith('.sql') && Number(f.slice(0, 3)) < 6)
      .sort()) {
      const sql = await readFile(new URL(file, migrations), 'utf8');
      await owner.query(sql);
      await owner.query(
        'INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)',
        [file, createHash('sha256').update(sql).digest('hex')],
      );
    }
    const previous = new PgStore(owner),
      password = 'repeat-policy-owner-password';
    await previous.ensureDefaultAdmin(await hashPassword(password));
    const admin = (await previous.accountByUsername('admin'))!;
    await previous.createModerator('moderator', admin.passwordHash, admin.id);
    await owner.query('UPDATE staff_accounts SET must_change_password=false');
    await owner.query(`INSERT INTO items(id,name) SELECT i,'Item '||i FROM generate_series(1,20) i;
    INSERT INTO game_item_ids(game_item_id,item_id) SELECT 900000+id,id FROM items;
    INSERT INTO pages(id,name,category,sort_order) VALUES('a','Page A','bosses',0),('b','Page B','bosses',1);
    INSERT INTO page_items(page_id,item_id,slot) SELECT 'a',id,id FROM items;
    INSERT INTO page_items(page_id,item_id,slot) SELECT 'b',id,id FROM items;
    UPDATE submission_filter_settings SET filter_collected=true,version=7;`);
    const image = screenshotRecord();
    const imageClient = await owner.connect();
    try {
      await insertImage(imageClient, image);
    } finally {
      imageClient.release();
    }
    const oldIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
    for (const [i, collector, hardcore, type, page] of [
      [0, 'Alice Smith', false, 'regular', null],
      [1, ' ALICE__SMITH ', false, 'regular', null],
      [2, 'alice\u00a0smith', true, 'regular', null],
      [3, 'Alice Smith', false, 'event', 'a'],
    ] as const)
      await owner.query(
        "INSERT INTO submissions(id,source,raw_item_text,item_id,collector_name,collected_on,date_source,proof_url,proof_image_id,status,reviewed_by,reviewed_at,hardcore,collection_type,event_page_id) VALUES($1,'manual','Original',1,$2,'2026-10-01','admin','',$3,'approved',$4,now(),$5,$6,$7)",
        [oldIds[i], collector, image.id, admin.id, hardcore, type, page],
      );
    const oldFields: ManualSubmissionInput = {
      itemId: 1,
      collectorName: 'Alice Smith',
      collectedOn: '2026-10-01',
      hardcore: false,
      collectionType: 'regular',
      approve: true,
    };
    const oldKey = randomUUID(),
      oldReceipt = {
        id: oldIds[0],
        status: 'approved',
        opaque: 'Preserve original JSON exactly',
      };
    const hash = createHash('sha256')
      .update(
        JSON.stringify([
          1,
          'Alice Smith',
          '2026-10-01',
          false,
          '',
          true,
          '',
          { collectionType: 'regular' },
        ]),
      )
      .digest('hex');
    await owner.query(
      'INSERT INTO manual_submission_requests(actor_id,request_key,payload_hash,submission_id,response) VALUES($1,$2,$3,$4,$5)',
      [admin.id, oldKey, hash, oldIds[0], JSON.stringify(oldReceipt)],
    );
    await owner.query(
      "INSERT INTO audit_events(submission_id,actor_discord_id,actor_name,action,old_values,new_values) VALUES($1,$2,'Original actor','create',$3,$3)",
      [oldIds[0], admin.id, JSON.stringify(oldReceipt)],
    );
    await owner.query(
      'INSERT INTO submission_filter_audit(id,actor_id,version,old_filter_collected,new_filter_collected) VALUES($1,$2,7,false,true)',
      [randomUUID(), admin.id],
    );
    const historySql =
      "SELECT to_jsonb(s)-'admission_policy'-'collector_id'-'original_collector_name' AS data FROM submissions s ORDER BY id";
    const before = (await owner.query(historySql)).rows;
    const oldAudit = (await owner.query('SELECT * FROM audit_events')).rows;
    await migrate(url.href);
    await migrate(url.href);
    assert.deepEqual((await owner.query(historySql)).rows, before);
    assert.deepEqual(
      (await owner.query('SELECT * FROM audit_events')).rows,
      oldAudit,
    );
    await provisionRuntimeRole(url.href, 'e'.repeat(64));
    const runtimeUrl = new URL(url);
    runtimeUrl.username = 'clog_runtime';
    runtimeUrl.password = 'e'.repeat(64);
    const runtime = new pg.Pool({ connectionString: runtimeUrl.href });
    resources.runtime = runtime;
    const backend = new PgStore(runtime),
      review = new PgReviewStore(runtime, backend),
      proof = new PgProofStore(runtime);
    assert.deepEqual(await review.submissionFilters(), {
      revision: 'submission-filters-7',
      filterCollected: true,
      repeatCollectorPolicy: 'separate',
    });
    assert.deepEqual(
      await review.createManual(oldFields, admin.id, 'Admin', oldKey),
      oldReceipt,
    );
    const keys = new PgClanKeyStore(runtime, await loadClanKeyRoot(directory));
    await keys.ensureDefault();
    const key = (await keys.settings()).key;
    const rules = defaultRuneLiteRules('Clan name');
    rules.worldPolicies.members = 'allow';
    rules.worldPolicies.hardcore = 'allow';
    await owner.query('UPDATE runelite_settings SET rules=$1', [
      JSON.stringify(rules),
    ]);
    const policy = async (
      value: RepeatCollectorPolicy,
      filterCollected = false,
    ) =>
      review.saveSubmissionFilters(
        filterCollected,
        (await review.submissionFilters()).revision,
        admin.id,
        value,
      );
    const manual = (
      itemId: number,
      collectorName: string,
      approve = true,
      hardcore = false,
      extra: Partial<ManualSubmissionInput> = {},
      requestKey = randomUUID(),
    ) =>
      review.createManual(
        {
          itemId,
          collectorName,
          collectedOn: '2026-10-20',
          hardcore,
          approve,
          collectionType: 'regular',
          ...extra,
        },
        admin.id,
        'Admin',
        requestKey,
      );
    const approve = (row: ReviewSubmission) =>
      review.mutate(
        row.id,
        row.version,
        { action: 'approve', expectedVersion: row.version },
        admin.id,
        'Admin',
      );
    const rune = (
      itemId: number,
      username: string,
      requestKey = randomUUID(),
      hardcore = false,
    ) =>
      proof.createRuneLite(
        {
          itemId: 900000 + itemId,
          username,
          clanName: 'Clan name',
          worldTypes: [hardcore ? 'HARDCORE_MAIN' : 'MEMBERS'],
          chatMessage: 'Original chat proof',
        },
        undefined,
        requestKey,
        key,
      );
    const bot = async (
      itemId: number | undefined,
      collectorName: string,
      interactionId = '3' +
        String(Date.now()) +
        String(Math.floor(Math.random() * 100000)).padStart(5, '0'),
    ) => {
      const input = {
        interactionId,
        guildId: '234567890123456789',
        actorDiscordId: '123456789012345678',
        rawItemText: itemId ? 'Item ' + itemId : 'Unmatched',
        ...(itemId ? { itemId } : {}),
        collectorName,
        hardcore: false,
        image: screenshotRecord(),
      };
      return { ...(await backend.submitClaim(input, claimHash(input))), input };
    };
    await t.test(
      'a populated upgrade with the broader filter off preserves repeats and defaults to separate',
      async () => {
        const client = await owner.connect();
        try {
          await client.query('BEGIN');
          const schema =
            'repeat_upgrade_off_' + randomUUID().replaceAll('-', '');
          await client.query('CREATE SCHEMA ' + schema);
          await client.query('SET LOCAL search_path=' + schema);
          for (const file of (await readdir(migrations))
            .filter((f) => f.endsWith('.sql') && Number(f.slice(0, 3)) < 6)
            .sort())
            await client.query(
              await readFile(new URL(file, migrations), 'utf8'),
            );
          await client.query(`INSERT INTO items(id,name) VALUES(1,'Original');
        INSERT INTO pages(id,name,category,sort_order) VALUES('a','A','bosses',0);
        INSERT INTO page_items(page_id,item_id,slot) VALUES('a',1,0);
        INSERT INTO submissions(id,source,raw_item_text,item_id,collector_name,collected_on,date_source,proof_url,status,hardcore,reviewed_at,reviewed_by,collection_type,event_page_id)
        VALUES(gen_random_uuid(),'manual','Original',1,'Original Player','2026-10-01','admin','','approved',false,now(),'owner','regular',null),
          (gen_random_uuid(),'manual','Original',1,'ORIGINAL_PLAYER','2026-10-01','admin','','approved',false,now(),'owner','regular',null),
          (gen_random_uuid(),'manual','Original',1,'Original Player','2026-10-02','admin','','approved',true,now(),'owner','regular',null),
          (gen_random_uuid(),'manual','Original',1,'Original Player','2026-10-03','admin','','approved',false,now(),'owner','event','a');`);
          const original = (await client.query(historySql)).rows;
          await client.query(
            await readFile(
              new URL('006_repeat_collector_policy.sql', migrations),
              'utf8',
            ),
          );
          assert.deepEqual((await client.query(historySql)).rows, original);
          assert.deepEqual(
            (
              await client.query(
                'SELECT filter_collected,repeat_collector_policy FROM submission_filter_settings',
              )
            ).rows,
            [{ filter_collected: false, repeat_collector_policy: 'separate' }],
          );
        } finally {
          await client.query('ROLLBACK');
          client.release();
        }
      },
    );
    await t.test(
      'all policy modes preserve existing history, metadata revisions and administrator audits',
      async () => {
        const original = (await backend.collections()).length,
          first = await backend.publicSnapshot('collections');
        assert.equal(JSON.parse(first.body).repeatCollectorPolicy, 'separate');
        for (const mode of ['merge', 'reject', 'separate'] as const) {
          await policy(mode, true);
          const next = await backend.publicSnapshot('collections');
          assert.notEqual(next.revision, first.revision);
          assert.equal(JSON.parse(next.body).repeatCollectorPolicy, mode);
          assert.equal((await backend.collections()).length, original);
        }
        const audit = (
          await owner.query(
            'SELECT * FROM submission_filter_audit ORDER BY version',
          )
        ).rows;
        assert.equal(audit[0].old_repeat_collector_policy, 'separate');
        assert.equal(audit[0].new_repeat_collector_policy, 'separate');
        assert.equal(audit.at(-1).actor_id, admin.id);
        assert.equal(audit.at(-1).old_repeat_collector_policy, 'reject');
        const stale = (await review.submissionFilters()).revision;
        await policy('merge');
        await assert.rejects(
          review.saveSubmissionFilters(false, stale, admin.id, 'reject'),
          { status: 409 },
        );
        await policy('reject');
        assert.deepEqual(
          await review.createManual(oldFields, admin.id, 'Admin', oldKey),
          oldReceipt,
        );
      },
    );
    await t.test(
      'normalized canonical/world admission rejects manual, RuneLite and Discord repeats with durable evidence and immutable replay',
      async () => {
        const settings = await policy('reject');
        for (const spelling of [
          'alice_smith',
          ' ALICE\u00a0  SMITH ',
          'Alice\tSmith',
          '\ufeffAlice Smith\ufeff',
        ]) {
          const row = await manual(1, spelling, false);
          assert.equal(row.status, 'rejected');
          assert.equal(row.reviewReason, repeatCollectorRejected);
          assert.deepEqual(row.admissionPolicy, settings);
        }
        const requestKey = randomUUID(),
          first = await manual(
            2,
            ' New Collector ',
            true,
            false,
            {},
            requestKey,
          );
        assert.equal(first.status, 'approved');
        assert.equal((await manual(2, 'new_collector')).status, 'rejected');
        assert.equal((await manual(2, 'Other collector')).status, 'approved');
        assert.equal(
          (await manual(2, 'NEW COLLECTOR', true, true)).status,
          'approved',
        );
        const runeKey = randomUUID(),
          rejected = await rune(2, 'new_collector', runeKey);
        assert.equal(rejected.receipt.status, 'rejected');
        assert.equal(rejected.receipt.rejectionReason, repeatCollectorRejected);
        assert.deepEqual(rejected.receipt.admissionPolicy, settings);
        const discord = await bot(2, 'NEW COLLECTOR');
        assert.equal(discord.receipt.status, 'rejected');
        assert.equal(discord.receipt.rejectionReason, repeatCollectorRejected);
        const evidence = await review.detail(discord.receipt.submissionId);
        assert.ok(evidence!.submission.screenshotPath);
        assert.equal(
          evidence!.submission.reviewReason,
          repeatCollectorRejected,
        );
        assert.equal(evidence!.audit[0]!.action, 'reject');
        assert.deepEqual(evidence!.submission.admissionPolicy, settings);
        assert.equal(
          evidence!.audit[0]!.after.id,
          discord.receipt.submissionId,
        );
        assert.equal(evidence!.audit[0]!.after.collectorName, 'NEW COLLECTOR');
        assert.equal(
          evidence!.audit[0]!.after.screenshotPath,
          evidence!.submission.screenshotPath,
        );
        await policy('separate');
        assert.deepEqual(
          (await rune(2, 'new_collector', runeKey)).receipt,
          rejected.receipt,
        );
        assert.deepEqual(
          await manual(2, ' New Collector ', true, false, {}, requestKey),
          first,
        );
        assert.deepEqual(
          (await backend.submitClaim(discord.input, claimHash(discord.input)))
            .receipt,
          discord.receipt,
        );
        assert.equal((await manual(2, 'new_collector')).status, 'approved');
      },
    );
    await t.test(
      'concurrent first approvals and intake serialize; pending/rejected/revoked claims do not occupy the identity',
      async () => {
        await policy('separate');
        const pending = [
          await manual(3, 'Race player', false),
          await manual(3, 'RACE_PLAYER', false),
        ];
        await policy('reject');
        const results = await Promise.allSettled(pending.map(approve));
        assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
        assert.equal(results.filter((r) => r.status === 'rejected').length, 1);
        const created = await Promise.all([
          manual(4, 'First player'),
          manual(4, 'FIRST_PLAYER'),
        ]);
        assert.deepEqual(created.map((r) => r.status).sort(), [
          'approved',
          'rejected',
        ]);
        const waiting = await manual(5, 'Waiting', false);
        assert.equal((await manual(5, 'WAITING')).status, 'approved');
        await assert.rejects(approve(waiting), { status: 409 });
        const rejected = await manual(6, 'Free identity', false);
        await review.mutate(
          rejected.id,
          rejected.version,
          {
            action: 'reject',
            expectedVersion: rejected.version,
            reason: 'Bad proof',
          },
          admin.id,
          'Admin',
        );
        const accepted = await manual(6, 'Free identity');
        assert.equal(accepted.status, 'approved');
        await review.mutate(
          accepted.id,
          accepted.version,
          {
            action: 'revoke',
            expectedVersion: accepted.version,
            reason: 'Withdraw',
          },
          admin.id,
          'Admin',
        );
        assert.equal((await manual(6, 'FREE_IDENTITY')).status, 'approved');
        const auto = await Promise.all([
          rune(7, 'Observer'),
          rune(7, 'OBSERVER'),
        ]);
        assert.equal(new Set(auto.map((r) => r.receipt.submissionId)).size, 1);
        assert.equal(auto[0]!.receipt.status, 'approved');
        await owner.query(
          "UPDATE runelite_drop_events SET first_received_at=now()-interval '10 seconds' WHERE submission_id=$1",
          [auto[0]!.receipt.submissionId],
        );
        assert.equal((await rune(7, 'Observer')).receipt.status, 'rejected');
      },
    );
    await t.test(
      'unmatched resolution and approved identity/item/world moves recheck policy atomically',
      async () => {
        await policy('reject');
        await manual(8, 'Match player');
        const unknown = await bot(undefined, 'MATCH_PLAYER');
        const row = (await review.detail(unknown.receipt.submissionId))!
          .submission;
        const matched = await review.mutate(
          row.id,
          row.version,
          {
            itemId: 8,
            collectorName: row.collectorName,
            collectedOn: row.collectedOn,
            hardcore: false,
            reason: 'Match',
          },
          admin.id,
          'Admin',
        );
        await assert.rejects(approve(matched), { status: 409 });
        const other = await manual(8, 'Other player');
        const original = structuredClone(other);
        await assert.rejects(
          review.mutate(
            other.id,
            other.version,
            {
              itemId: 8,
              collectorName: 'match player',
              collectedOn: other.collectedOn,
              hardcore: false,
              reason: 'Rename',
            },
            admin.id,
            'Admin',
          ),
          { status: 409 },
        );
        assert.deepEqual(
          (await review.detail(other.id))!.submission.collectorName,
          original.collectorName,
        );
        const moved = await manual(9, 'Match player');
        await assert.rejects(
          review.mutate(
            moved.id,
            moved.version,
            {
              itemId: 8,
              collectorName: moved.collectorName,
              collectedOn: moved.collectedOn,
              hardcore: false,
              reason: 'Move',
            },
            admin.id,
            'Admin',
          ),
          { status: 409 },
        );
        const hc = await manual(8, 'Match player', true, true);
        await assert.rejects(
          review.mutate(
            hc.id,
            hc.version,
            {
              flags: { hardcore: false, collectionType: 'regular' },
              reason: 'Move world',
            },
            admin.id,
            'Admin',
          ),
          { status: 409 },
        );
        const legacy = (await review.detail(oldIds[0]!))!.submission;
        const changed = await review.mutate(
          legacy.id,
          legacy.version,
          {
            itemId: 1,
            collectorName: 'ALICE SMITH',
            collectedOn: '2026-10-02',
            hardcore: false,
            reason: 'Fix display spelling and date',
          },
          admin.id,
          'Admin',
        );
        assert.equal(changed.status, 'approved');
        assert.equal(normalizePlayerName(changed.collectorName), 'alice smith');
      },
    );
    await t.test(
      'Event page availability and broader Regular filter keep precedence across all policy modes',
      async () => {
        await policy('reject');
        const event = await manual(10, 'Event winner', true, false, {
          collectionType: 'event',
          eventPageId: 'a',
        });
        assert.equal(event.collectionType, 'event');
        assert.equal(
          (
            await manual(10, 'EVENT_WINNER', true, false, {
              collectionType: 'event',
              eventPageId: 'b',
            })
          ).status,
          'rejected',
        );
        assert.equal(
          (
            await manual(10, 'Other Event winner', true, false, {
              collectionType: 'event',
              eventPageId: 'b',
            })
          ).status,
          'approved',
        );
        const later = await manual(10, 'Fresh collector', true, false, {
          collectionType: 'event',
          eventPageId: 'a',
        });
        assert.equal(later.collectionType, 'regular');
        assert.equal(later.status, 'approved');
        for (const mode of ['reject', 'separate', 'merge'] as const) {
          await policy(mode, true);
          await assert.rejects(manual(10, 'Another collector'), {
            status: 409,
          });
        }
        await policy('separate');
        assert.equal((await manual(10, 'Fresh collector')).status, 'approved');
        await policy('merge');
        assert.equal((await manual(10, 'Fresh collector')).status, 'approved');
      },
    );
    await t.test(
      'administrator-only policy writes are versioned/CSRF checked and public validators refresh without changing credits',
      async () => {
        const app = createApp(
          () => backend.ready(),
          () => backend.settings(),
          {
            store: backend,
            review,
            proofStore: proof,
            proofs: memoryProofFiles(),
            auth: {
              origin: 'https://clog.example.com',
              secret: 'a'.repeat(64),
              secure: true,
            },
            logger: false,
          },
        );
        resources.app = app;
        const login = async (username: string) => {
          const response = await app.inject({
            method: 'POST',
            url: '/api/v1/auth/login',
            headers: { origin: 'https://clog.example.com' },
            payload: { username, password },
          });
          assert.equal(response.statusCode, 200, response.body);
          return {
            origin: 'https://clog.example.com',
            cookie: String(response.headers['set-cookie']).split(';')[0]!,
            'x-csrf-token': response.json().csrfToken,
          };
        };
        const adminHeaders = await login('admin'),
          modHeaders = await login('moderator');
        const path = '/api/v1/admin/submission-filters';
        const filters = await review.submissionFilters(),
          payload = {
            filterCollected: false,
            repeatCollectorPolicy: 'separate',
            expectedRevision: filters.revision,
          };
        assert.equal(
          (await app.inject({ method: 'PUT', url: path, payload })).statusCode,
          401,
        );
        assert.equal(
          (
            await app.inject({
              method: 'PUT',
              url: path,
              headers: modHeaders,
              payload,
            })
          ).statusCode,
          403,
        );
        assert.equal(
          (
            await app.inject({
              method: 'PUT',
              url: path,
              headers: { ...adminHeaders, 'x-csrf-token': 'bad' },
              payload,
            })
          ).statusCode,
          403,
        );
        assert.ok(
          [400, 422].includes(
            (
              await app.inject({
                method: 'PUT',
                url: path,
                headers: adminHeaders,
                payload: { ...payload, repeatCollectorPolicy: 'invalid' },
              })
            ).statusCode,
          ),
        );
        assert.equal(
          (await app.inject({ url: path, headers: modHeaders })).json()
            .repeatCollectorPolicy,
          filters.repeatCollectorPolicy,
        );
        const first = await app.inject('/api/v1/collections'),
          count = first.json().credits.length;
        assert.equal(
          (
            await app.inject({
              method: 'PUT',
              url: path,
              headers: adminHeaders,
              payload,
            })
          ).statusCode,
          200,
        );
        const next = await app.inject({
          url: '/api/v1/collections',
          headers: { 'if-none-match': String(first.headers.etag) },
        });
        assert.equal(next.statusCode, 200);
        assert.notEqual(next.headers.etag, first.headers.etag);
        assert.equal(next.json().credits.length, count);
        assert.equal(next.json().repeatCollectorPolicy, 'separate');
        assert.equal(
          (
            await app.inject({
              url: '/api/v1/collections',
              headers: { 'if-none-match': String(next.headers.etag) },
            })
          ).statusCode,
          304,
        );
        assert.equal(
          (
            await app.inject({
              method: 'PUT',
              url: path,
              headers: adminHeaders,
              payload,
            })
          ).statusCode,
          409,
        );
      },
    );
  },
);
