declare module '@dragdroptouch/drag-drop-touch' {
  export function enableDragDropTouch(
    dragRoot?: Document | ShadowRoot | EventTarget,
    dropRoot?: Document | ShadowRoot | EventTarget,
    options?: Record<string, unknown>,
  ): void;
}
