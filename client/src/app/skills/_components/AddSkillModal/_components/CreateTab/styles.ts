import type { CSSProperties } from "react";

export const s = {
  wrap: { display: "flex", flexDirection: "column", gap: 14 } satisfies CSSProperties,
  actions: { display: "flex", justifyContent: "flex-end", marginTop: 4 } satisfies CSSProperties,
} as const;
