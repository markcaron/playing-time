import type { LitElement } from 'lit';

/**
 * Recursively await `updateComplete` on a Lit element and all its
 * shadow DOM Lit children, ensuring the full tree has settled.
 */
export async function allUpdates(el: LitElement): Promise<void> {
  await el.updateComplete;
  const children = el.shadowRoot?.querySelectorAll('*') ?? [];
  for (const child of children) {
    if ('updateComplete' in child) {
      await (child as LitElement).updateComplete;
    }
  }
}

/**
 * Dispatch a click event at the center of an element, simulating
 * a real user click with pointer events.
 */
export async function clickElementAtCenter(el: Element): Promise<void> {
  const rect = el.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;

  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true, clientX: x, clientY: y }));
  el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true, clientX: x, clientY: y }));
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, clientX: x, clientY: y }));
}
