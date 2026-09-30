import type { CSSProperties } from "react";
import type { ConventionStatus } from "@devdigest/shared";

export const CONFIDENCE_OK = 0.85;
export const CONFIDENCE_BAR_WIDTH = 90;

export const s = {
  card: (status: ConventionStatus): CSSProperties => ({
    border: "1px solid var(--border)",
    borderLeft: `3px solid ${status === "accepted" ? "var(--ok)" : "var(--border)"}`,
    borderRadius: 9,
    background: "var(--bg-elevated)",
    padding: 16,
    opacity: status === "rejected" ? 0.55 : 1,
    transition: "border-color .12s",
  }),
  row: { display: "flex", gap: 14 } satisfies CSSProperties,
  main: { flex: 1, minWidth: 0 } satisfies CSSProperties,
  rule: {
    fontSize: 14,
    fontWeight: 600,
    fontStyle: "italic",
    lineHeight: 1.4,
  } satisfies CSSProperties,
  editRow: {
    display: "flex",
    gap: 8,
    justifyContent: "flex-end",
    marginTop: 8,
  } satisfies CSSProperties,
  evidence: {
    marginTop: 10,
    borderRadius: 7,
    border: "1px solid var(--border)",
    overflow: "hidden",
  } satisfies CSSProperties,
  evidenceHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "5px 10px",
    background: "var(--bg-surface)",
    borderBottom: "1px solid var(--border)",
  } satisfies CSSProperties,
  evidencePlain: { fontSize: 13, color: "var(--text-muted)" } satisfies CSSProperties,
  copy: { color: "var(--text-muted)", cursor: "pointer" } satisfies CSSProperties,
  snippet: {
    margin: 0,
    padding: "10px 12px",
    fontSize: 11.5,
    lineHeight: 1.55,
    color: "var(--text-primary)",
    background: "var(--code-bg)",
    overflow: "auto",
  } satisfies CSSProperties,
  meta: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    flexWrap: "wrap",
  } satisfies CSSProperties,
  confidenceLabel: { fontSize: 11, color: "var(--text-muted)" } satisfies CSSProperties,
  confidenceBar: { width: CONFIDENCE_BAR_WIDTH } satisfies CSSProperties,
  confidencePct: { fontSize: 11, color: "var(--text-secondary)" } satisfies CSSProperties,
  actions: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
    flexShrink: 0,
    width: 150,
  } satisfies CSSProperties,
  error: { fontSize: 11.5, color: "var(--crit)", marginTop: 8 } satisfies CSSProperties,
} as const;
