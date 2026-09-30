import type { CSSProperties } from "react";

export const s = {
  tabsBar: { borderBottom: "1px solid var(--border)" } satisfies CSSProperties,
  body: { padding: "20px 24px 24px", maxHeight: "62vh", overflow: "auto" } satisfies CSSProperties,
} as const;
