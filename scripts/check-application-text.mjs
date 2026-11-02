/** AST guard shared by ESLint and the explicit copy-maintenance check. */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { findAuthoredText } from './application-text.mjs';

export const applicationRoots = [
  'apps/web/src',
  'apps/api/src',
  'apps/bot/src',
  'packages/domain/src',
  'packages/database/src',
];
export function isApplicationSource(file) {
  const normalized = file.replaceAll('\\', '/');
  return (
    applicationRoots.some((root) => normalized.includes(root + '/')) &&
    /\.tsx?$/u.test(normalized) &&
    !/\.(?:test|spec)\.tsx?$|\/(?:tests|fixtures)\/|\/domain\/src\/text\.ts$/u.test(
      normalized,
    )
  );
}
export function inspectApplicationText(file, code) {
  if (!isApplicationSource(file)) return [];
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);
  return findAuthoredText(source).map((node) => {
    const position = source.getLineAndCharacterOfPosition(
      node.getStart(source),
    );
    return {
      file,
      line: position.line + 1,
      column: position.character + 1,
      text: ts.isJsxText(node) ? node.text.trim() : node.getText(source),
    };
  });
}
export const applicationTextRule = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      inline:
        'Define authored application wording in packages/domain/src/text.ts and consume its feature export.',
    },
  },
  create(context) {
    return {
      Program() {
        for (const finding of inspectApplicationText(
          context.filename,
          context.sourceCode.text,
        ))
          context.report({
            loc: { line: finding.line, column: finding.column - 1 },
            messageId: 'inline',
          });
      },
    };
  },
};
export async function checkApplicationText(root) {
  const findings = [];
  async function walk(directory) {
    for (const entry of await readdir(path.join(root, directory), {
      withFileTypes: true,
    })) {
      const file = directory + '/' + entry.name;
      if (entry.isDirectory()) {
        if (!['tests', 'fixtures'].includes(entry.name)) await walk(file);
      } else if (isApplicationSource(file)) {
        findings.push(
          ...inspectApplicationText(
            file,
            await readFile(path.join(root, file), 'utf8'),
          ),
        );
      }
    }
  }
  for (const directory of applicationRoots) await walk(directory);
  const html = await readFile(path.join(root, 'apps/web/index.html'), 'utf8');
  if (!/<title>%APP_TITLE%<\/title>/u.test(html))
    findings.push({
      file: 'apps/web/index.html',
      line: 1,
      column: 1,
      text: 'Use the canonical build title placeholder.',
    });
  return findings;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const findings = await checkApplicationText(
    fileURLToPath(new URL('../', import.meta.url)),
  );
  for (const item of findings)
    console.error(`${item.file}:${item.line}:${item.column}: ${item.text}`);
  console.log(`Application text: ${findings.length} inline authored strings.`);
  if (findings.length) process.exitCode = 1;
}
