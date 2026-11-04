import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pg from 'pg';
import { migrate } from '@clog/database/dist/migrate.js';
import { provisionRuntimeRole } from '@clog/database/dist/runtime-role.js';
import { gameModes, defaultRuneLiteRules, type GameMode } from '@clog/domain';
import { PgStore } from './store.js';
import { PgReviewStore } from './review-store.js';
import { PgProofStore } from './proof-store.js';
import { PgCollectorGameModes } from './collector-game-modes.js';
import { PgCollectorNames } from './collector-name-store.js';
import { PgPublicNameChanges } from './public-collector-names.js';
import { PgAccessControlStore } from './access-control.js';
import { PgClanKeyStore, loadClanKeyRoot } from './clan-api-key.js';
import { claimHash } from './intake.js';
import { hashPassword } from './passwords.js';
import { createApp } from './app.js';
import { screenshotRecord } from './tests/screenshot.js';
test(
  'collector game modes: populated 008 upgrade, atomic intake/profile changes, merge resolution and review authority',
  { skip: !process.env.TEST_DATABASE_URL },
  async (t) => {
    const root = new pg.Pool({
        connectionString: process.env.TEST_DATABASE_URL,
      }),
      database = 'game_modes_' + randomUUID().replaceAll('-', '');
    await root.query('CREATE DATABASE ' + database);
    const url = new URL(process.env.TEST_DATABASE_URL!);
    url.pathname = '/' + database;
    url.searchParams.delete('options');
    const owner = new pg.Pool({ connectionString: url.href }),
      resources: { runtime?: pg.Pool; app?: ReturnType<typeof createApp> } = {},
      directory = await mkdtemp(join(tmpdir(), 'clog-mode-'));
    t.after(async () => {
      await resources.app?.close();
      await resources.runtime?.end();
      await owner.end();
      await root.query('DROP DATABASE ' + database);
      await root.end();
      await rm(directory, { force: true, recursive: true });
    });
    await owner.query(
      'CREATE TABLE schema_migrations(name text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())',
    );
    const migrations = new URL(
      '../../../packages/database/migrations/',
      import.meta.url,
    );
    for (const file of (await readdir(migrations))
      .filter((f) => f.endsWith('.sql') && Number(f.slice(0, 3)) < 9)
      .sort()) {
      const sql = await readFile(new URL(file, migrations), 'utf8');
      await owner.query(sql);
      await owner.query(
        'INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)',
        [file, createHash('sha256').update(sql).digest('hex')],
      );
    }
    const legacyCollector = randomUUID(),
      legacySubmission = randomUUID();
    await owner.query(
      "INSERT INTO items(id,name) SELECT i,'Item '||i FROM generate_series(1,20)i;INSERT INTO game_item_ids(game_item_id,item_id) SELECT 900000+id,id FROM items;INSERT INTO pages(id,name,category,sort_order) VALUES('a','A','bosses',0);INSERT INTO page_items(page_id,item_id,slot) SELECT 'a',id,id FROM items",
    );
    await owner.query(
      "INSERT INTO collectors(id,display_name,normalized_name) VALUES($1,'Legacy User','legacy user')",
      [legacyCollector],
    );
    await owner.query(
      "INSERT INTO submissions(id,source,raw_item_text,item_id,collector_name,collector_id,collected_on,date_source,proof_url,status,reviewed_by,reviewed_at,intake_receipt,intake_payload_hash) VALUES($1,'manual','Legacy item',1,'Legacy User',$2,'2026-10-01','admin','','approved','original staff',now(),'{\"immutable\":true}',repeat('a',64))",
      [legacySubmission, legacyCollector],
    );
    const oldHistory = (
        await owner.query('SELECT to_jsonb(s) AS data FROM submissions s')
      ).rows,
      oldLedger = (
        await owner.query('SELECT * FROM schema_migrations ORDER BY name')
      ).rows;
    const legacyManualKey = randomUUID(),
      legacyManualFields = {
        itemId: 1,
        collectorName: 'Legacy User',
        collectedOn: '2026-10-01',
        hardcore: false,
        approve: true,
      },
      legacyManualReceipt = {
        id: legacySubmission,
        source: 'manual',
        status: 'approved',
        version: 1,
        collectorName: 'Legacy User',
        collectedOn: '2026-10-01',
        marker: 'Exact pre-009 manual receipt',
      };
    // Independent pre-009 hash layout: no new optional-field slot is inserted.
    const legacyManualHash = createHash('sha256')
      .update(
        JSON.stringify([1, 'Legacy User', '2026-10-01', false, '', true, '']),
      )
      .digest('hex');
    await owner.query(
      'INSERT INTO manual_submission_requests(actor_id,request_key,payload_hash,submission_id,response) VALUES($1,$2,$3,$4,$5)',
      [
        'legacy-staff',
        legacyManualKey,
        legacyManualHash,
        legacySubmission,
        JSON.stringify(legacyManualReceipt),
      ],
    );
    await migrate(url.href);
    await migrate(url.href);
    await provisionRuntimeRole(url.href, 'f'.repeat(64));
    const runtimeUrl = new URL(url);
    runtimeUrl.username = 'clog_runtime';
    runtimeUrl.password = 'f'.repeat(64);
    const runtime = new pg.Pool({ connectionString: runtimeUrl.href, max: 12 });
    resources.runtime = runtime;
    const backend = new PgStore(runtime),
      review = new PgReviewStore(runtime, backend),
      modes = new PgCollectorGameModes(runtime),
      names = new PgCollectorNames(runtime),
      proof = new PgProofStore(runtime),
      password = 'collector-mode-test-password';
    await backend.ensureDefaultAdmin(await hashPassword(password));
    const actor = (await backend.accountByUsername('admin'))!;
    await backend.createModerator('moderator', actor.passwordHash, actor.id);
    await owner.query('UPDATE staff_accounts SET must_change_password=false');
    const keys = new PgClanKeyStore(runtime, await loadClanKeyRoot(directory));
    await keys.ensureDefault();
    const rules = defaultRuneLiteRules('Clan name');
    rules.worldPolicies.members = 'allow';
    await owner.query('UPDATE runelite_settings SET rules=$1', [
      JSON.stringify(rules),
    ]);
    const key = (await keys.settings()).key;
    const manual = (
      name: string,
      gameMode?: GameMode,
      itemId = 2,
      hardcore = false,
      approve = false,
      requestKey = randomUUID(),
    ) =>
      review.createManual(
        {
          collectorName: name,
          itemId,
          hardcore,
          approve,
          collectedOn: '2026-10-20',
          collectionType: 'regular',
          ...(gameMode === undefined ? {} : { gameMode }),
        },
        actor.id,
        'Admin',
        requestKey,
      );
    const save = async (
      id: string,
      gameMode: GameMode | null,
      requestKey = randomUUID(),
    ) => {
      const current = await modes.get(id);
      return modes.save(
        id,
        {
          collectorId: current.collectorId,
          expectedRevision: current.revision,
          gameMode,
        },
        requestKey,
        actor.id,
        'Admin',
      );
    };
    const profile = (id: string) => modes.get(id);
    await t.test(
      '009 retains all old bytes/checksums, starts unknown and enforces canonical values and immutable submitted evidence',
      async () => {
        assert.deepEqual(
          (
            await owner.query(
              "SELECT to_jsonb(s)-'submitted_game_mode' AS data FROM submissions s",
            )
          ).rows,
          oldHistory,
        );
        assert.deepEqual(
          (
            await owner.query(
              'SELECT * FROM schema_migrations ORDER BY name LIMIT 8',
            )
          ).rows,
          oldLedger,
        );
        assert.equal((await profile(legacySubmission)).gameMode, null);
        assert.equal((await backend.collections())[0]!.gameMode, null);
        await assert.rejects(
          owner.query(
            "UPDATE collectors SET game_mode='group_ironman_5' WHERE id=$1",
            [legacyCollector],
          ),
          { code: '23514' },
        );
        await assert.rejects(
          owner.query(
            "UPDATE submissions SET submitted_game_mode='normal' WHERE id=$1",
            [legacySubmission],
          ),
          { code: '23514' },
        );
      },
    );
    await t.test(
      'a pre-009 omitted-mode manual request keeps its exact hash and receipt after a later staff mode assignment',
      async () => {
        await save(legacySubmission, 'hardcore_ironman');
        const replay = await review.createManual(
          legacyManualFields,
          'legacy-staff',
          'Legacy staff',
          legacyManualKey,
        );
        assert.deepEqual(replay, legacyManualReceipt);
        assert.equal(
          (await profile(legacySubmission)).gameMode,
          'hardcore_ironman',
        );
        assert.equal(
          (
            await owner.query(
              'SELECT payload_hash FROM manual_submission_requests WHERE request_key=$1',
              [legacyManualKey],
            )
          ).rows[0].payload_hash,
          legacyManualHash,
        );
      },
    );
    await t.test(
      'all seven input modes initialize one normalized profile; omission and conflicting later input preserve its value across worlds/items',
      async () => {
        for (const [index, mode] of gameModes.entries()) {
          const row = await manual('Mode ' + index, mode, index + 2);
          assert.equal(row.gameMode, mode);
          assert.equal(row.submittedGameMode, mode);
        }
        const one = await manual('Same User', 'ironman'),
          other = await manual('SAME__USER', 'normal', 3, true),
          omitted = await manual('same\u00a0user', undefined, 4);
        assert.equal(one.collectorId, other.collectorId);
        assert.equal(one.collectorId, omitted.collectorId);
        assert.equal(other.gameMode, 'ironman');
        assert.equal(other.submittedGameMode, 'normal');
        assert.equal(omitted.gameMode, 'ironman');
        assert.equal(omitted.submittedGameMode, null);
        assert.equal(other.hardcore, true);
      },
    );
    await t.test(
      'simultaneous conflicting initialization leaves one value with both original submitted values retained',
      async () => {
        const rows = await Promise.all([
          manual('Race User', 'ironman', 5),
          manual('RACE_USER', 'ultimate_ironman', 6),
        ]);
        assert.equal(rows[0]!.collectorId, rows[1]!.collectorId);
        const current = await profile(rows[0]!.id);
        assert.ok(['ironman', 'ultimate_ironman'].includes(current.gameMode!));
        const evidence = (
          await owner.query(
            'SELECT submitted_game_mode FROM submissions WHERE id=ANY($1::uuid[]) ORDER BY submitted_game_mode',
            [rows.map((r) => r.id)],
          )
        ).rows;
        assert.deepEqual(
          evidence.map((r) => r.submitted_game_mode),
          ['ironman', 'ultimate_ironman'],
        );
      },
    );
    await t.test(
      'staff saves affect all public appearances/ETags and independent profile revision, with immutable claims, audit, original values and no decisions',
      async () => {
        const a = await manual('Review User', 'ironman', 7, false, true),
          b = await manual('Review User', undefined, 8, true, true);
        const before = (
            await owner.query(
              'SELECT * FROM submissions WHERE id=ANY($1::uuid[]) ORDER BY id',
              [[a.id, b.id]],
            )
          ).rows,
          oldSnapshot = await backend.publicSnapshot('collections'),
          oldQueue = await review.queue('reviewed', false, 20),
          old = await profile(a.id);
        await save(a.id, 'hardcore_group_ironman');
        const next = await profile(b.id);
        assert.equal(next.gameMode, 'hardcore_group_ironman');
        assert.notEqual(next.revision, old.revision);
        assert.deepEqual(
          (
            await owner.query(
              'SELECT * FROM submissions WHERE id=ANY($1::uuid[]) ORDER BY id',
              [[a.id, b.id]],
            )
          ).rows,
          before,
        );
        assert.equal(
          (await review.detail(a.id))!.submission.submittedGameMode,
          'ironman',
        );
        const credits = (await backend.collections()).filter((c) =>
          [a.id, b.id].includes(c.submissionId),
        );
        assert.equal(credits.length, 2);
        assert.ok(
          credits.every((c) => c.gameMode === 'hardcore_group_ironman'),
        );
        assert.deepEqual(credits.map((c) => c.hardcore).sort(), [false, true]);
        assert.notEqual(
          (await backend.publicSnapshot('collections')).revision,
          oldSnapshot.revision,
        );
        assert.notEqual(
          (await review.queue('reviewed', false, 20)).revision,
          oldQueue.revision,
        );
        const audit = (
          await owner.query(
            'SELECT actor_id,old_mode,new_mode,origin FROM collector_game_mode_audit WHERE collector_id=$1',
            [a.collectorId],
          )
        ).rows;
        assert.deepEqual(audit, [
          {
            actor_id: actor.id,
            old_mode: 'ironman',
            new_mode: 'hardcore_group_ironman',
            origin: 'staff',
          },
        ]);
        await assert.rejects(
          modes.save(
            a.id,
            {
              collectorId: old.collectorId,
              expectedRevision: old.revision,
              gameMode: 'normal',
            },
            randomUUID(),
            actor.id,
            'Admin',
          ),
          { status: 409 },
        );
      },
    );
    await t.test(
      'explicit unassignment is retained against later intake; immutable old receipt replay cannot restore an outdated mode',
      async () => {
        const requestKey = randomUUID(),
          row = await manual(
            'Receipt User',
            'ironman',
            9,
            false,
            false,
            requestKey,
          );
        await save(row.id, null);
        const later = await manual('Receipt User', 'normal', 10);
        assert.equal(later.gameMode, null);
        assert.equal(later.submittedGameMode, 'normal');
        const replay = await manual(
          'Receipt User',
          'ironman',
          9,
          false,
          false,
          requestKey,
        );
        assert.deepEqual(replay, row);
        assert.equal((await profile(row.id)).gameMode, null);
        await assert.rejects(
          manual('Receipt User', 'normal', 9, false, false, requestKey),
          { status: 409 },
        );
      },
    );
    await t.test(
      'simultaneous staff choices with one profile revision commit exactly one audited value',
      async () => {
        const row = await manual('Staff Race', undefined, 20),
          current = await profile(row.id),
          fields = {
            collectorId: current.collectorId,
            expectedRevision: current.revision,
          };
        const results = await Promise.allSettled([
          modes.save(
            row.id,
            { ...fields, gameMode: 'ironman' },
            randomUUID(),
            actor.id,
            'Admin',
          ),
          modes.save(
            row.id,
            { ...fields, gameMode: 'ultimate_ironman' },
            randomUUID(),
            'other-staff',
            'Moderator',
          ),
        ]);
        assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
        const failed = results.find(
          (r) => r.status === 'rejected',
        ) as PromiseRejectedResult;
        assert.equal((failed.reason as { status: number }).status, 409);
        assert.equal(
          (
            await owner.query(
              'SELECT count(*)::int AS n FROM collector_game_mode_audit WHERE collector_id=$1',
              [current.collectorId],
            )
          ).rows[0].n,
          1,
        );
      },
    );
    await t.test(
      'staff mode save retries remain one operation after rename; stale rename/merge scopes cannot edit a new identity',
      async () => {
        const row = await manual('Mode Retry', 'normal', 11),
          current = await profile(row.id),
          fields = {
            collectorId: current.collectorId,
            expectedRevision: current.revision,
            gameMode: 'group_ironman' as const,
          },
          requestKey = randomUUID();
        const first = await modes.save(
          row.id,
          fields,
          requestKey,
          actor.id,
          'Admin',
        );
        const p = await names.preview(
          current.collectorId,
          'Mode Renamed',
          actor.id,
        );
        await names.apply(p.token, randomUUID(), actor.id, 'Admin');
        assert.deepEqual(
          await modes.save(row.id, fields, requestKey, actor.id, 'Admin'),
          first,
        );
        assert.equal((await profile(row.id)).collectorName, 'Mode Renamed');
        assert.equal((await profile(row.id)).gameMode, 'group_ironman');
        await assert.rejects(
          modes.save(
            row.id,
            { ...fields, gameMode: 'normal' },
            requestKey,
            actor.id,
            'Admin',
          ),
          { status: 409 },
        );
        await assert.rejects(
          modes.save(
            row.id,
            { ...fields, gameMode: 'normal' },
            randomUUID(),
            actor.id,
            'Admin',
          ),
          { status: 409 },
        );
      },
    );
    await t.test(
      'merges carry a sole assignment, require explicit conflicts, preserve exact confirmation scope and audit the chosen mode',
      async () => {
        const source = await manual('Merge Source', 'ironman', 12),
          target = await manual('Merge Target', undefined, 13);
        let p = await names.preview(
          source.collectorId!,
          target.collectorName,
          actor.id,
        );
        assert.equal(p.gameMode, 'ironman');
        assert.equal(p.modeResolutionRequired, false);
        await names.apply(p.token, randomUUID(), actor.id, 'Admin');
        assert.equal((await profile(target.id)).gameMode, 'ironman');
        const conflict = await manual('Other Mode', 'ultimate_ironman', 14);
        p = await names.preview(
          conflict.collectorId!,
          target.collectorName,
          actor.id,
        );
        assert.equal(p.modeResolutionRequired, true);
        await assert.rejects(
          names.apply(p.token, randomUUID(), actor.id, 'Admin'),
          { status: 422 },
        );
        const before = await profile(conflict.id);
        p = await names.preview(
          conflict.collectorId!,
          target.collectorName,
          actor.id,
          'hardcore_ironman',
        );
        const result = await names.apply(
          p.token,
          randomUUID(),
          actor.id,
          'Admin',
        );
        assert.equal((await profile(conflict.id)).gameMode, 'hardcore_ironman');
        assert.equal((await profile(target.id)).gameMode, 'hardcore_ironman');
        const audit = (
          await owner.query(
            'SELECT source_game_mode,target_game_mode,resolved_game_mode FROM collector_name_audit WHERE operation_id=$1',
            [result.operationId],
          )
        ).rows[0];
        assert.deepEqual(audit, {
          source_game_mode: 'ultimate_ironman',
          target_game_mode: 'ironman',
          resolved_game_mode: 'hardcore_ironman',
        });
        await assert.rejects(
          modes.save(
            conflict.id,
            {
              collectorId: before.collectorId,
              expectedRevision: before.revision,
              gameMode: 'normal',
            },
            randomUUID(),
            actor.id,
            'Admin',
          ),
          { status: 409 },
        );
      },
    );
    await t.test(
      'public WOM verification cannot silently resolve conflicting collector modes',
      async () => {
        const left = await manual('Wom Left', 'ironman', 19),
          right = await manual('Wom Right', 'ultimate_ironman', 20);
        await names.saveSettings(
          true,
          (await names.settings()).revision,
          actor.id,
        );
        const publicNames = new PgPublicNameChanges(runtime, async () => ({
          kind: 'verified',
          evidence: {
            playerId: 133,
            username: 'Wom Right',
            verifiedAt: new Date().toISOString(),
            changes: [
              {
                id: 133,
                playerId: 133,
                oldName: 'Wom Left',
                newName: 'Wom Right',
                status: 'approved',
                resolvedAt: '2026-11-04T00:00:00Z',
              },
            ],
          },
        }));
        await assert.rejects(
          publicNames.change(
            { oldName: 'Wom Left', newName: 'Wom Right' },
            randomUUID(),
            new AbortController().signal,
          ),
          { status: 422 },
        );
        assert.equal((await profile(left.id)).gameMode, 'ironman');
        assert.equal((await profile(right.id)).gameMode, 'ultimate_ironman');
        assert.equal((await profile(left.id)).collectorName, 'Wom Left');
      },
    );
    await t.test(
      'a mode edit invalidates an older name preview and cannot bypass repeated-collector rejection',
      async () => {
        const row = await manual('Duplicate User', 'ironman', 15, false, true),
          p = await names.preview(row.collectorId!, 'Changed Name', actor.id);
        await save(row.id, 'normal');
        await assert.rejects(
          names.apply(p.token, randomUUID(), actor.id, 'Admin'),
          { status: 409 },
        );
        await review.saveSubmissionFilters(
          false,
          (await review.submissionFilters()).revision,
          actor.id,
          'reject',
        );
        const repeat = await manual(
          'DUPLICATE_USER',
          'group_ironman',
          15,
          false,
          true,
        );
        assert.equal(repeat.status, 'rejected');
        assert.equal(repeat.gameMode, 'normal');
        assert.equal(repeat.submittedGameMode, 'group_ironman');
        await review.saveSubmissionFilters(
          false,
          (await review.submissionFilters()).revision,
          actor.id,
          'separate',
        );
      },
    );
    await t.test(
      'RuneLite and bot intake retain supplied provenance, omission compatibility and fingerprint conflicts without replaying profile changes',
      async () => {
        const fields = {
          username: 'Rune Mode',
          clanName: 'Clan name',
          itemId: 900016,
          worldTypes: ['MEMBERS'],
          chatMessage: 'Original clan proof',
          gameMode: 'unranked_group_ironman' as const,
        };
        const requestKey = randomUUID();
        const receipt = await proof.createRuneLite(
          fields,
          undefined,
          requestKey,
          key,
        );
        assert.equal(receipt.receipt.gameMode, 'unranked_group_ironman');
        await save(receipt.receipt.submissionId, 'normal');
        assert.deepEqual(
          await proof.createRuneLite(fields, undefined, requestKey, key),
          receipt,
        );
        assert.equal(
          (await profile(receipt.receipt.submissionId)).gameMode,
          'normal',
        );
        await assert.rejects(
          proof.createRuneLite(
            { ...fields, gameMode: 'ironman' },
            undefined,
            requestKey,
            key,
          ),
          { status: 409 },
        );
        const claim = {
          interactionId: '123456789012345681',
          guildId: '123456789012345682',
          actorDiscordId: '123456789012345683',
          rawItemText: 'Item 17',
          itemId: 17,
          collectorName: 'Bot Mode',
          hardcore: false,
          gameMode: 'group_ironman' as const,
          image: screenshotRecord(),
        };
        const bot = await backend.submitClaim(claim, claimHash(claim));
        assert.equal(bot.receipt.gameMode, 'group_ironman');
        await save(bot.receipt.submissionId, 'normal');
        assert.deepEqual(
          (await backend.submitClaim(claim, claimHash(claim))).receipt,
          bot.receipt,
        );
        assert.equal(
          (await profile(bot.receipt.submissionId)).gameMode,
          'normal',
        );
      },
    );
    await t.test(
      'profile writes use real runtime permissions and fully roll back when audit persistence fails',
      async () => {
        for (const table of [
          'collector_game_mode_audit',
          'collector_game_mode_requests',
        ])
          await assert.rejects(runtime.query('DELETE FROM ' + table), {
            code: '42501',
          });
        const row = await manual('Rollback Mode', 'ironman', 18),
          current = await profile(row.id),
          requestKey = randomUUID();
        await owner.query(
          "CREATE FUNCTION fail_mode_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'mode audit failed'; END $$;CREATE TRIGGER fail_mode_audit BEFORE INSERT ON collector_game_mode_audit FOR EACH ROW EXECUTE FUNCTION fail_mode_audit()",
        );
        try {
          await assert.rejects(
            modes.save(
              row.id,
              {
                collectorId: current.collectorId,
                expectedRevision: current.revision,
                gameMode: 'normal',
              },
              requestKey,
              actor.id,
              'Admin',
            ),
            /mode audit failed/,
          );
          assert.deepEqual(await profile(row.id), current);
          assert.equal(
            (
              await owner.query(
                'SELECT count(*)::int AS n FROM collector_game_mode_requests WHERE request_key=$1',
                [requestKey],
              )
            ).rows[0].n,
            0,
          );
        } finally {
          await owner.query(
            'DROP TRIGGER fail_mode_audit ON collector_game_mode_audit;DROP FUNCTION fail_mode_audit()',
          );
        }
      },
    );
    await t.test(
      'direct profile routes require current Submissions access, Origin/CSRF and UUID keys, without item matching or proof acknowledgment',
      async () => {
        const app = createApp(
          () => backend.ready(),
          () => backend.settings(),
          {
            store: backend,
            review,
            accessControl: new PgAccessControlStore(runtime),
            logger: false,
            auth: {
              origin: 'https://clog.example.com',
              secret: 'b'.repeat(64),
              secure: true,
            },
          },
        );
        resources.app = app;
        const login = async (username: string) => {
          const r = await app.inject({
            method: 'POST',
            url: '/api/v1/auth/login',
            headers: { origin: 'https://clog.example.com' },
            payload: { username, password },
          });
          assert.equal(r.statusCode, 200, r.body);
          return {
            origin: 'https://clog.example.com',
            cookie: String(r.headers['set-cookie']).split(';')[0]!,
            'x-csrf-token': r.json().csrfToken,
            'idempotency-key': randomUUID(),
          };
        };
        const admin = await login('admin'),
          mod = await login('moderator'),
          row = await manual('Unmatched Mode', 'ironman', 19);
        await owner.query('UPDATE submissions SET item_id=NULL WHERE id=$1', [
          row.id,
        ]);
        const endpoint = '/api/v1/admin/submissions/' + row.id + '/game-mode',
          current = await profile(row.id),
          payload = {
            collectorId: current.collectorId,
            expectedRevision: current.revision,
            gameMode: 'ultimate_ironman',
          };
        assert.equal((await app.inject({ url: endpoint })).statusCode, 401);
        for (const headers of [
          { ...mod, 'x-csrf-token': 'bad' },
          { ...mod, origin: 'https://other.example' },
          { ...mod, 'idempotency-key': 'bad' },
        ])
          assert.ok(
            [400, 403].includes(
              (
                await app.inject({
                  method: 'PUT',
                  url: endpoint,
                  headers,
                  payload,
                })
              ).statusCode,
            ),
          );
        const result = await app.inject({
          method: 'PUT',
          url: endpoint,
          headers: mod,
          payload,
        });
        assert.equal(result.statusCode, 200, result.body);
        assert.equal(
          (await review.detail(row.id))!.submission.status,
          'pending',
        );
        assert.equal((await review.detail(row.id))!.submission.itemId, null);
        await owner.query(
          "UPDATE staff_page_access SET moderator_pages='{}'::text[]",
        );
        const next = await profile(row.id);
        assert.equal(
          (
            await app.inject({
              method: 'PUT',
              url: endpoint,
              headers: mod,
              payload: { ...payload, expectedRevision: next.revision },
            })
          ).statusCode,
          403,
        );
        assert.equal(
          (await app.inject({ url: endpoint, headers: admin })).statusCode,
          200,
        );
      },
    );
  },
);
