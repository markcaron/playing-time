/**
 * Custom a11y snapshot WTR plugin using CDP, replacing the deprecated
 * `page.accessibility.snapshot()` Playwright API.
 */
export function a11ySnapshotPlugin() {
  return {
    name: 'a11y-snapshot-command',
    async executeCommand({ command, payload, session }) {
      if (command === 'a11y-snapshot') {
        if (session.browser.type !== 'playwright') {
          throw new Error(
            `a11y-snapshot is not supported for browser type ${session.browser.type}`,
          );
        }

        const page = session.browser.getPage(session.id);
        const client = await page.context().newCDPSession(page);

        try {
          const { nodes } = await client.send('Accessibility.getFullAXTree');
          return buildTree(nodes);
        } finally {
          await client.detach();
        }
      }
    },
  };
}

/**
 * Build a nested snapshot tree from the flat CDP AXNode array.
 * Ignored nodes are transparent: their children get promoted to the parent.
 */
function buildTree(nodes) {
  const byId = new Map();
  for (const node of nodes) {
    byId.set(node.nodeId, node);
  }

  function toSnapshot(axNode) {
    const children = [];

    for (const childId of axNode.childIds ?? []) {
      const child = byId.get(childId);
      if (!child) continue;

      if (child.ignored) {
        const promoted = collectChildren(child);
        children.push(...promoted);
      } else {
        const snap = convertNode(child);
        if (snap) children.push(snap);
      }
    }

    const result = extractProps(axNode);
    if (children.length) result.children = children;
    return result;
  }

  function collectChildren(ignoredNode) {
    const results = [];
    for (const childId of ignoredNode.childIds ?? []) {
      const child = byId.get(childId);
      if (!child) continue;
      if (child.ignored) {
        results.push(...collectChildren(child));
      } else {
        const snap = convertNode(child);
        if (snap) results.push(snap);
      }
    }
    return results;
  }

  function convertNode(axNode) {
    if (axNode.ignored) return null;
    return toSnapshot(axNode);
  }

  function extractProps(axNode) {
    const result = {};

    const role = axNode.role?.value;
    if (role && role !== 'none') result.role = role;

    const name = axNode.name?.value;
    if (name) result.name = name;

    if (axNode.properties) {
      for (const prop of axNode.properties) {
        const val = prop.value?.value;
        switch (prop.name) {
          case 'focused':
            if (val === true) result.focused = true;
            break;
          case 'expanded':
            result.expanded = val;
            break;
          case 'level':
            result.level = val;
            break;
          case 'checked':
            result.checked = val;
            break;
          case 'disabled':
            if (val === true) result.disabled = true;
            break;
          case 'selected':
            if (val === true) result.selected = true;
            break;
        }
      }
    }

    return result;
  }

  if (!nodes.length) return { role: 'RootWebArea' };
  return toSnapshot(nodes[0]);
}
