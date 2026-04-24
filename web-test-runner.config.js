import fs from 'fs';
import path from 'path';
import { playwrightLauncher } from '@web/test-runner-playwright';
import { esbuildPlugin } from '@web/dev-server-esbuild';
import { a11ySnapshotPlugin } from './src/test/helpers/a11y-snapshot-plugin.js';

const MIME = { '.yaml': 'text/yaml', '.yml': 'text/yaml', '.md': 'text/markdown', '.json': 'application/json' };

function servePublicDir() {
  return (ctx, next) => {
    const filePath = path.join('public', ctx.url);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      ctx.body = fs.readFileSync(filePath, 'utf-8');
      ctx.type = MIME[path.extname(filePath)] || 'application/octet-stream';
      return;
    }
    return next();
  };
}

export default {
  files: ['src/**/test/*.spec.ts'],
  nodeResolve: true,
  browsers: [playwrightLauncher({ product: 'chromium' })],
  testFramework: {
    config: {
      ui: 'bdd',
      timeout: 5000,
    },
  },
  middleware: [servePublicDir()],
  plugins: [
    esbuildPlugin({ ts: true, tsconfig: './tsconfig.json' }),
    a11ySnapshotPlugin(),
  ],
};
