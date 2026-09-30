import type { CSSProperties } from "react";

export const s = {
  wrap: { maxWidth: 860, display: "flex", flexDirection: "column", gap: 12 } satisfies CSSProperties,
  head: { display: "flex", alignItems: "center", gap: 10 } satisfies CSSProperties,
  h2: { fontSize: 16, fontWeight: 700 } satisfies CSSProperties,
  hint: { fontSize: 12.5, color: "var(--text-muted)" } satisfies CSSProperties,
  panel: {
    border: "1px solid var(--border)",
    borderRadius: 9,
    background: "var(--bg-elevated)",
    padding: "18px 22px",
  } satisfies CSSProperties,
  disabled: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12.5,
    color: "var(--warn)",
  } satisfies CSSProperties,
} as const;
