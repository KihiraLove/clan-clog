/** Real populated upgrade, identity operations and runtime-role HTTP boundaries. */
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
  normalizePlayerName,
  defaultRuneLiteRules,
  type CollectorNamePreview,
} from '@clog/domain';
import { PgStore } from './store.js';
import { PgReviewStore } from './review-store.js';
import { PgProofStore } from './proof-store.js';
import { PgClanKeyStore, loadClanKeyRoot } from './clan-api-key.js';
import { claimHash } from './intake.js';
import { hashPassword } from './passwords.js';
import { createApp } from './app.js';
import { screenshotRecord } from './tests/screenshot.js';

test(
  'collector identity upgrade and confirmed names preserve complete history and serialize future writes',
  { skip: !process.env.TEST_DATABASE_URL },
  async (t) => {
    const root = new pg.Pool({
        connectionString: process.env.TEST_DATABASE_URL,
      }),
      database = 'collector_names_' + randomUUID().replaceAll('-', '');
    await root.query('CREATE DATABASE ' + database);
    const url = new URL(process.env.TEST_DATABASE_URL!);
    url.pathname = '/' + database;
    url.searchParams.delete('options');
    const owner = new pg.Pool({ connectionString: url.href }),
      directory = await mkdtemp(join(tmpdir(), 'clog-names-'));
    const resources: { runtime?: pg.Pool } = {};
    let app: ReturnType<typeof createApp> | undefined;
    t.after(async () => {
      await app?.close();
      await resources.runtime?.end();
      await owner.end();
      await root.query('DROP DATABASE ' + database);
      await root.end();
      await rm(directory, { recursive: true, force: true });
    });
    const migrationDirectory = new URL(
      '../../../packages/database/migrations/',
      import.meta.url,
    );
    await owner.query(
      'CREATE TABLE schema_migrations(name text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())',
    );
    for (const file of (await readdir(migrationDirectory))
      .filter((f) => f.endsWith('.sql') && Number(f.slice(0, 3)) < 7)
      .sort()) {
      const sql = await readFile(new URL(file, migrationDirectory), 'utf8');
      await owner.query(sql);
      await owner.query(
        'INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)',
        [file, createHash('sha256').update(sql).digest('hex')],
      );
    }
    const previous = new PgStore(owner),
      password = 'collector-owner-test-password';
    await previous.ensureDefaultAdmin(await hashPassword(password));
    const actor = (await previous.accountByUsername('admin'))!;
    await previous.createModerator('moderator', actor.passwordHash, actor.id);
    await owner.query('UPDATE staff_accounts SET must_change_password=false');
    await owner.query(
      "INSERT INTO items(id,name) SELECT i,'Item '||i FROM generate_series(1,12) i; INSERT INTO game_item_ids(game_item_id,item_id) SELECT 900000+id,id FROM items; INSERT INTO pages(id,name,category,sort_order) VALUES('a','Page A','bosses',0); INSERT INTO page_items(page_id,item_id,slot) SELECT 'a',id,id FROM items;",
    );
    const seed = [
      ['Alice Smith', 'approved', false, 'regular'],
      [' ALICE__SMITH ', 'pending', false, 'regular'],
      ['alice\u00a0smith', 'approved', true, 'regular'],
      ['Alice Smith', 'rejected', false, 'regular'],
      ['Alice Smith', 'revoked', false, 'regular'],
      ['Alice Smith', 'approved', false, 'event'],
      ['Bob', 'approved', false, 'regular'],
      ['İ_ΣΣ', 'pending', false, 'regular'],
      ['i\u0307 σς', 'rejected', false, 'regular'],
    ] as const;
    const ids = seed.map(() => randomUUID());
    for (const [index, [name, status, hardcore, type]] of seed.entries())
      await owner.query(
        "INSERT INTO submissions(id,source,raw_item_text,item_id,collector_name,collected_on,date_source,proof_url,status,reviewed_by,reviewed_at,hardcore,collection_type,event_page_id,intake_receipt,intake_payload_hash,review_reason) VALUES($1,'manual','Original item',1,$2,'2026-10-01','admin','',$3,CASE WHEN $3='pending' THEN NULL ELSE 'original-actor' END,CASE WHEN $3='pending' THEN NULL ELSE now() END,$4,$5,$6,$7,repeat('a',64),CASE WHEN $3 IN('rejected','revoked') THEN 'Original review reason' ELSE NULL END)",
        [
          ids[index],
          name,
          status,
          hardcore,
          type,
          type === 'event' ? 'a' : null,
          JSON.stringify({
            original: name,
            status,
            opaque: ['Exact receipt', index],
          }),
        ],
      );
    await owner.query(
      "INSERT INTO audit_events(submission_id,actor_discord_id,actor_name,action,old_values,new_values) VALUES($1,'original-actor','Original actor','create',$2,$2)",
      [
        ids[0],
        JSON.stringify({ collectorName: 'Original Alice', unchanged: true }),
      ],
    );
    const historySql =
      "SELECT to_jsonb(s)-'collector_id'-'original_collector_name' AS data FROM submissions s WHERE id=ANY($1::uuid[]) ORDER BY id";
    const before = (await owner.query(historySql, [ids])).rows,
      oldAudit = (await owner.query('SELECT * FROM audit_events ORDER BY id'))
        .rows;
    await migrate(url.href);
    await migrate(url.href);
    await provisionRuntimeRole(url.href, 'd'.repeat(64));
    const runtimeUrl = new URL(url);
    runtimeUrl.username = 'clog_runtime';
    runtimeUrl.password = 'd'.repeat(64);
    const runtime = new pg.Pool({ connectionString: runtimeUrl.href, max: 12 });
    resources.runtime = runtime;
    const backend = new PgStore(runtime),
      review = new PgReviewStore(runtime, backend),
      proof = new PgProofStore(runtime);
    const manual = (
      name: string,
      itemId = 1,
      approve = true,
      hardcore = false,
      key = randomUUID(),
    ) =>
      review.createManual(
        {
          collectorName: name,
          itemId,
          approve,
          hardcore,
          collectedOn: '2026-10-20',
          collectionType: 'regular',
        },
        actor.id,
        'Admin',
        key,
      );
    const find = async (name: string) =>
      (await review.collectors(name)).collectors.find(
        (r) => normalizePlayerName(r.name) === normalizePlayerName(name),
      )!;
    const preview = (id: string, name: string) =>
      review.previewCollectorName(id, name, actor.id);
    const apply = (p: CollectorNamePreview, key = randomUUID()) =>
      review.applyCollectorName(p.token, key, actor.id, 'Admin');
    const policy = async (mode: 'reject' | 'separate' | 'merge') =>
      review.saveSubmissionFilters(
        false,
        (await review.submissionFilters()).revision,
        actor.id,
        mode,
      );
    const alice = await find('Alice Smith'),
      bob = await find('Bob');
    assert.ok(alice && bob);
    await t.test(
      '007 backfills exact shared Unicode identities and preserves raw records, audits and receipts',
      async () => {
        assert.deepEqual((await owner.query(historySql, [ids])).rows, before);
        assert.deepEqual(
          (await owner.query('SELECT * FROM audit_events ORDER BY id')).rows,
          oldAudit,
        );
        assert.equal(
          (
            await owner.query(
              'SELECT count(*)::int AS n FROM submissions WHERE collector_id IS NULL OR original_collector_name IS NULL',
            )
          ).rows[0].n,
          0,
        );
        assert.equal(
          (
            await owner.query(
              'SELECT DISTINCT collector_id FROM submissions WHERE id=ANY($1::uuid[])',
              [ids.slice(0, 6)],
            )
          ).rowCount,
          1,
        );
        assert.equal(
          (
            await owner.query(
              'SELECT DISTINCT collector_id FROM submissions WHERE id=ANY($1::uuid[])',
              [ids.slice(7)],
            )
          ).rowCount,
          1,
        );
        assert.equal(
          (await review.collectors('ALICE__')).collectors[0]!.id,
          alice.id,
        );
        const p = await preview(alice.id, 'Alice Renamed');
        assert.deepEqual(p.counts, {
          pending: 1,
          approved: 3,
          rejected: 1,
          revoked: 1,
        });
        assert.equal(p.operation, 'rename');
        assert.deepEqual((await owner.query(historySql, [ids])).rows, before);
        const unchanged = await preview(alice.id, alice.name);
        assert.equal(unchanged.operation, 'noop');
        await assert.rejects(preview(alice.id, '___'), { status: 422 });
        await assert.rejects(preview(randomUUID(), 'Missing'), { status: 409 });
        assert.equal(
          (await runtime!.query('SELECT current_user AS role')).rows[0].role,
          'clog_runtime',
        );
        for (const table of ['collector_name_audit', 'collector_name_requests'])
          await assert.rejects(runtime!.query('DELETE FROM ' + table), {
            code: '42501',
          });
      },
    );
    const receiptKey = randomUUID(),
      receipt = await manual(alice.name, 2, true, false, receiptKey);
    await t.test(
      'rename updates every status/world projection with provenance and stale-editor protection',
      async () => {
        const oldSnapshot = await backend.publicSnapshot('collections');
        const oldQueue = await review.queue('reviewed', false, 1);
        const p = await preview(alice.id, 'Alice Renamed'),
          result = await apply(p);
        assert.equal(result.operation, 'rename');
        assert.equal(result.targetId, alice.id);
        for (const id of ids.slice(0, 6)) {
          const row = (await review.detail(id))!.submission;
          assert.equal(row.collectorName, 'Alice Renamed');
          assert.equal(
            row.originalCollectorName,
            id === ids[0] ? 'Original Alice' : seed[ids.indexOf(id)]![0],
          );
        }
        const next = await backend.publicSnapshot('collections');
        assert.notEqual(next.revision, oldSnapshot.revision);
        assert.notEqual(
          (await review.queue('reviewed', false, 1)).revision,
          oldQueue.revision,
        );
        await assert.rejects(
          review.queue('reviewed', false, 1, oldQueue.nextCursor!),
          { status: 409 },
        );
        assert.equal(
          (JSON.parse(next.body).credits as { collectorName: string }[]).filter(
            (r) => r.collectorName === 'Alice Renamed',
          ).length,
          4,
        );
        await assert.rejects(
          review.mutate(
            receipt.id,
            receipt.version,
            { note: 'Stale editor' },
            actor.id,
            'Admin',
          ),
          { status: 409 },
        );
        assert.deepEqual(
          await manual(alice.name, 2, true, false, receiptKey),
          receipt,
        );
        assert.deepEqual((await owner.query(historySql, [ids])).rows, before);
        assert.deepEqual(
          (
            await owner.query('SELECT * FROM audit_events ORDER BY id')
          ).rows.slice(0, oldAudit.length),
          oldAudit,
        );
        const cosmetic = await preview(alice.id, 'ALICE RENAMED');
        assert.equal(cosmetic.operation, 'rename');
        await apply(cosmetic);
        assert.equal((await find('alice_renamed')).name, 'ALICE RENAMED');
      },
    );
    await t.test(
      'confirmed merge preserves overlaps and counts; future sources reject against the survivor and retired names are separate',
      async () => {
        await policy('reject');
        const total = (await backend.collections()).length,
          p = await preview(alice.id, ' bOB ');
        assert.equal(p.operation, 'merge');
        assert.equal(p.newName, bob.name);
        const key = randomUUID(),
          result = await apply(p, key);
        assert.equal((await backend.collections()).length, total);
        assert.deepEqual((await owner.query(historySql, [ids])).rows, before);
        assert.equal(
          (await review.detail(ids[0]!))!.submission.collectorName,
          bob.name,
        );
        assert.equal((await review.detail(ids[2]!))!.submission.hardcore, true);
        assert.equal((await manual('BOB')).status, 'rejected');
        assert.equal((await manual('bob', 1, true, true)).status, 'rejected');
        const keys = new PgClanKeyStore(
          runtime!,
          await loadClanKeyRoot(directory),
        );
        await keys.ensureDefault();
        const rules = defaultRuneLiteRules('Clan name');
        rules.worldPolicies.members = 'allow';
        await owner.query('UPDATE runelite_settings SET rules=$1', [
          JSON.stringify(rules),
        ]);
        const rune = await proof.createRuneLite(
          {
            itemId: 900001,
            username: 'BOB',
            clanName: 'Clan name',
            worldTypes: ['MEMBERS'],
            chatMessage: 'Original chat proof',
          },
          undefined,
          randomUUID(),
          (await keys.settings()).key,
        );
        assert.equal(rune.receipt.status, 'rejected');
        assert.equal(
          (await review.detail(rune.receipt.submissionId))!.submission
            .collectorId,
          bob.id,
        );
        const input = {
          interactionId: '3' + Date.now() + '132',
          guildId: '234567890123456789',
          actorDiscordId: '123456789012345678',
          rawItemText: 'Item 1',
          itemId: 1,
          collectorName: 'bob',
          hardcore: false,
          image: screenshotRecord(),
        };
        const discord = await backend.submitClaim(input, claimHash(input));
        assert.equal(discord.receipt.status, 'rejected');
        assert.equal(
          (await review.detail(discord.receipt.submissionId))!.submission
            .collectorId,
          bob.id,
        );
        const rebound = await manual(alice.name);
        assert.equal(rebound.status, 'approved');
        assert.notEqual(rebound.collectorId, alice.id);
        assert.notEqual(rebound.collectorId, bob.id);
        assert.deepEqual(await apply(p, key), result);
        await assert.rejects(apply(await preview(bob.id, 'Bob Again'), key), {
          status: 409,
        });
        const updated = (await review.detail(ids[0]!))!.submission;
        await policy('separate');
        const reassigned = await review.mutate(
          updated.id,
          updated.version,
          {
            itemId: 1,
            collectorName: 'Individual fix',
            collectedOn: updated.collectedOn,
            hardcore: false,
            collectionType: 'regular',
            reason: 'One incorrect claim',
          },
          actor.id,
          'Admin',
        );
        assert.equal(reassigned.collectorName, 'Individual fix');
        assert.ok(reassigned.version > updated.version);
        assert.equal(
          (await review.detail(ids[3]!))!.submission.collectorName,
          bob.name,
        );
        assert.equal(reassigned.originalCollectorName, 'Original Alice');
      },
    );
    await t.test(
      'history writes and concurrent target creation invalidate previews; competing applies never silently change operation',
      async () => {
        const source = await manual('Race source', 3),
          identity = source.collectorId!;
        const p = await preview(identity, 'New target');
        await manual('new_target', 4);
        await assert.rejects(apply(p), { status: 409 });
        const merge = await preview(identity, 'NEW TARGET');
        assert.equal(merge.operation, 'merge');
        const current = (await review.detail(source.id))!.submission;
        await review.mutate(
          current.id,
          current.version,
          { note: 'Changes preview scope' },
          actor.id,
          'Admin',
        );
        await assert.rejects(apply(merge), { status: 409 });
        const a = await preview(identity, 'One winner'),
          b = await preview(identity, 'Other winner');
        const results = await Promise.allSettled([apply(a), apply(b)]);
        assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
        assert.equal(results.filter((r) => r.status === 'rejected').length, 1);
        const held = await owner.connect();
        try {
          await held.query('BEGIN');
          await held.query('SELECT pg_advisory_xact_lock(74261020)');
          let finished = false;
          const intake = manual('Held intake', 5).then((r) => {
            finished = true;
            return r;
          });
          await new Promise((r) => setTimeout(r, 100));
          assert.equal(finished, false);
          await held.query('COMMIT');
          assert.equal((await intake).status, 'approved');
        } finally {
          await held.query('ROLLBACK');
          held.release();
        }
      },
    );
    await t.test(
      'merge chains stay one hop and failed audit insertion rolls back names, revisions and saved results',
      async () => {
        const end = await manual('Final survivor', 6);
        await apply(await preview(bob.id, 'Final survivor'));
        const aliases = (
          await owner.query(
            'SELECT id,merged_into FROM collectors WHERE merged_into IS NOT NULL',
          )
        ).rows;
        assert.equal(
          aliases.find((r) => r.id === alice.id)!.merged_into,
          end.collectorId,
        );
        assert.equal(
          (await review.detail(ids[3]!))!.submission.collectorName,
          'Final survivor',
        );
        const stale = (await review.detail(ids[3]!))!.submission;
        await apply(await preview(end.collectorId!, 'Final Name'));
        assert.ok(
          (await review.detail(ids[3]!))!.submission.version > stale.version,
        );
        await assert.rejects(
          owner.query('UPDATE collectors SET merged_into=$2 WHERE id=$1', [
            end.collectorId,
            alice.id,
          ]),
          { code: '23514' },
        );
        await assert.rejects(
          owner.query('UPDATE collectors SET merged_into=id WHERE id=$1', [
            end.collectorId,
          ]),
          { code: '23514' },
        );
        const p = await preview(end.collectorId!, 'Rollback name');
        const snapshot = async () => ({
          names: (await owner.query('SELECT * FROM collectors ORDER BY id'))
            .rows,
          requests: (
            await owner.query(
              'SELECT * FROM collector_name_requests ORDER BY request_key',
            )
          ).rows,
          projections: (
            await owner.query(
              'SELECT * FROM projection_state ORDER BY resource',
            )
          ).rows,
        });
        const beforeFailure = await snapshot();
        await owner.query(
          "CREATE FUNCTION fail_name_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected audit failure'; END $$; CREATE TRIGGER fail_name_audit BEFORE INSERT ON collector_name_audit FOR EACH ROW EXECUTE FUNCTION fail_name_audit();",
        );
        await assert.rejects(apply(p), /injected audit failure/);
        await owner.query(
          'DROP TRIGGER fail_name_audit ON collector_name_audit; DROP FUNCTION fail_name_audit()',
        );
        assert.deepEqual(await snapshot(), beforeFailure);
        const audit = (
          await owner.query(
            'SELECT * FROM collector_name_audit ORDER BY completed_at',
          )
        ).rows;
        assert.ok(audit.length >= 4);
        assert.ok(
          audit.every(
            (r) => r.actor_id === actor.id && r.actor_name === 'Admin',
          ),
        );
        await assert.rejects(
          owner.query(
            'UPDATE submissions SET original_collector_name=$2 WHERE id=$1',
            [ids[3], 'Overwrite evidence'],
          ),
          { code: '23514' },
        );
      },
    );
    await t.test(
      'HTTP search/preview/apply require administrator, origin and CSRF; only explicit apply changes identity',
      async () => {
        app = createApp(
          () => backend.ready(),
          () => backend.settings(),
          {
            store: backend,
            review,
            auth: {
              origin: 'https://clog.example.com',
              secret: 'a'.repeat(64),
              secure: true,
            },
            logger: false,
          },
        );
        const login = async (username: string) => {
          const response = await app!.inject({
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
        const admin = await login('admin'),
          mod = await login('moderator'),
          endpoint = '/api/v1/admin/collector-name-changes';
        assert.equal(
          (await app.inject({ url: '/api/v1/admin/collectors' })).statusCode,
          401,
        );
        assert.equal(
          (await app.inject({ url: '/api/v1/admin/collectors', headers: mod }))
            .statusCode,
          403,
        );
        const person = await find('Final Name');
        const payload = { sourceId: person.id, newName: 'HTTP Renamed' };
        for (const headers of [
          mod,
          { ...admin, 'x-csrf-token': 'bad' },
          { ...admin, origin: 'https://invalid.example' },
        ])
          assert.equal(
            (
              await app.inject({
                method: 'POST',
                url: endpoint + '/preview',
                headers,
                payload,
              })
            ).statusCode,
            403,
          );
        const response = await app.inject({
          method: 'POST',
          url: endpoint + '/preview',
          headers: admin,
          payload,
        });
        assert.equal(response.statusCode, 200, response.body);
        assert.equal((await find('Final Name')).id, person.id);
        const token = response.json().token,
          key = randomUUID();
        assert.equal(
          (
            await app.inject({
              method: 'POST',
              url: endpoint + '/apply',
              headers: {
                ...admin,
                'idempotency-key': key,
                'x-csrf-token': 'bad',
              },
              payload: { token },
            })
          ).statusCode,
          403,
        );
        const result = await app.inject({
          method: 'POST',
          url: endpoint + '/apply',
          headers: { ...admin, 'idempotency-key': key },
          payload: { token },
        });
        assert.equal(result.statusCode, 200, result.body);
        assert.equal((await find('HTTP Renamed')).id, person.id);
        const replay = await app.inject({
          method: 'POST',
          url: endpoint + '/apply',
          headers: { ...admin, 'idempotency-key': key },
          payload: { token },
        });
        assert.deepEqual(replay.json(), result.json());
      },
    );
  },
);
