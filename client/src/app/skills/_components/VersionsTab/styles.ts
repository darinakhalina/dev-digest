import type { CSSProperties } from "react";
import type { DiffKind } from "@/lib/diff";

const LINE_BG: Record<DiffKind, string> = {
  same: "transparent",
  added: "var(--ok-bg)",
  removed: "var(--crit-bg)",
};

const LINE_FG: Record<DiffKind, string> = {
  same: "var(--text-secondary)",
  added: "var(--text-primary)",
  removed: "var(--text-primary)",
};

export const s = {
  wrap: { maxWidth: 980 } satisfies CSSProperties,
  head: { display: "flex", alignItems: "center", gap: 10, marginBottom: 6 } satisfies CSSProperties,
  h2: { fontSize: 16, fontWeight: 700 } satisfies CSSProperties,
  hint: { fontSize: 12.5, color: "var(--text-muted)", marginBottom: 16 } satisfies CSSProperties,
  split: { display: "flex", gap: 16, alignItems: "flex-start" } satisfies CSSProperties,
  list: {
    width: 200,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  } satisfies CSSProperties,
  row: (active: boolean): CSSProperties => ({
    textAlign: "left",
    padding: "10px 12px",
    borderRadius: 8,
    cursor: "pointer",
    border: `1px solid ${active ? "var(--border-strong)" : "var(--border)"}`,
    background: active ? "var(--bg-hover)" : "var(--bg-elevated)",
  }),
  rowTop: { display: "flex", alignItems: "center", gap: 8 } satisfies CSSProperties,
  rowVersion: { fontSize: 13, fontWeight: 600, flex: 1 } satisfies CSSProperties,
  rowDate: { fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 } satisfies CSSProperties,
  diffPane: {
    flex: 1,
    minWidth: 0,
    border: "1px solid var(--border)",
    borderRadius: 9,
    overflow: "hidden",
    background: "var(--bg-elevated)",
  } satisfies CSSProperties,
  diffHead: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 14px",
    borderBottom: "1px solid var(--border)",
    background: "var(--bg-surface)",
  } satisfies CSSProperties,
  diffTitle: { fontSize: 12.5, color: "var(--text-secondary)", flex: 1 } satisfies CSSProperties,
  counts: { display: "flex", gap: 10, fontSize: 12 } satisfies CSSProperties,
  added: { color: "var(--ok)" } satisfies CSSProperties,
  removed: { color: "var(--crit)" } satisfies CSSProperties,
  diffBody: { maxHeight: "58vh", overflow: "auto", padding: "8px 0" } satisfies CSSProperties,
  hunk: { borderTop: "1px solid var(--border)", padding: "6px 0" } satisfies CSSProperties,
  line: (kind: DiffKind): CSSProperties => ({
    display: "flex",
    fontSize: 12,
    lineHeight: "19px",
    background: LINE_BG[kind],
    color: LINE_FG[kind],
  }),
  gutter: {
    width: 38,
    flexShrink: 0,
    textAlign: "right",
    paddingRight: 8,
    color: "var(--text-muted)",
    userSelect: "none",
  } satisfies CSSProperties,
  sign: { width: 16, flexShrink: 0, textAlign: "center", userSelect: "none" } satisfies CSSProperties,
  text: { whiteSpace: "pre-wrap", wordBreak: "break-word", flex: 1 } satisfies CSSProperties,
  plain: {
    margin: 0,
    padding: "10px 14px",
    fontSize: 12,
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    color: "var(--text-secondary)",
  } satisfies CSSProperties,
  noChange: {
    padding: "18px 14px",
    fontSize: 12.5,
    color: "var(--text-muted)",
  } satisfies CSSProperties,
} as const;
