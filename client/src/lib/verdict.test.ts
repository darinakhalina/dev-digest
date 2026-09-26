import { describe, it, expect } from "vitest";
import { VERDICT_META } from "./verdict";

describe("VERDICT_META — SPEC-2026-09-25-lib-modules", () => {
  it("gives comment the same colour everywhere it is looked up", () => {
    expect(VERDICT_META.comment.c).toBe("var(--info)");
  });

  it("has one entry per verdict, no duplicate colour definitions to drift", () => {
    expect(Object.keys(VERDICT_META).sort()).toEqual(["approve", "comment", "request_changes"]);
  });
});
