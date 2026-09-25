import { SEVERITY_ORDER } from "./severity";

export interface OrderableFinding {
  severity: string;
  confidence: number;
  file: string;
  start_line: number;
  title: string;
}

export function compareFindings(a: OrderableFinding, b: OrderableFinding): number {
  return (
    (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9) ||
    b.confidence - a.confidence ||
    a.file.localeCompare(b.file) ||
    a.start_line - b.start_line ||
    a.title.localeCompare(b.title)
  );
}
