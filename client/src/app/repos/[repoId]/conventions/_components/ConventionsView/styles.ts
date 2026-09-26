import type { CSSProperties } from "react";

export const s = {
  page: { display: "flex", flexDirection: "column", gap: 20 } as CSSProperties,
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20 } as CSSProperties,
  headerText: { display: "flex", flexDirection: "column", gap: 6, minWidth: 0 } as CSSProperties,
  h1: { margin: 0, fontSize: 26, fontWeight: 600, color: "var(--text-primary)" } as CSSProperties,
  repo: { color: "var(--accent-text)" } as CSSProperties,
  subtitle: { margin: 0, fontSize: 13.5, color: "var(--text-tertiary)" } as CSSProperties,
  notice: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12.5,
    color: "var(--text-secondary)",
  } as CSSProperties,
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingBottom: 4,
  } as CSSProperties,
  toolbarLeft: { display: "flex", alignItems: "center", gap: 12 } as CSSProperties,
  count: { fontSize: 13, color: "var(--text-tertiary)" } as CSSProperties,
  list: { display: "flex", flexDirection: "column", gap: 14 } as CSSProperties,
};
