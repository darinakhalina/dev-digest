import { describe, it, expect } from "vitest";
import type { FindingRecord } from "@devdigest/shared";
import { countsBySeverity, severityRank, SEVERITY_ORDER } from "./severity";

const f = (id: string, severity: string) => ({ id, severity } as unknown as FindingRecord);

describe("SEVERITY_ORDER — SPEC-2026-09-25-lib-modules", () => {
  it("holds exactly the three contract levels, no dead entry", () => {
    expect(Object.keys(SEVERITY_ORDER).sort()).toEqual(["CRITICAL", "SUGGESTION", "WARNING"]);
  });
});

describe("severityRank", () => {
  it("ranks the canonical levels in order", () => {
    expect(severityRank("CRITICAL")).toBeLessThan(severityRank("WARNING"));
    expect(severityRank("WARNING")).toBeLessThan(severityRank("SUGGESTION"));
  });

  it("puts an unknown level last", () => {
    expect(severityRank("INFO")).toBeGreaterThan(severityRank("SUGGESTION"));
  });
});

describe("countsBySeverity", () => {
  it("counts each level and reports absent ones as 0", () => {
    expect(countsBySeverity([f("1", "CRITICAL"), f("2", "WARNING"), f("3", "WARNING")])).toEqual({
      CRITICAL: 1,
      WARNING: 2,
      SUGGESTION: 0,
    });
  });

  it("ignores a severity outside the three canonical levels", () => {
    expect(countsBySeverity([f("1", "INFO"), f("2", "CRITICAL")])).toEqual({
      CRITICAL: 1,
      WARNING: 0,
      SUGGESTION: 0,
    });
  });
});
