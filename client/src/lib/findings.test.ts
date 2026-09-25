import { describe, it, expect } from "vitest";
import { compareFindings, type OrderableFinding } from "./findings";

const f = (o: Partial<OrderableFinding>): OrderableFinding => ({
  severity: "WARNING",
  confidence: 0.8,
  file: "a.ts",
  start_line: 1,
  title: "t",
  ...o,
});

describe("compareFindings — SPEC-2026-09-25-pr-page-bugs", () => {
  it("orders by severity, confidence, file, line, then title", () => {
    const items = [
      f({ title: "b" }),
      f({ start_line: 2 }),
      f({ file: "b.ts" }),
      f({ confidence: 0.9 }),
      f({ severity: "CRITICAL", confidence: 0.1 }),
      f({ title: "a" }),
    ];
    const order = [...items].sort(compareFindings);
    expect(order.map((x) => [x.severity, x.confidence, x.file, x.start_line, x.title])).toEqual([
      ["CRITICAL", 0.1, "a.ts", 1, "t"],
      ["WARNING", 0.9, "a.ts", 1, "t"],
      ["WARNING", 0.8, "a.ts", 1, "a"],
      ["WARNING", 0.8, "a.ts", 1, "b"],
      ["WARNING", 0.8, "a.ts", 2, "t"],
      ["WARNING", 0.8, "b.ts", 1, "t"],
    ]);
  });

  it("gives the same order whatever order the findings arrive in", () => {
    const items = [f({ title: "x" }), f({ title: "y" }), f({ file: "c.ts" }), f({ start_line: 5 })];
    const once = [...items].sort(compareFindings);
    const reversed = [...items].reverse().sort(compareFindings);
    expect(reversed).toEqual(once);
  });
});
