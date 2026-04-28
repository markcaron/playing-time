import fs from 'fs';
import path from 'path';
import { playwrightLauncher } from '@web/test-runner-playwright';
import { esbuildPlugin } from '@web/dev-server-esbuild';
import { a11ySnapshotPlugin } from './src/test/helpers/a11y-snapshot-plugin.js';

const MIME = { '.yaml': 'text/yaml', '.yml': 'text/yaml', '.md': 'text/markdown', '.json': 'application/json' };

const PUBLIC_ROOT = path.resolve('public');
const PROJECT_ROOT = path.resolve('.');

function servePublicDir() {
  return (ctx, next) => {
    const filePath = path.resolve('public', ctx.url.slice(1));
    if (!filePath.startsWith(PUBLIC_ROOT)) return next();
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      ctx.body = fs.readFileSync(filePath, 'utf-8');
      ctx.type = MIME[path.extname(filePath)] || 'application/octet-stream';
      return;
    }
    return next();
  };
}

function serveRawSource() {
  return (ctx, next) => {
    if (!ctx.url.startsWith('/__raw/')) return next();
    const relPath = ctx.url.slice('/__raw/'.length);
    const filePath = path.resolve(relPath);
    if (!filePath.startsWith(PROJECT_ROOT)) return next();
    if (!filePath.endsWith('.ts')) return next();
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      ctx.body = fs.readFileSync(filePath, 'utf-8');
      ctx.type = 'text/plain';
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
  middleware: [serveRawSource(), servePublicDir()],
  plugins: [
    esbuildPlugin({ ts: true, tsconfig: './tsconfig.json' }),
    a11ySnapshotPlugin(),
  ],
};
