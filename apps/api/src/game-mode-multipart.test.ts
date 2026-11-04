import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { gameModes } from '@clog/domain';
import { createApp } from './app.js';
import type { ProofStore, RuneLiteFields } from './proof-store.js';
import { screenshotRecord, png } from './tests/screenshot.js';
test('RuneLite accepts all eight text fields plus one screenshot, rejects invalid/duplicate modes and keeps legacy omissions', async (t) => {
  const captured: RuneLiteFields[] = [],
    image = screenshotRecord();
  const store: ProofStore = {
    allowIntake: async () => true,
    authorizeIntake: async () => {},
    validateSubmission: async () => {},
    image: async () => image,
    createRuneLite: async (fields) => {
      captured.push(fields);
      return {
        imageId: image.id,
        receipt: {
          submissionId: randomUUID(),
          status: 'pending',
          itemId: 1,
          submittedAt: '2026-11-04T00:00:00Z',
          collectedOn: '2026-11-04',
        },
      };
    },
  };
  const app = createApp(
    async () => {},
    async () => ({
      revision: '1',
      clanName: 'Clan name',
      hardcoreEnabled: true,
    }),
    {
      proofStore: store,
      proofs: {
        save: async () => image,
        read: async () => Buffer.from(png),
        remove: async () => {},
      },
      logger: false,
    },
  );
  t.after(() => app.close());
  const base: [string, string][] = [
    ['username', 'Collector'],
    ['clanName', 'Clan name'],
    ['itemId', '900001'],
    ['worldType', 'MEMBERS'],
    ['chatMessage', 'Original proof'],
    ['itemName', 'Item'],
    ['eventPageId', 'a'],
  ];
  const submit = (fields: [string, string][], file = true) => {
    const boundary = 'mode-fields';
    return app.inject({
      method: 'POST',
      url: '/api/v1/runelite/submissions',
      headers: {
        'content-type': 'multipart/form-data; boundary=' + boundary,
        'idempotency-key': randomUUID(),
      },
      payload: Buffer.concat([
        ...fields.map(([name, value]) =>
          Buffer.from(
            '--' +
              boundary +
              '\r\nContent-Disposition: form-data; name="' +
              name +
              '"\r\n\r\n' +
              value +
              '\r\n',
          ),
        ),
        ...(file
          ? [
              Buffer.from(
                '--' +
                  boundary +
                  '\r\nContent-Disposition: form-data; name="screenshot"; filename="proof.png"\r\nContent-Type: image/png\r\n\r\n',
              ),
              Buffer.from(png),
              Buffer.from('\r\n'),
            ]
          : []),
        Buffer.from('--' + boundary + '--\r\n'),
      ]),
    });
  };
  for (const gameMode of gameModes) {
    const r = await submit([...base, ['gameMode', gameMode]]);
    assert.equal(r.statusCode, 201, r.body);
    assert.equal(captured.at(-1)!.gameMode, gameMode);
    assert.deepEqual(captured.at(-1)!.worldTypes, ['MEMBERS']);
  }
  const legacy = await submit(base, false);
  assert.equal(legacy.statusCode, 201, legacy.body);
  assert.equal(captured.at(-1)!.gameMode, undefined);
  const before = captured.length;
  for (const value of [
    'unknown',
    'group_ironman_5',
    'NORMAL',
    '["ironman"]',
    'null',
    '',
  ])
    assert.equal(
      (await submit([...base, ['gameMode', value]])).statusCode,
      422,
      value,
    );
  assert.equal(
    (
      await submit([
        ...base.slice(0, 5),
        ['gameMode', 'ironman'],
        ['gameMode', 'normal'],
      ])
    ).statusCode,
    400,
  );
  assert.ok(
    [400, 413].includes(
      (await submit([...base, ['gameMode', 'ironman'], ['extra', 'no']]))
        .statusCode,
    ),
  );
  assert.equal(captured.length, before);
});
