import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import pg from 'pg';
import { migrate } from '@clog/database/dist/migrate.js';
import { provisionRuntimeRole } from '@clog/database/dist/runtime-role.js';
import * as text from '@clog/domain';
import { PgStore } from './store.js';
import { PgReviewStore } from './review-store.js';
import { PgCollectorNames } from './collector-name-store.js';
import { PgPublicNameChanges } from './public-collector-names.js';
import { hashPassword } from './passwords.js';
import { createApp } from './app.js';
import type { WomNameCheck } from './wom-names.js';

test(
  'public WOM names: populated 007 upgrade, least-privilege runtime, permission and atomic identity boundaries',
  { skip: !process.env.TEST_DATABASE_URL },
  async (t) => {
    const root = new pg.Pool({
        connectionString: process.env.TEST_DATABASE_URL,
      }),
      database = 'public_names_' + randomUUID().replaceAll('-', '');
    await root.query('CREATE DATABASE ' + database);
    const url = new URL(process.env.TEST_DATABASE_URL!);
    url.pathname = '/' + database;
    url.searchParams.delete('options');
    const owner = new pg.Pool({ connectionString: url.href });
    const resources: { runtime?: pg.Pool } = {};
    let app: ReturnType<typeof createApp> | undefined;
    t.after(async () => {
      await app?.close();
      await resources.runtime?.end();
      await owner.end();
      await root.query('DROP DATABASE ' + database);
      await root.end();
    });
    await owner.query(
      'CREATE TABLE schema_migrations(name text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())',
    );
    const directory = new URL(
      '../../../packages/database/migrations/',
      import.meta.url,
    );
    for (const file of (await readdir(directory))
      .filter((f) => f.endsWith('.sql') && Number(f.slice(0, 3)) < 8)
      .sort()) {
      const sql = await readFile(new URL(file, directory), 'utf8');
      await owner.query(sql);
      await owner.query(
        'INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)',
        [file, createHash('sha256').update(sql).digest('hex')],
      );
    }
    await owner.query(
      "INSERT INTO items(id,name) VALUES(1,'Item');INSERT INTO pages(id,name,category,sort_order) VALUES('a','A','bosses',0);INSERT INTO page_items(page_id,item_id,slot) VALUES('a',1,0)",
    );
    const seed = async (name: string, status = 'pending', hardcore = false) => {
      const id = randomUUID(),
        submission = randomUUID();
      await owner.query(
        'INSERT INTO collectors(id,display_name,normalized_name) VALUES($1,$2,$3)',
        [id, name, text.normalizePlayerName(name)],
      );
      await owner.query(
        "INSERT INTO submissions(id,source,raw_item_text,item_id,collector_name,collector_id,collected_on,date_source,proof_url,status,reviewed_by,reviewed_at,review_reason,hardcore,intake_receipt,intake_payload_hash) VALUES($1,'manual','Raw item',1,$2,$3,'2026-10-01','admin','',$4,CASE WHEN $4='pending' THEN NULL ELSE 'staff' END,CASE WHEN $4='pending' THEN NULL ELSE now() END,CASE WHEN $4 IN('rejected','revoked') THEN 'Original reason' ELSE NULL END,$5,'{}',repeat('a',64))",
        [submission, name, id, status, hardcore],
      );
      return { id, submission };
    };
    const existing = await seed('Legacy');
    const oldRows = (
        await owner.query(
          "SELECT to_jsonb(s)-'submitted_game_mode' AS data FROM submissions s",
        )
      ).rows,
      oldLedger = (
        await owner.query('SELECT * FROM schema_migrations ORDER BY name')
      ).rows;
    await migrate(url.href);
    await migrate(url.href);
    await provisionRuntimeRole(url.href, 'e'.repeat(64));
    const runtimeUrl = new URL(url);
    runtimeUrl.username = 'clog_runtime';
    runtimeUrl.password = 'e'.repeat(64);
    const runtime = new pg.Pool({ connectionString: runtimeUrl.href, max: 10 });
    resources.runtime = runtime;
    const names = new PgCollectorNames(runtime),
      backend = new PgStore(runtime),
      review = new PgReviewStore(runtime, backend),
      password = 'public-names-test-password';
    await backend.ensureDefaultAdmin(await hashPassword(password));
    const actor = (await backend.accountByUsername('admin'))!;
    await backend.createModerator('moderator', actor.passwordHash, actor.id);
    await owner.query('UPDATE staff_accounts SET must_change_password=false');
    const settings = async (enabled: boolean) =>
      names.saveSettings(enabled, (await names.settings()).revision, actor.id);
    let calls = 0,
      proofId = 100,
      kind: 'verified' | 'wom_first' | 'staff_required' = 'verified',
      hook: (() => Promise<void>) | undefined;
    const service = new PgPublicNameChanges(
      runtime,
      async (oldName, newName): Promise<WomNameCheck> => {
        calls++;
        await hook?.();
        if (kind !== 'verified') return { kind };
        return {
          kind: 'verified',
          evidence: {
            playerId: proofId,
            username: newName,
            verifiedAt: new Date().toISOString(),
            changes: [
              {
                id: proofId,
                playerId: proofId,
                oldName,
                newName,
                status: 'approved',
                resolvedAt: '2026-11-01T12:00:00Z',
              },
            ],
          },
        };
      },
    );
    const change = (oldName: string, newName: string, key = randomUUID()) =>
      service.change({ oldName, newName }, key, new AbortController().signal);
    await t.test(
      '008 upgrades populated history without rewriting submissions or released checksums; public changes default off',
      async () => {
        assert.deepEqual(
          (
            await owner.query(
              "SELECT to_jsonb(s)-'submitted_game_mode' AS data FROM submissions s",
            )
          ).rows,
          oldRows,
        );
        assert.deepEqual(
          (
            await owner.query(
              'SELECT * FROM schema_migrations ORDER BY name LIMIT 7',
            )
          ).rows,
          oldLedger,
        );
        assert.equal(
          (
            await owner.query(
              'SELECT wom_player_id FROM collectors WHERE id=$1',
              [existing.id],
            )
          ).rows[0].wom_player_id,
          null,
        );
        assert.deepEqual(await service.settings(), {
          enabled: false,
          revision: 'collector-name-settings-1',
        });
        await assert.rejects(change('Legacy', 'New Legacy'), {
          status: 403,
          message: text.publicNamesDisabled,
        });
        assert.equal(calls, 0);
      },
    );
    await t.test(
      'public settings and origin/key validation; only administrators with valid CSRF may toggle',
      async () => {
        app = createApp(
          () => backend.ready(),
          () => backend.settings(),
          {
            store: backend,
            review,
            publicNameChanges: service,
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
            payload: { username, password },
          });
          assert.equal(r.statusCode, 200, r.body);
          return {
            origin: 'https://clog.example.com',
            cookie: String(r.headers['set-cookie']).split(';')[0]!,
            'x-csrf-token': r.json().csrfToken,
          };
        };
        const admin = await login('admin'),
          mod = await login('moderator'),
          endpoint = '/api/v1/admin/collector-name-settings',
          current = await names.settings();
        const publicRead = await app.inject({
          url: '/api/v1/collector-name-changes',
        });
        assert.deepEqual(publicRead.json(), { enabled: false });
        assert.equal(publicRead.headers['cache-control'], 'no-store');
        for (const headers of [
          mod,
          { ...admin, 'x-csrf-token': 'bad' },
          { ...admin, origin: 'https://other.example' },
        ])
          assert.equal(
            (
              await app.inject({
                method: 'PUT',
                url: endpoint,
                headers,
                payload: { enabled: true, expectedRevision: current.revision },
              })
            ).statusCode,
            403,
          );
        assert.equal(
          (await app.inject({ url: endpoint, headers: mod })).statusCode,
          200,
        );
        const enabled = await app.inject({
          method: 'PUT',
          url: endpoint,
          headers: admin,
          payload: { enabled: true, expectedRevision: current.revision },
        });
        assert.equal(enabled.statusCode, 200, enabled.body);
        assert.equal(
          (
            await app.inject({
              method: 'PUT',
              url: endpoint,
              headers: admin,
              payload: { enabled: false, expectedRevision: current.revision },
            })
          ).statusCode,
          409,
        );
        assert.equal(
          (
            await owner.query(
              'SELECT count(*)::int AS n FROM collector_name_settings_audit',
            )
          ).rows[0].n,
          1,
        );
        for (const headers of [
          { origin: 'https://other.example', 'idempotency-key': randomUUID() },
          { origin: 'https://clog.example.com' },
        ])
          assert.ok(
            [400, 403].includes(
              (
                await app.inject({
                  method: 'POST',
                  url: '/api/v1/collector-name-changes',
                  headers,
                  payload: { oldName: 'Legacy', newName: 'New Legacy' },
                })
              ).statusCode,
            ),
          );
        assert.equal(calls, 0);
        const failed = await app.inject({
          method: 'POST',
          url: '/api/v1/collector-name-changes',
          headers: {
            origin: 'https://clog.example.com',
            'idempotency-key': randomUUID(),
          },
          payload: { oldName: '../private', newName: 'New Legacy' },
        });
        assert.equal(failed.statusCode, 422);
        assert.equal(calls, 0);
      },
    );
    await t.test(
      'exact WOM errors leave history unchanged; public success is a limited durable receipt',
      async () => {
        for (const [value, message] of [
          ['wom_first', text.publicNamesWomFirst],
          ['staff_required', text.publicNamesStaffRequired],
        ] as const) {
          kind = value;
          await assert.rejects(change('Legacy', 'New Legacy'), {
            status: 422,
            message,
          });
        }
        assert.deepEqual(
          (
            await owner.query(
              "SELECT to_jsonb(s)-'submitted_game_mode' AS data FROM submissions s",
            )
          ).rows,
          oldRows,
        );
        kind = 'verified';
        const key = randomUUID(),
          result = await change('Legacy', 'New Legacy', key),
          count = calls;
        assert.deepEqual(Object.keys(result).sort(), [
          'newName',
          'oldName',
          'operationId',
          'status',
        ]);
        assert.equal(result.status, 'changed');
        assert.equal(
          (await names.search('New Legacy')).collectors[0]!.id,
          existing.id,
        );
        assert.deepEqual(
          (
            await owner.query(
              "SELECT to_jsonb(s)-'submitted_game_mode' AS data FROM submissions s",
            )
          ).rows,
          oldRows,
        );
        await settings(false);
        assert.deepEqual(await change('Legacy', 'New Legacy', key), result);
        assert.equal(calls, count);
        await assert.rejects(change('Legacy', 'Other', key), { status: 409 });
        await settings(true);
        proofId++;
        const proof = await owner.query(
          'SELECT * FROM collector_name_wom_verifications WHERE operation_id=$1',
          [result.operationId],
        );
        assert.equal(proof.rowCount, 1);
        assert.equal(proof.rows[0].evidence.changes[0].oldName, 'Legacy');
        await assert.rejects(
          runtime!.query(
            'DELETE FROM collector_name_wom_verifications WHERE operation_id=$1',
            [result.operationId],
          ),
          { code: '42501' },
        );
      },
    );
    await t.test(
      'verified merge shares existing history without modifying original evidence, including rejected and hardcore obtains',
      async () => {
        const a = await seed('Merge Old', 'rejected'),
          b = await seed('Merge New', 'approved', true),
          before = (
            await owner.query(
              'SELECT * FROM submissions WHERE id=ANY($1::uuid[]) ORDER BY id',
              [[a.submission, b.submission]],
            )
          ).rows;
        const result = await change('Merge Old', 'Merge New');
        assert.equal(result.newName, 'Merge New');
        assert.equal(
          (
            await owner.query(
              'SELECT merged_into FROM collectors WHERE id=$1',
              [a.id],
            )
          ).rows[0].merged_into,
          b.id,
        );
        assert.deepEqual(
          (
            await owner.query(
              'SELECT * FROM submissions WHERE id=ANY($1::uuid[]) ORDER BY id',
              [[a.submission, b.submission]],
            )
          ).rows,
          before,
        );
        proofId++;
      },
    );
    await t.test(
      'settings disabled during WOM verification and concurrent source edits both prevent stale application',
      async () => {
        const a = await seed('Stale Old');
        hook = async () => {
          await settings(false);
        };
        await assert.rejects(change('Stale Old', 'Stale New'), { status: 403 });
        await settings(true);
        hook = async () => {
          const p = await names.preview(a.id, 'Staff Name', actor.id);
          await names.apply(p.token, randomUUID(), actor.id, 'Admin');
        };
        await assert.rejects(change('Stale Old', 'Stale New'), { status: 409 });
        hook = undefined;
        assert.equal(
          (await names.search('Staff Name')).collectors[0]!.id,
          a.id,
        );
        assert.equal(
          (
            await owner.query(
              'SELECT count(*)::int AS n FROM collector_name_wom_verifications WHERE name_change_id=$1',
              [proofId],
            )
          ).rows[0].n,
          0,
        );
      },
    );
    await t.test(
      'consumed proofs and known conflicting WOM bindings require staff, with no partial writes',
      async () => {
        await seed('Proof Old');
        await change('Proof Old', 'Proof New');
        const recycled = await seed('Proof Old');
        await assert.rejects(change('Proof Old', 'Proof New'), {
          status: 422,
          message: text.publicNamesStaffRequired,
        });
        assert.equal(
          (
            await owner.query(
              'SELECT merged_into FROM collectors WHERE id=$1',
              [recycled.id],
            )
          ).rows[0].merged_into,
          null,
        );
        proofId++;
        const bound = await seed('Bound Old');
        await owner.query(
          'UPDATE collectors SET wom_player_id=999999 WHERE id=$1',
          [bound.id],
        );
        await assert.rejects(change('Bound Old', 'Bound New'), { status: 422 });
        assert.equal(
          (await names.search('Bound Old')).collectors[0]!.id,
          bound.id,
        );
      },
    );
    await t.test(
      'proof persistence failure rolls back the identity, binding, audit and receipt together',
      async () => {
        proofId++;
        const person = await seed('Rollback Old'),
          key = randomUUID();
        await owner.query(
          "CREATE FUNCTION fail_wom_proof() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test proof failure'; END $$; CREATE TRIGGER fail_wom_proof BEFORE INSERT ON collector_name_wom_verifications FOR EACH ROW EXECUTE FUNCTION fail_wom_proof()",
        );
        try {
          await assert.rejects(
            change('Rollback Old', 'Rollback New', key),
            /test proof failure/,
          );
          assert.equal(
            (await names.search('Rollback Old')).collectors[0]!.id,
            person.id,
          );
          assert.equal(
            (
              await owner.query(
                'SELECT wom_player_id FROM collectors WHERE id=$1',
                [person.id],
              )
            ).rows[0].wom_player_id,
            null,
          );
          assert.equal(
            (
              await owner.query(
                "SELECT count(*)::int AS n FROM collector_name_requests WHERE actor_id='public:wom' AND request_key=$1",
                [key],
              )
            ).rows[0].n,
            0,
          );
          assert.equal(
            (
              await owner.query(
                'SELECT count(*)::int AS n FROM collector_name_audit WHERE source_id=$1',
                [person.id],
              )
            ).rows[0].n,
            0,
          );
        } finally {
          await owner.query(
            'DROP TRIGGER fail_wom_proof ON collector_name_wom_verifications; DROP FUNCTION fail_wom_proof()',
          );
        }
        await change('Rollback Old', 'Rollback New', key);
      },
    );
    await t.test(
      'concurrent identical retries return one operation and proof; rate limits reject work before WOM',
      async () => {
        proofId++;
        await seed('Retry Old');
        let ready = 0;
        let release: () => void = () => {};
        const gate = new Promise<void>((resolve) => {
          release = resolve;
        });
        hook = async () => {
          if (++ready === 2) release();
          await gate;
        };
        const key = randomUUID();
        const [first, second] = await Promise.all([
          change('Retry Old', 'Retry New', key),
          change('Retry Old', 'Retry New', key),
        ]);
        assert.deepEqual(first, second);
        hook = undefined;
        assert.equal(
          (
            await owner.query(
              'SELECT count(*)::int AS n FROM collector_name_wom_verifications WHERE operation_id=$1',
              [first.operationId],
            )
          ).rows[0].n,
          1,
        );
        const before = calls;
        for (let i = 0; i < 7; i++)
          await app!.inject({
            method: 'POST',
            url: '/api/v1/collector-name-changes',
            headers: {
              origin: 'https://clog.example.com',
              'idempotency-key': randomUUID(),
            },
            payload: { oldName: 'No Local', newName: 'New Local' },
          });
        assert.ok(calls - before <= 5);
        const admitted = calls;
        const denied = await app!.inject({
          method: 'POST',
          url: '/api/v1/collector-name-changes',
          headers: {
            origin: 'https://clog.example.com',
            'idempotency-key': randomUUID(),
          },
          payload: { oldName: 'Retry New', newName: 'Other' },
        });
        assert.equal(denied.statusCode, 429);
        assert.equal(calls, admitted);
        const replay = await app!.inject({
          method: 'POST',
          url: '/api/v1/collector-name-changes',
          headers: {
            origin: 'https://clog.example.com',
            'idempotency-key': key,
          },
          payload: { oldName: 'Retry Old', newName: 'Retry New' },
        });
        assert.equal(replay.statusCode, 200, replay.body);
        assert.deepEqual(replay.json(), first);
      },
    );
  },
);
