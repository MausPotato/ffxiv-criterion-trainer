import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';

export async function load(url, context, nextLoad) {
  if (!url.endsWith('.ts')) return nextLoad(url, context);

  const source = await readFile(new URL(url), 'utf8');
  const result = await transform(source, {
    format: 'esm',
    loader: 'ts',
    sourcemap: 'inline',
    target: 'es2022'
  });

  return {
    format: 'module',
    shortCircuit: true,
    source: result.code
  };
}
