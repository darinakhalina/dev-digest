import type { CSSProperties } from "react";

export const CHARS_PER_TOKEN = 4;
const LINE_HEIGHT = 21;
const GUTTER_WIDTH = 40;

export const s = {
  frame: {
    border: "1px solid var(--border-strong)",
    borderRadius: 8,
    overflow: "hidden",
    background: "var(--bg-surface)",
    display: "flex",
    flexDirection: "column",
    height: 460,
  } satisfies CSSProperties,
  head: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "9px 14px",
    borderBottom: "1px solid var(--border)",
    flexShrink: 0,
  } satisfies CSSProperties,
  headIcon: { color: "var(--text-muted)" } satisfies CSSProperties,
  filename: { fontSize: 12.5, fontWeight: 600 } satisfies CSSProperties,
  tokens: {
    marginLeft: "auto",
    fontSize: 11,
    color: "var(--text-muted)",
  } satisfies CSSProperties,
  body: { flex: 1, display: "flex", overflow: "hidden" } satisfies CSSProperties,
  gutter: {
    width: GUTTER_WIDTH,
    flexShrink: 0,
    overflow: "hidden",
    padding: "10px 0",
    background: "var(--bg-surface)",
  } satisfies CSSProperties,
  lineNo: {
    fontSize: 12.5,
    lineHeight: `${LINE_HEIGHT}px`,
    textAlign: "right",
    paddingRight: 14,
    color: "var(--text-muted)",
    userSelect: "none",
  } satisfies CSSProperties,
  textarea: {
    flex: 1,
    minWidth: 0,
    padding: "10px 14px 10px 0",
    border: "none",
    outline: "none",
    resize: "none",
    background: "transparent",
    color: "var(--text-primary)",
    fontSize: 12.5,
    lineHeight: `${LINE_HEIGHT}px`,
    overflow: "auto",
    whiteSpace: "pre",
  } satisfies CSSProperties,
} as const;
