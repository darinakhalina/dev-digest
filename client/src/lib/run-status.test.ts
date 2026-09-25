import { describe, it, expect } from "vitest";
import { isDeletable, isLive, isSettled, runOutcome } from "./run-status";

const run = (o: Partial<{ status: string | null; blockers: number | null; findings_count: number | null }>) =>
  ({ status: null, blockers: null, findings_count: null, ...o }) as never;

describe("run-status — SPEC-2026-09-25-lib-modules", () => {
  it("classes a running run as live and not deletable", () => {
    expect(isLive("running")).toBe(true);
    expect(isDeletable("running")).toBe(false);
  });

  it("classes anything else as deletable", () => {
    for (const s of ["done", "failed", "cancelled", null]) expect(isDeletable(s)).toBe(true);
  });

  it("classes only done as settled", () => {
    expect(isSettled("done")).toBe(true);
    expect(isSettled("running")).toBe(false);
  });

  it("derives the outcome from the deterministic gate, not the model", () => {
    expect(runOutcome(run({ status: "running" }))).toBe("running");
    expect(runOutcome(run({ status: "failed" }))).toBe("error");
    expect(runOutcome(run({ status: "cancelled" }))).toBe("cancelled");
    expect(runOutcome(run({ status: "done", blockers: 2 }))).toBe("rejected");
    expect(runOutcome(run({ status: "done", blockers: 0, findings_count: 1 }))).toBe("reviewed");
    expect(runOutcome(run({ status: "done", blockers: 0, findings_count: 0 }))).toBe("approved");
  });
});
