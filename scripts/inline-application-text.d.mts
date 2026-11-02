import type { Plugin } from 'vite';

export function createTextCompiler(
  source: string,
): (code: string, file?: string) => string | null;
export function applicationTextPlugin(source: string): Plugin;
