---
name: Testing Infrastructure Setup
overview: Set up a Mocha/Chai testing system using @web/test-runner with Playwright, modeled on RHDS patterns, including a11y-snapshot support, for the PlayingTime Lit component project.
todos:
  - id: install-deps
    content: Install @web/test-runner, @web/test-runner-playwright, @web/test-runner-commands, @open-wc/testing, @web/dev-server-esbuild, @types/mocha as devDependencies
    status: completed
  - id: wtr-config
    content: Create web-test-runner.config.js with Playwright, esbuild, a11ySnapshotPlugin, and BDD Mocha UI
    status: completed
  - id: npm-scripts
    content: Add test and test:watch scripts to package.json
    status: completed
  - id: tsconfig
    content: Update tsconfig.json to include @types/mocha and the test directory
    status: completed
  - id: a11y-helper
    content: Create src/test/helpers/a11y-snapshot.ts with retry wrapper, querySnapshot, and Chai matchers
    status: completed
  - id: utils-helper
    content: Create src/test/helpers/utils.ts with allUpdates and clickElementAtCenter
    status: completed
  - id: lib-specs
    content: "Write unit specs for pure-logic modules: roster-parser, types (formatTime, getPlayerCount, getDefaultFormation), formations"
    status: completed
  - id: component-spec
    content: Write a component spec for pt-home-view following the RHDS pattern (upgrade, accessible, fixture, interaction, a11y-snapshot)
    status: completed
  - id: verify-green
    content: Run the test suite end-to-end and fix any issues until all tests pass
    status: completed
isProject: false
---

# Testing Infrastructure Setup

## Approach

Replicate the RHDS testing stack directly, without depending on `@patternfly/pfe-tools`. We use the same underlying packages RHDS uses and create local helpers for a11y-snapshot and test utilities.

### Stack

| Concern | Package |
|---------|---------|
| Test runner | `@web/test-runner` |
| Browser | `@web/test-runner-playwright` (Chromium) |
| Browser commands | `@web/test-runner-commands` (sendKeys, a11ySnapshot) |
| Assertions / fixtures | `@open-wc/testing` (Chai BDD + Mocha + lit-html fixture) |
| TypeScript | `@web/dev-server-esbuild` |
| Types | `@types/mocha` |

---

## 1. Install dev dependencies

```bash
npm i -D @web/test-runner @web/test-runner-playwright @web/test-runner-commands @open-wc/testing @web/dev-server-esbuild @types/mocha
```

Playwright browsers will need a one-time install (`npx playwright install chromium`).

---

## 2. Create `web-test-runner.config.js`

Root-level config using the esbuild plugin for TypeScript, Playwright launcher, and the a11y snapshot plugin from `@web/test-runner-commands/plugins`:

```js
import { playwrightLauncher } from '@web/test-runner-playwright';
import { esbuildPlugin } from '@web/dev-server-esbuild';
import { a11ySnapshotPlugin } from '@web/test-runner-commands/plugins';

export default {
  files: ['src/**/test/*.spec.ts'],
  nodeResolve: true,
  browsers: [playwrightLauncher({ product: 'chromium' })],
  testFramework: { config: { ui: 'bdd', timeout: 5000 } },
  plugins: [
    esbuildPlugin({ ts: true, tsconfig: './tsconfig.json' }),
    a11ySnapshotPlugin(),
  ],
};
```

---

## 3. Add npm scripts to [package.json](package.json)

```json
"test": "wtr",
"test:watch": "wtr --watch"
```

---

## 4. Test directory structure

Follow the RHDS pattern of co-located `test/` directories. Each component and lib module gets a sibling `test/` folder:

```
src/
  components/
    test/
      pt-home-view.spec.ts
      pt-timer-bar.spec.ts
      ...
  lib/
    test/
      roster-parser.spec.ts
      types.spec.ts
      formations.spec.ts
  test/
    helpers/
      a11y-snapshot.ts    <-- local a11y-snapshot Chai matchers
      utils.ts            <-- allUpdates, click helpers
```

---

## 5. Create local test helpers

### `src/test/helpers/a11y-snapshot.ts`

A stripped-down version of `@patternfly/pfe-tools/test/a11y-snapshot.js`. Wraps `@web/test-runner-commands`'s `a11ySnapshot` with:
- Retry logic (wait for tree to be ready)
- `querySnapshot()` / `querySnapshotAll()` tree walkers
- Chai plugin registering matchers: `axTreeFocusOn`, `axContainRole`, `axContainName`

### `src/test/helpers/utils.ts`

Minimal helper with:
- `allUpdates(el)` -- recursively awaits `updateComplete` on Lit elements
- `clickElementAtCenter(el)` -- dispatches pointer/click at element center

---

## 6. Starter spec files (scaffolded during implementation)

### Pure-logic specs (no DOM needed)

[src/lib/roster-parser.ts](src/lib/roster-parser.ts) and [src/lib/types.ts](src/lib/types.ts) export pure functions like `parseRosterWithMeta`, `formatTime`, `getPlayerCount`, `getDefaultFormation`. These get straightforward unit tests with no fixture overhead:

```ts
import { expect } from '@open-wc/testing';
import { formatTime, getPlayerCount } from '../types.js';

describe('formatTime()', function () {
  it('formats mm:ss by default', function () {
    expect(formatTime(125)).to.equal('02:05');
  });
  it('formats m', function () {
    expect(formatTime(125, 'm')).to.equal('2');
  });
});
```

### Component specs (DOM + a11y)

Following the RHDS pattern -- fixture, upgrade check, accessibility audit, interaction tests, a11y-snapshot focus checks:

```ts
import { expect, fixture, html } from '@open-wc/testing';
import { a11ySnapshot } from '../../test/helpers/a11y-snapshot.js';
import { PtHomeView } from '../pt-home-view.js';

describe('<pt-home-view>', function () {
  let element: PtHomeView;

  it('should upgrade', function () {
    element = document.createElement('pt-home-view');
    expect(element).to.be.an.instanceOf(PtHomeView);
  });

  describe('with no teams', function () {
    beforeEach(async function () {
      element = await fixture(html`<pt-home-view .teams=${[]}></pt-home-view>`);
    });

    it('is accessible', async function () {
      await expect(element).to.be.accessible();
    });

    it('shows empty state', function () {
      const empty = element.shadowRoot!.querySelector('.empty-state');
      expect(empty).to.exist;
    });
  });
});
```

---

## 7. TypeScript config adjustment

Add `"@types/mocha"` to the `types` array in [tsconfig.json](tsconfig.json) so `describe`/`it` are recognized without explicit imports.

---

## What is NOT in scope

- **E2E / Playwright visual regression tests** (the `*.e2e.ts` layer from RHDS) -- can be added later.
- **CI pipeline** -- can be layered on once the local test loop works.
- **Tests for every component** -- we scaffold 2-3 starter specs as patterns; the rest can follow incrementally.
