import { describe, it, expect } from "vitest";
import { formatCost, isKnownCost } from "./cost";

describe("isKnownCost — SPEC-2026-09-25-lib-modules", () => {
  it("agrees with formatCost about which values are known", () => {
    for (const v of [null, undefined, NaN, -1, Infinity, 0, 0.02, 5]) {
      expect(isKnownCost(v)).toBe(formatCost(v) !== "—");
    }
  });
});
