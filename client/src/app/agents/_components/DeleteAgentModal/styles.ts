import type { CSSProperties } from "react";

export const s = {
  body: { padding: "18px 24px 24px", fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.5 } satisfies CSSProperties,
  name: { color: "var(--text-primary)", fontWeight: 600 } satisfies CSSProperties,
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
  } satisfies CSSProperties,
} as const;
