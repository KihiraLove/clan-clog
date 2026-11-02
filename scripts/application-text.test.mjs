import assert from 'node:assert/strict';
import test from 'node:test';
import {
  inspectApplicationText,
  isApplicationSource,
} from './check-application-text.mjs';
import { jsxWords } from './application-text.mjs';

const inspect = (code) =>
  inspectApplicationText('apps/web/src/Example.tsx', code);

test('new JSX wording, accessible labels, messages and Discord descriptions fail the guard', () => {
  for (const code of [
    'const view = <button>Save changes</button>;',
    'const view = <input aria-label="Password" placeholder="Type here" />;',
    'throw new Error("Try again.");',
    'setError("Could not refresh.");',
    'console.warn("Service unavailable");',
    'command.setDescription("Submit proof");',
    'reply.send({ error: "unavailable" });',
    'const view = <p>{enabled ? "enabled" : "disabled"}</p>;',
    'const message = `Retry in ${seconds} seconds.`;',
    'const view = <Card caption="Clan collections" />;',
    'const view = <span>{missing ? "—" : "XP"}</span>;',
    'const message = `Missing → ${name}`;',
    'const view = <Podium unit="XP" />;',
    'if (error.message === "Service unavailable") retry();',
  ])
    assert.ok(inspect(code).length > 0, code);
});

test('normal identifiers, SQL, HTTP contracts, decorative alt text and external data stay in their layers', () => {
  const code = `
    import { webSiteAppText } from '@clog/domain';
    const view = <main id="admin-main" className="admin-panel site-panel" role="main">
      <img src="/brand/skull.webp" alt="" />{catalog.name}{webSiteAppText.mainSite}
    </main>;
    client.query('SELECT id::text AS id FROM submissions');
    reply.header('Vary', 'Origin, Access-Control-Request-Headers');
    document.querySelectorAll('link[rel="icon"], link[rel="alternate icon"]');
    const reason = 'retry-rejected';
    const token = 'clog:retry-search';
    const headers = { authorization: 'Bearer ' + token };
    const keys = ['ArrowUp', 'ArrowDown'];
    const aborted = new DOMException('Aborted', 'AbortError');
    const isolated = state.isolation === 'read committed';
  `;
  // The exception's message is authored, while its standard name is a contract.
  assert.deepEqual(
    inspect(code).map((item) => item.text),
    ["'Aborted'"],
  );
  assert.equal(
    isApplicationSource('packages/database/migrations/001_baseline.sql'),
    false,
  );
  assert.equal(isApplicationSource('apps/web/tests/example.spec.ts'), false);
  assert.equal(isApplicationSource('packages/domain/src/text.ts'), false);
});

test('historical exceptions are narrow and JSX line wrapping preserves visible spaces', () => {
  const code = "const name = 'Rare';";
  assert.equal(
    inspectApplicationText('packages/database/src/clue-taxonomy.ts', code)
      .length,
    0,
  );
  assert.equal(inspect(code).length, 1);
  assert.equal(
    jsxWords('\n  Keep the\n  original wording.\n'),
    'Keep the original wording.',
  );
  assert.equal(jsxWords(' and '), ' and ');
});
