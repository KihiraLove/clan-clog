import assert from 'node:assert/strict';
import test from 'node:test';
import { createTextCompiler } from './inline-application-text.mjs';

test('compiled labels and structured parts retain quotes and special characters as text', () => {
  const inline = createTextCompiler(`
    const shared = 'A & B <clan>';
    export const label = shared;
    export const footer = { prefix: 'Catalog data:', label: shared };
  `);
  const code = inline(
    "import * as appText from '@clog/domain'; const result = [appText.label, appText.footer.prefix];",
    'view.ts',
  );
  const executable = code.replace(
    /import\s+\*\s+as\s+appText\s+from\s+[^;]+;/u,
    '',
  );
  assert.deepEqual(new Function(executable + '; return result;')(), [
    'A & B <clan>',
    'Catalog data:',
  ]);
  assert.doesNotMatch(executable, /appText\.|shared/u);
});

test('typed formatter compilation preserves single evaluation and parameter shadowing', () => {
  const inline = createTextCompiler(`
    const value = 'shared';
    export const count = (value: number) => \`\${value} item\${value === 1 ? '' : 's'}\`;
  `);
  const code = inline(
    "import * as appText from '@clog/domain'; const result = appText.count(read());",
    'view.ts',
  );
  const executable = code.replace(
    /import\s+\*\s+as\s+appText\s+from\s+[^;]+;/u,
    '',
  );
  let reads = 0;
  assert.equal(
    new Function('read', executable + '; return result;')(() => {
      reads++;
      return 2;
    }),
    '2 items',
  );
  assert.equal(reads, 1);
});

test('unknown keys, cyclic entries and imported server dependencies fail compilation', () => {
  const inline = createTextCompiler("export const label = 'Label';");
  assert.throws(
    () => inline("import * as appText from '@clog/domain'; appText.missing;"),
    /Unknown canonical text/u,
  );
  assert.throws(
    () => createTextCompiler("import fs from 'node:fs';"),
    /self-contained/u,
  );
  const cycle = createTextCompiler(
    'const first = second; const second = first; export const label = first;',
  );
  assert.throws(
    () => cycle("import * as appText from '@clog/domain'; appText.label;"),
    /Circular/u,
  );
  assert.equal(
    inline("import * as appText from 'other-library'; appText.label;"),
    null,
  );
  assert.throws(
    () =>
      inline("import * as appText from '@clog/domain'; Object.keys(appText);"),
    /direct canonical text/u,
  );
  assert.equal(
    inline(
      "import * as appText from '@clog/domain'; function local(appText) { return appText.label; }",
    ),
    null,
  );
});
