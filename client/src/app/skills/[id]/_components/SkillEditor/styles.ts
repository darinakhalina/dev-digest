import type { CSSProperties } from "react";

export const s = {
  page: { padding: "24px 32px 44px", maxWidth: 820, margin: "0 auto" } satisfies CSSProperties,
  back: {
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    fontSize: 13,
    color: "var(--text-secondary)",
    marginBottom: 16,
  } satisfies CSSProperties,
  loading: { display: "flex", flexDirection: "column", gap: 16 } satisfies CSSProperties,
} as const;
