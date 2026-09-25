import { severityRank } from "./severity";

export interface OrderableFinding {
  severity: string;
  confidence: number;
  file: string;
  start_line: number;
  title: string;
}

export function compareFindings(a: OrderableFinding, b: OrderableFinding): number {
  return (
    severityRank(a.severity) - severityRank(b.severity) ||
    b.confidence - a.confidence ||
    a.file.localeCompare(b.file) ||
    a.start_line - b.start_line ||
    a.title.localeCompare(b.title)
  );
}
