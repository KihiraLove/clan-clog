/** Populated forward upgrade, runtime grants and every Event writer share one ledger. */
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import pg from 'pg';
import { migrate } from '@clog/database/dist/migrate.js';
import { provisionRuntimeRole } from '@clog/database/dist/runtime-role.js';
import {
  defaultRuneLiteRules,
  type IntakeSchedulingEvidence,
} from '@clog/domain';
import { PgStore } from './store.js';
import { PgReviewStore } from './review-store.js';
import { PgProofStore } from './proof-store.js';
import { PgClanKeyStore, loadClanKeyRoot } from './clan-api-key.js';
import { claimHash } from './intake.js';
import { hashPassword } from './passwords.js';
import { createApp } from './app.js';
import { memoryProofFiles, screenshotRecord, png } from './tests/screenshot.js';
import type {
  ManualSubmissionInput,
  ReviewSubmission,
} from './review-types.js';

test(
  'page-specific Events upgrade without losing obtains, resolve once and serialize all credit paths',
  { skip: !process.env.TEST_DATABASE_URL },
  async (t) => {
    const root = new pg.Pool({
      connectionString: process.env.TEST_DATABASE_URL,
    });
    const name = 'page_events_' + randomUUID().replaceAll('-', ''),
      url = new URL(process.env.TEST_DATABASE_URL!);
    await root.query('CREATE DATABASE ' + name);
    url.pathname = '/' + name;
    url.searchParams.delete('options');
    const owner = new pg.Pool({ connectionString: url.href }),
      directory = await mkdtemp(join(tmpdir(), 'clog-page-events-'));
    const resources: { runtime?: pg.Pool } = {};
    let app: ReturnType<typeof createApp> | undefined;
    t.after(async () => {
      await app?.close();
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
      .filter((f) => f.endsWith('.sql') && !f.startsWith('005_'))
      .sort()) {
      const sql = await readFile(new URL(file, migrations), 'utf8');
      await owner.query(sql);
      await owner.query(
        'INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)',
        [file, createHash('sha256').update(sql).digest('hex')],
      );
    }
    const backendBefore = new PgStore(owner);
    await backendBefore.ensureDefaultAdmin(
      await hashPassword('page-events-owner-password'),
    );
    await owner.query('UPDATE staff_accounts SET must_change_password=false');
    const admin = (await backendBefore.accountByUsername('admin'))!;
    await backendBefore.createModerator(
      'moderator',
      admin.passwordHash,
      admin.id,
    );
    await owner.query('UPDATE staff_accounts SET must_change_password=false');
    await owner.query(`INSERT INTO items(id,name) SELECT i,'Item '||i FROM generate_series(1,12) i;
    INSERT INTO game_item_ids(game_item_id,item_id) SELECT 900000+id,id FROM items;
    INSERT INTO pages(id,name,category,sort_order,active) VALUES('a','Page A','bosses',0,true),('b','Page B','bosses',1,true),('retired','Retired','bosses',2,false),('unrelated','Unrelated','bosses',3,true);
    INSERT INTO page_items(page_id,item_id,slot) VALUES('a',1,0),('b',1,0),('a',2,1),('retired',4,0);
    INSERT INTO page_items(page_id,item_id,slot) SELECT 'a',i,i FROM generate_series(5,12) i;
    INSERT INTO page_items(page_id,item_id,slot) SELECT 'b',i,i FROM generate_series(5,12) i;`);
    const legacyIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID()],
      image = screenshotRecord();
    await owner.query(
      'INSERT INTO submission_images(id,sha256,byte_size,width,height) VALUES($1,$2,$3,$4,$5)',
      [image.id, image.sha256, image.byteSize, image.width, image.height],
    );
    const evidence: IntakeSchedulingEvidence = {
      receivedAt: '2026-10-20T12:00:00Z',
      enabled: true,
      revision: 'schedules-1',
      permanentlyOpenPageIds: [],
      eventPages: [{ scheduleId: randomUUID(), pageId: 'a', itemIds: [1, 2] }],
    };
    for (let i = 0; i < legacyIds.length; i++)
      await owner.query(
        "INSERT INTO submissions(id,source,raw_item_text,item_id,collector_name,collected_on,date_source,proof_url,proof_image_id,status,reviewed_by,reviewed_at,collection_type,intake_scheduling) VALUES($1,'manual','Original item',$2,$3,'2026-10-20','admin','',$4,'approved',$5,now(),'event',$6)",
        [
          legacyIds[i],
          i + 1,
          'Original collector ' + i,
          image.id,
          admin.id,
          JSON.stringify(evidence),
        ],
      );
    const oldFields: ManualSubmissionInput = {
      itemId: 1,
      collectorName: 'Original collector 0',
      collectedOn: '2026-10-20',
      hardcore: false,
      collectionType: 'event',
      approve: true,
    };
    const oldKey = randomUUID(),
      oldReceipt = {
        id: legacyIds[0],
        source: 'manual',
        itemId: 1,
        collectorName: oldFields.collectorName,
        collectionType: 'event',
        status: 'approved',
        opaqueHistoricalField: 'retain exactly',
      };
    const oldHash = createHash('sha256')
      .update(
        JSON.stringify([
          1,
          oldFields.collectorName,
          oldFields.collectedOn,
          false,
          '',
          true,
          '',
          { collectionType: 'event' },
        ]),
      )
      .digest('hex');
    await owner.query(
      'INSERT INTO manual_submission_requests(actor_id,request_key,payload_hash,submission_id,response) VALUES($1,$2,$3,$4,$5)',
      [admin.id, oldKey, oldHash, legacyIds[0], JSON.stringify(oldReceipt)],
    );
    await owner.query(
      "INSERT INTO audit_events(submission_id,actor_discord_id,actor_name,action,old_values,new_values) VALUES($1,$2,'Original actor','create',$3,$3)",
      [legacyIds[0], admin.id, JSON.stringify(oldReceipt)],
    );
    const historySql =
      'SELECT id,collector_name,collected_on,status,proof_image_id,intake_scheduling,reviewed_by,reviewed_at,version FROM submissions ORDER BY id';
    const before = (await owner.query(historySql)).rows,
      auditBefore = (await owner.query('SELECT * FROM audit_events')).rows;
    await migrate(url.href);
    await migrate(url.href);
    assert.deepEqual((await owner.query(historySql)).rows, before);
    assert.deepEqual(
      (await owner.query('SELECT * FROM audit_events')).rows,
      auditBefore,
    );
    const upgraded = (
      await owner.query(
        'SELECT id,event_page_id,event_page_assignment_pending FROM submissions ORDER BY item_id',
      )
    ).rows;
    assert.deepEqual(
      upgraded.map((r) => [r.event_page_id, r.event_page_assignment_pending]),
      [
        [null, true],
        ['a', false],
        [null, true],
        [null, true],
      ],
    );
    await provisionRuntimeRole(url.href, 'd'.repeat(64));
    const runtimeUrl = new URL(url);
    runtimeUrl.username = 'clog_runtime';
    runtimeUrl.password = 'd'.repeat(64);
    const runtime = new pg.Pool({ connectionString: runtimeUrl.href });
    resources.runtime = runtime;
    const backend = new PgStore(runtime),
      review = new PgReviewStore(runtime, backend),
      proof = new PgProofStore(runtime);
    assert.deepEqual(
      await review.createManual(oldFields, admin.id, 'Admin', oldKey),
      oldReceipt,
      'old payload and receipt JSON are immutable',
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
    await owner.query(`UPDATE collection_scheduling SET enabled=true;
    INSERT INTO collection_log_schedules(id,title,starts_at,ends_at) VALUES('00000000-0000-4000-8000-000000000001','Event',now()-interval '1 hour',now()+interval '1 hour');
    INSERT INTO collection_log_schedule_pages(schedule_id,page_id) VALUES('00000000-0000-4000-8000-000000000001','a'),('00000000-0000-4000-8000-000000000001','b');`);
    const fields = (itemId: number, pageId?: string) => ({
      username: 'Player ' + randomUUID(),
      clanName: 'Clan name',
      itemId: 900000 + itemId,
      worldTypes: ['MEMBERS'],
      chatMessage: 'Original drop message',
      ...(pageId ? { eventPageId: pageId } : {}),
    });
    const manual = (
      itemId: number,
      pageId?: string,
      approve = false,
      hardcore = false,
    ) =>
      review.createManual(
        {
          itemId,
          collectorName: 'Collector ' + randomUUID(),
          collectedOn: '2026-10-20',
          hardcore,
          collectionType: hardcore ? 'regular' : 'event',
          approve,
          ...(pageId ? { eventPageId: pageId } : {}),
        },
        admin.id,
        'Admin',
        randomUUID(),
      );
    const approve = (
      s: ReviewSubmission,
      flags?: import('./review-types.js').ReviewCollectionFlags,
    ) =>
      review.mutate(
        s.id,
        s.version,
        {
          action: 'approve',
          expectedVersion: s.version,
          ...(flags ? { flags } : {}),
        },
        admin.id,
        'Admin',
      );
    await t.test(
      'legacy choices are explicit, atomic, authorized and replayable',
      async () => {
        const initial = await review.eventPageAssignments();
        assert.equal(initial.total, 3);
        const shared = initial.credits.find((c) => c.itemId === 1)!;
        assert.deepEqual(shared.eligiblePageIds, ['a']);
        assert.equal(shared.pages.filter((p) => p.available).length, 2);
        assert.equal(
          initial.credits.find((c) => c.itemId === 3)!.pages.length,
          0,
        );
        assert.ok(
          initial.credits
            .find((c) => c.itemId === 4)!
            .pages.every((p) => !p.available),
        );
        assert.deepEqual(
          await new PgReviewStore(runtime!, backend).eventPageAssignments(),
          initial,
          'not choosing or restarting preserves outstanding review',
        );
        await assert.rejects(
          manual(1, 'b', true),
          /administrator|existing Event/i,
        );
        const pending = await proof.createRuneLite(
          fields(1, 'b'),
          undefined,
          randomUUID(),
          key,
        );
        assert.equal(pending.receipt.status, 'pending');
        const regular = await review.createManual(
          {
            ...oldFields,
            collectionType: 'regular',
            collectorName: 'Independent Regular',
          },
          admin.id,
          'Admin',
          randomUUID(),
        );
        assert.equal(regular.status, 'approved');
        const body = {
          expectedRevision: initial.revision,
          assignments: [
            {
              submissionId: shared.submissionId,
              expectedVersion: shared.version,
              eventPageId: 'a',
            },
          ],
        };
        await assert.rejects(
          review.assignEventPages(
            {
              ...body,
              assignments: [
                ...body.assignments,
                {
                  submissionId: legacyIds[2]!,
                  expectedVersion: 1,
                  eventPageId: 'a',
                },
              ],
            },
            randomUUID(),
            admin.id,
            'Admin',
          ),
        );
        assert.equal(
          (await review.eventPageAssignments()).total,
          3,
          'a failed batch cannot commit its valid first choice',
        );
        app = createApp(
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
        const login = async (username: string) => {
          const r = await app!.inject({
            method: 'POST',
            url: '/api/v1/auth/login',
            headers: { origin: 'https://clog.example.com' },
            payload: { username, password: 'page-events-owner-password' },
          });
          assert.equal(r.statusCode, 200, r.body);
          return {
            origin: 'https://clog.example.com',
            cookie: String(r.headers['set-cookie']).split(';')[0]!,
            'x-csrf-token': r.json().csrfToken,
          };
        };
        const adminHeaders = await login('admin'),
          modHeaders = await login('moderator');
        const path = '/api/v1/admin/event-page-assignments';
        assert.equal((await app.inject(path)).statusCode, 401);
        assert.equal(
          (await app.inject({ url: path, headers: modHeaders })).statusCode,
          403,
        );
        assert.equal(
          (
            await app.inject({
              method: 'POST',
              url: path,
              headers: { ...modHeaders, 'idempotency-key': randomUUID() },
              payload: body,
            })
          ).statusCode,
          403,
        );
        assert.equal(
          (
            await app.inject({
              method: 'POST',
              url: path,
              headers: {
                ...adminHeaders,
                'x-csrf-token': 'bad',
                'idempotency-key': randomUUID(),
              },
              payload: body,
            })
          ).statusCode,
          403,
        );
        await owner.query(
          "UPDATE pages SET name='Renamed Page A' WHERE id='a'",
        );
        assert.equal(
          (
            await app.inject({
              method: 'POST',
              url: path,
              headers: { ...adminHeaders, 'idempotency-key': randomUUID() },
              payload: body,
            })
          ).statusCode,
          409,
        );
        const current = await review.eventPageAssignments();
        body.expectedRevision = current.revision;
        const requestKey = randomUUID();
        const saved = await Promise.all([
          review.assignEventPages(body, requestKey, admin.id, 'Admin'),
          review.assignEventPages(body, requestKey, admin.id, 'Admin'),
        ]);
        assert.deepEqual(saved[0], saved[1]);
        assert.equal((await review.eventPageAssignments()).total, 2);
        assert.equal(
          (
            await owner.query(
              'SELECT count(*)::int AS n FROM event_page_assignment_requests',
            )
          ).rows[0].n,
          1,
        );
        await assert.rejects(
          review.assignEventPages(
            {
              ...body,
              assignments: [{ ...body.assignments[0]!, eventPageId: 'b' }],
            },
            requestKey,
            admin.id,
            'Admin',
          ),
        );
        const audit = (
          await owner.query(
            'SELECT old_values,new_values FROM audit_events WHERE reason=$1',
            [
              'Assigned the existing Event obtain to one page during upgrade review.',
            ],
          )
        ).rows;
        assert.equal(audit.length, 1);
        assert.equal(audit[0].old_values.eventPageId, null);
        assert.equal(audit[0].new_values.eventPageId, 'a');
        const b = await review.detail(pending.receipt.submissionId);
        assert.equal((await approve(b!.submission)).eventPageId, 'b');
        assert.equal(
          (await backend.collections()).filter(
            (c) => c.itemId === 1 && c.collectionType === 'event',
          ).length,
          2,
        );
      },
    );
    await t.test(
      'pair uniqueness, concurrent pages and revocation keep canonical Regular rules',
      async () => {
        await owner.query(
          'UPDATE submission_filter_settings SET filter_collected=true',
        );
        const a = await manual(5, 'a'),
          b = await manual(5, 'b');
        const distinct = await Promise.all([approve(a), approve(b)]);
        assert.deepEqual(
          distinct.map((c) => c.eventPageId),
          ['a', 'b'],
        );
        const same = [await manual(6, 'a'), await manual(6, 'a')];
        const race = await Promise.allSettled(same.map((s) => approve(s)));
        assert.equal(race.filter((r) => r.status === 'fulfilled').length, 1);
        assert.equal(race.filter((r) => r.status === 'rejected').length, 1);
        const revoked = await review.mutate(
          distinct[0]!.id,
          distinct[0]!.version,
          {
            action: 'revoke',
            expectedVersion: distinct[0]!.version,
            reason: 'Wrong proof',
          },
          admin.id,
          'Admin',
        );
        assert.equal(revoked.status, 'revoked');
        assert.equal((await manual(5, 'a', true)).collectionType, 'event');
        await assert.rejects(manual(5, 'b', true));
        await owner.query(
          'UPDATE submission_filter_settings SET filter_collected=false',
        );
        const fallback = await manual(5, 'b', true);
        assert.equal(fallback.collectionType, 'regular');
        assert.equal(fallback.eventPageId, null);
        const hc = await manual(5, undefined, true, true);
        assert.equal(hc.collectionType, 'regular');
        assert.equal(hc.eventPageId, null);
        const current = await backend.collections();
        assert.equal(
          new Set(current.filter((c) => c.itemId === 5).map((c) => c.itemId))
            .size,
          1,
        );
      },
    );
    await t.test(
      'ambiguous intake, frozen review, unmatched resolution and transport replay retain one target',
      async () => {
        const f = fields(7),
          requestKey = randomUUID();
        const ambiguous = await proof.createRuneLite(
          f,
          undefined,
          requestKey,
          key,
        );
        assert.equal(ambiguous.receipt.status, 'pending');
        assert.equal(ambiguous.receipt.eventPageId, null);
        await assert.rejects(
          proof.createRuneLite(
            { ...f, eventPageId: 'unrelated' },
            undefined,
            requestKey,
            key,
          ),
        );
        await owner.query(
          "DELETE FROM collection_log_schedule_pages WHERE page_id='b'",
        );
        const detail = (await review.detail(ambiguous.receipt.submissionId))!;
        assert.deepEqual(detail.submission.eligibleEventPageIds, ['a', 'b']);
        await assert.rejects(approve(detail.submission));
        const approved = await approve(detail.submission, {
          hardcore: false,
          useIntakeTiming: true,
          eventPageId: 'b',
        });
        assert.equal(approved.eventPageId, 'b');
        assert.deepEqual(
          (await proof.createRuneLite(f, undefined, requestKey, key)).receipt,
          ambiguous.receipt,
          'a saved receipt does not follow later review/schedule changes',
        );
        const duplicate = await proof.createRuneLite(
          f,
          screenshotRecord(),
          randomUUID(),
          key,
        );
        assert.equal(duplicate.receipt.duplicate, true);
        assert.equal(duplicate.receipt.eventPageId, null);
        const single = await proof.createRuneLite(
          fields(8),
          undefined,
          randomUUID(),
          key,
        );
        assert.equal(single.receipt.status, 'approved');
        assert.equal(single.receipt.eventPageId, 'a');
        await assert.rejects(
          proof.createRuneLite(fields(9, 'b'), undefined, randomUUID(), key),
        );
        const unknownFields = { ...fields(9), itemId: 1999999 },
          unknown = await proof.createRuneLite(
            unknownFields,
            undefined,
            randomUUID(),
            key,
          );
        assert.equal(unknown.receipt.itemId, null);
        await owner.query(
          'INSERT INTO game_item_ids(game_item_id,item_id) VALUES(1999999,9)',
        );
        const resolved = await review.mutate(
          unknown.receipt.submissionId,
          1,
          {
            itemId: 9,
            collectorName: unknownFields.username,
            collectedOn: unknown.receipt.collectedOn,
            hardcore: false,
            useIntakeTiming: true,
            reason: 'Matched',
          },
          admin.id,
          'Admin',
        );
        assert.equal(resolved.eventPageId, 'a');
        assert.equal((await approve(resolved)).eventPageId, 'a');
        await owner.query(
          "INSERT INTO collection_log_schedule_pages(schedule_id,page_id) VALUES('00000000-0000-4000-8000-000000000001','b')",
        );
        const input = {
          interactionId: '123456789012345678',
          guildId: '123456789012345679',
          actorDiscordId: '123456789012345670',
          rawItemText: 'Item 10',
          itemId: 10,
          collectorName: 'Discord player',
          hardcore: false,
          image: screenshotRecord(),
        };
        const bot = await backend.submitClaim(input, claimHash(input));
        assert.equal(bot.receipt.eventPageId, null);
        assert.equal(bot.receipt.collectionType, 'event');
        assert.deepEqual(
          (await backend.submitClaim(input, claimHash(input))).receipt,
          bot.receipt,
        );
        const botDetail = (await review.detail(bot.receipt.submissionId))!;
        assert.equal(
          (
            await approve(botDetail.submission, {
              hardcore: false,
              useIntakeTiming: true,
              eventPageId: 'a',
            })
          ).eventPageId,
          'a',
        );
        const invalid = {
          ...input,
          interactionId: '123456789012345677',
          eventPageId: 'unrelated',
        };
        await assert.rejects(backend.submitClaim(invalid, claimHash(invalid)));
        await owner.query(
          "DELETE FROM page_items WHERE page_id='a' AND item_id=10",
        );
        const retained = (await review.detail(bot.receipt.submissionId))!
          .submission;
        const corrected = await review.mutate(
          retained.id,
          retained.version,
          {
            itemId: 10,
            collectorName: 'Renamed display',
            collectedOn: retained.collectedOn,
            hardcore: false,
            reason: 'Retain historical page',
          },
          admin.id,
          'Admin',
        );
        assert.equal(corrected.eventPageId, 'a');
        assert.equal(
          (await review.eventPageAssignments()).total,
          2,
          'historical assigned pages are not reassigned after removal',
        );
      },
    );
    await t.test(
      'all seven RuneLite fields plus PNG carry a validated page through multipart intake',
      async () => {
        const form = new FormData();
        for (const [field, value] of Object.entries({
          username: 'Multipart page collector',
          clanName: 'Clan name',
          itemId: '900011',
          worldType: 'MEMBERS',
          chatMessage: 'Full original chat proof',
          itemName: 'Item 11',
          eventPageId: 'a',
        }))
          form.set(field, value);
        form.set(
          'screenshot',
          new Blob([new Uint8Array(png)], { type: 'image/png' }),
          'proof.png',
        );
        const encoded = new Request(
          'https://clog.example.com/api/v1/runelite/submissions',
          { method: 'POST', body: form },
        );
        const headers = {
          'content-type': encoded.headers.get('content-type')!,
          'x-clan-api-key': key,
          'idempotency-key': randomUUID(),
        };
        const payload = Buffer.from(await encoded.arrayBuffer());
        const result = await app!.inject({
          method: 'POST',
          url: '/api/v1/runelite/submissions',
          headers,
          payload,
        });
        assert.equal(result.statusCode, 201, result.body);
        assert.equal(result.json().eventPageId, 'a');
        assert.deepEqual(
          (
            await app!.inject({
              method: 'POST',
              url: '/api/v1/runelite/submissions',
              headers,
              payload,
            })
          ).json(),
          result.json(),
        );
      },
    );
    await t.test(
      'fresh installations have no unnecessary assignment review',
      async () => {
        const fresh = name + '_fresh',
          freshUrl = new URL(url);
        freshUrl.pathname = '/' + fresh;
        await root.query('CREATE DATABASE ' + fresh);
        const pool = new pg.Pool({ connectionString: freshUrl.href });
        try {
          await migrate(freshUrl.href);
          assert.equal(
            (
              await new PgReviewStore(
                pool,
                new PgStore(pool),
              ).eventPageAssignments()
            ).total,
            0,
          );
        } finally {
          await pool.end();
          await root.query('DROP DATABASE ' + fresh);
        }
      },
    );
  },
);
