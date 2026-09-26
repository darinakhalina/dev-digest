export function isTextInput(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  return (
    !!node &&
    (node.tagName === "INPUT" || node.tagName === "TEXTAREA" || node.isContentEditable)
  );
}

export function hasModifier(e: { metaKey: boolean; ctrlKey: boolean; altKey: boolean; repeat: boolean }): boolean {
  return e.metaKey || e.ctrlKey || e.altKey || e.repeat;
}
