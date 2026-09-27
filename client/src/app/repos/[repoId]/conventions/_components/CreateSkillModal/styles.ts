import type { CSSProperties } from "react";

export const s = {
  banner: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 13px",
    borderRadius: 8,
    background: "var(--accent-bg)",
    border: "1px solid var(--border)",
    marginBottom: 18,
  } satisfies CSSProperties,
  bannerIcon: { color: "var(--accent)", flexShrink: 0 } satisfies CSSProperties,
  bannerText: { fontSize: 12.5, color: "var(--text-secondary)" } satisfies CSSProperties,
  bannerStrong: { color: "var(--text-primary)" } satisfies CSSProperties,
  bannerRepo: { color: "var(--accent-text)" } satisfies CSSProperties,
  footerNote: {
    fontSize: 11.5,
    color: "var(--text-muted)",
    marginRight: "auto",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  } satisfies CSSProperties,
} as const;
