import { a11ySnapshot as snap } from '@web/test-runner-commands';
import { chai } from '@open-wc/testing';

export interface A11yTreeNode {
  name?: string;
  role?: string;
  focused?: boolean;
  children?: A11yTreeNode[];
  [key: string]: unknown;
}

/**
 * Request an accessibility tree snapshot from the browser, retrying up to
 * `maxRetries` animation frames if the tree is not yet available.
 */
export async function a11ySnapshot(
  payload?: { selector?: string },
  maxRetries = 10,
): Promise<A11yTreeNode> {
  let snapshot = await (snap as Function)(payload) as A11yTreeNode | null;
  let retries = 0;
  while (!snapshot && retries < maxRetries) {
    await new Promise(r => requestAnimationFrame(r));
    snapshot = await (snap as Function)(payload) as A11yTreeNode | null;
    retries++;
  }
  if (!snapshot) {
    throw new Error('a11ySnapshot: could not retrieve accessibility tree');
  }
  return snapshot;
}

/**
 * Walk the a11y tree and return the first node matching every key/value in `query`.
 * Values may be strings or RegExps.
 */
export function querySnapshot(
  tree: A11yTreeNode,
  query: Record<string, string | RegExp>,
): A11yTreeNode | null {
  if (matches(tree, query)) return tree;
  for (const child of tree.children ?? []) {
    const found = querySnapshot(child, query);
    if (found) return found;
  }
  return null;
}

/**
 * Walk the a11y tree and return all nodes matching every key/value in `query`.
 */
export function querySnapshotAll(
  tree: A11yTreeNode,
  query: Record<string, string | RegExp>,
): A11yTreeNode[] {
  const results: A11yTreeNode[] = [];
  if (matches(tree, query)) results.push(tree);
  for (const child of tree.children ?? []) {
    results.push(...querySnapshotAll(child, query));
  }
  return results;
}

function matches(
  node: A11yTreeNode,
  query: Record<string, string | RegExp>,
): boolean {
  return Object.entries(query).every(([key, expected]) => {
    const actual = node[key];
    if (expected instanceof RegExp) {
      return typeof actual === 'string' && expected.test(actual);
    }
    return actual === expected;
  });
}

function findFocused(node: A11yTreeNode): A11yTreeNode | null {
  if (node.focused) return node;
  for (const child of node.children ?? []) {
    const found = findFocused(child);
    if (found) return found;
  }
  return null;
}

/**
 * Compute the accessible name of an element for comparison against
 * the a11y tree's `name` property. Resolves `aria-labelledby` ID
 * references to the referenced element's text content.
 */
function getAccessibleName(el: Element): string {
  const label = el.getAttribute('aria-label');
  if (label) return label;

  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const names = labelledBy.split(/\s+/).map(id => {
      const ref = el.getRootNode() instanceof ShadowRoot
        ? (el.getRootNode() as ShadowRoot).getElementById(id)
        : document.getElementById(id);
      return ref?.textContent?.trim() ?? '';
    });
    const resolved = names.filter(Boolean).join(' ');
    if (resolved) return resolved;
  }

  return el.textContent?.trim() ?? '';
}

/**
 * Register custom Chai matchers for a11y snapshot assertions.
 */
chai.use((_chai: Chai.ChaiStatic, utils: Chai.ChaiUtils) => {
  /**
   * Assert that the a11y tree has focus on `element`.
   * Usage: `expect(await a11ySnapshot()).to.have.axTreeFocusOn(element)`
   */
  _chai.Assertion.addMethod('axTreeFocusOn', function (this: Chai.AssertionStatic, element: Element) {
    const tree = utils.flag(this, 'object') as A11yTreeNode;
    const focused = findFocused(tree);
    const expectedName = getAccessibleName(element);

    new _chai.Assertion(focused, 'expected a11y tree to have a focused node').to.exist;
    if (expectedName) {
      new _chai.Assertion(
        focused!.name,
        `expected focused node name "${focused?.name}" to equal "${expectedName}"`,
      ).to.equal(expectedName);
    }
  });

  /**
   * Assert the snapshot contains a node with the given role.
   * Usage: `expect(snapshot).to.axContainRole('button')`
   */
  _chai.Assertion.addMethod('axContainRole', function (this: Chai.AssertionStatic, role: string) {
    const tree = utils.flag(this, 'object') as A11yTreeNode;
    const found = querySnapshot(tree, { role });
    this.assert(
      !!found,
      `expected a11y tree to contain a node with role "${role}"`,
      `expected a11y tree NOT to contain a node with role "${role}"`,
      role,
    );
  });

  /**
   * Assert the snapshot contains a node with the given name.
   * Usage: `expect(snapshot).to.axContainName('Submit')`
   */
  _chai.Assertion.addMethod('axContainName', function (this: Chai.AssertionStatic, name: string | RegExp) {
    const tree = utils.flag(this, 'object') as A11yTreeNode;
    const found = querySnapshot(tree, { name });
    this.assert(
      !!found,
      `expected a11y tree to contain a node with name matching ${name}`,
      `expected a11y tree NOT to contain a node with name matching ${name}`,
      name,
    );
  });

  /**
   * Assert the snapshot contains a node matching the given query.
   * Usage: `expect(snapshot).to.axContainQuery({ role: 'heading', level: 2 })`
   */
  _chai.Assertion.addMethod('axContainQuery', function (this: Chai.AssertionStatic, query: Record<string, string | RegExp>) {
    const tree = utils.flag(this, 'object') as A11yTreeNode;
    const found = querySnapshot(tree, query);
    this.assert(
      !!found,
      `expected a11y tree to contain a node matching ${JSON.stringify(query)}`,
      `expected a11y tree NOT to contain a node matching ${JSON.stringify(query)}`,
      query,
    );
  });
});
