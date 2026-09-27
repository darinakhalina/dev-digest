import type { CSSProperties } from "react";

export const s = {
  page: { padding: "24px 32px 44px", maxWidth: 1280, margin: "0 auto" } satisfies CSSProperties,
  header: {
    display: "flex",
    alignItems: "flex-end",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 20,
  } satisfies CSSProperties,
  headerText: { flex: 1, minWidth: 0 } satisfies CSSProperties,
  h1: { fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" } satisfies CSSProperties,
  repo: { color: "var(--accent-text)" } satisfies CSSProperties,
  subtitle: {
    fontSize: 14,
    color: "var(--text-secondary)",
    marginTop: 4,
  } satisfies CSSProperties,
  notices: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    marginTop: 8,
  } satisfies CSSProperties,
  notice: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12.5,
    color: "var(--text-muted)",
  } satisfies CSSProperties,
  headerActions: { marginLeft: "auto", display: "flex", gap: 10 } satisfies CSSProperties,
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 0 14px",
    borderTop: "1px solid var(--border)",
    marginTop: 4,
  } satisfies CSSProperties,
  count: { fontSize: 13, color: "var(--text-muted)" } satisfies CSSProperties,
  spacer: { marginLeft: "auto" } satisfies CSSProperties,
  list: { display: "flex", flexDirection: "column", gap: 12 } satisfies CSSProperties,
} as const;
