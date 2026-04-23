import { playwrightLauncher } from '@web/test-runner-playwright';
import { esbuildPlugin } from '@web/dev-server-esbuild';
import { a11ySnapshotPlugin } from './src/test/helpers/a11y-snapshot-plugin.js';

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
  plugins: [
    esbuildPlugin({ ts: true, tsconfig: './tsconfig.json' }),
    a11ySnapshotPlugin(),
  ],
};
