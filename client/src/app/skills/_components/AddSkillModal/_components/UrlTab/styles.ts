import type { CSSProperties } from "react";

export const s = {
  wrap: { display: "flex", flexDirection: "column", gap: 14 } satisfies CSSProperties,
  urlRow: { display: "flex", alignItems: "center", gap: 8 } satisfies CSSProperties,
  error: { fontSize: 12.5, color: "var(--crit)" } satisfies CSSProperties,
  actions: { display: "flex", justifyContent: "flex-end", marginTop: 4 } satisfies CSSProperties,
} as const;
