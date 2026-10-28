import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = relativePath => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

test('Vite and Vue Router use the GitHub Pages base path with hash history', async () => {
  const [viteConfig, router] = await Promise.all([
    read('vite.config.ts'),
    read('src/router/index.ts')
  ]);

  assert.match(viteConfig, /base:\s*['"]\/ffxiv-criterion-trainer\/['"]/);
  assert.match(router, /createWebHashHistory\(import\.meta\.env\.BASE_URL\)/);
  assert.doesNotMatch(router, /createWebHistory/);
});

test('Pages workflow validates and deploys dist from main', async () => {
  const workflow = await read('.github/workflows/deploy-pages.yml');

  assert.match(workflow, /branches:\s*\n\s*- main/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /run: npm ci/);
  assert.match(workflow, /run: npm run typecheck/);
  assert.match(workflow, /run: npm test/);
  assert.match(workflow, /run: npm run build/);
  assert.match(workflow, /uses: actions\/upload-pages-artifact@v3[\s\S]*?path: dist/);
  assert.match(workflow, /uses: actions\/deploy-pages@v4/);
});
