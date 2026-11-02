/** Apply recommended JS/TypeScript checks to authored code, excluding generated output. */
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import { applicationTextRule } from './scripts/check-application-text.mjs';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**'] },
  {
    files: ['apps/**/*.ts', 'apps/**/*.tsx', 'packages/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    plugins: { copy: { rules: { 'canonical-text': applicationTextRule } } },
    rules: { 'copy/canonical-text': 'error' },
  },
);
