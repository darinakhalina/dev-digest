import type { FindingRecord } from "@devdigest/shared";
import { LOW_CONFIDENCE_THRESHOLD } from "./constants";
import { severityRank } from "@/lib/severity";

export function visibleFindings(
  findings: FindingRecord[],
  hideLow: boolean,
  severities: ReadonlySet<string> = new Set(),
): FindingRecord[] {
  let shown = findings;
  if (hideLow) shown = shown.filter((f) => f.confidence >= LOW_CONFIDENCE_THRESHOLD);
  if (severities.size > 0) shown = shown.filter((f) => severities.has(f.severity));
  return [...shown].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
}
