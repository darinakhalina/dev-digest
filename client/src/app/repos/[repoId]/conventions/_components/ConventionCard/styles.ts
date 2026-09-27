import type { CSSProperties } from "react";
import type { ConventionStatus } from "@devdigest/shared";

const accent: Record<ConventionStatus, string> = {
  pending: "var(--border-strong)",
  accepted: "var(--success)",
  rejected: "var(--border)",
};

export const s = {
  card: (status: ConventionStatus): CSSProperties => ({
    borderLeft: `3px solid ${accent[status]}`,
    opacity: status === "rejected" ? 0.55 : 1,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  }),
  top: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  } as CSSProperties,
  ruleWrap: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 } as CSSProperties,
  rule: {
    margin: 0,
    fontSize: 15,
    fontStyle: "italic",
    lineHeight: 1.45,
    color: "var(--text-primary)",
  } as CSSProperties,
  actions: { display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 } as CSSProperties,
  meta: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" } as CSSProperties,
  evidence: {
    border: "1px solid var(--border)",
    borderRadius: 7,
    overflow: "hidden",
  } as CSSProperties,
  evidenceHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "8px 12px",
    background: "var(--bg-subtle)",
    borderBottom: "1px solid var(--border)",
  } as CSSProperties,
  snippet: {
    margin: 0,
    padding: "12px",
    fontSize: 12.5,
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    color: "var(--text-secondary)",
  } as CSSProperties,
  confidenceRow: { display: "flex", alignItems: "center", gap: 12 } as CSSProperties,
  confidenceLabel: { fontSize: 12, color: "var(--text-tertiary)", flexShrink: 0 } as CSSProperties,
  confidenceBar: { flex: 1, maxWidth: 160 } as CSSProperties,
  confidencePct: { fontSize: 12, color: "var(--text-secondary)", flexShrink: 0 } as CSSProperties,
  editRow: { display: "flex", gap: 8, justifyContent: "flex-end" } as CSSProperties,
  error: { fontSize: 12, color: "var(--danger)" } as CSSProperties,
};
