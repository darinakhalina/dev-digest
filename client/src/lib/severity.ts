import type { FindingRecord, Severity } from "@devdigest/shared";

const ALL: Record<Severity, true> = {
  CRITICAL: true,
  WARNING: true,
  SUGGESTION: true,
};

export const SEVERITY_ORDER: Record<Severity, number> = {
  CRITICAL: 0,
  WARNING: 1,
  SUGGESTION: 2,
};

export function severityRank(level: string): number {
  return (SEVERITY_ORDER as Record<string, number>)[level] ?? 9;
}

export const SEVERITIES = (Object.keys(ALL) as Severity[]).sort(
  (a, b) => SEVERITY_ORDER[a] - SEVERITY_ORDER[b],
);

export function countsBySeverity(findings: FindingRecord[]): Record<Severity, number> {
  const out = Object.fromEntries(SEVERITIES.map((s) => [s, 0])) as Record<Severity, number>;
  for (const f of findings) if (f.severity in out) out[f.severity as Severity] += 1;
  return out;
}
