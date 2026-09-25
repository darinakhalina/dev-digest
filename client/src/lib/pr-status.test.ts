import { describe, it, expect } from "vitest";
import { isClosedOrMerged, OPEN_REVIEW_STATUSES, statusTone } from "./pr-status";
import type { PrStatus } from "@devdigest/shared";

describe("pr-status — SPEC-2026-09-25-lib-modules", () => {
  it("agrees on which statuses are open across both checks", () => {
    const all: PrStatus[] = ["needs_review", "reviewed", "stale", "open", "closed", "merged"];
    for (const s of all) {
      if (isClosedOrMerged(s)) expect(OPEN_REVIEW_STATUSES.has(s)).toBe(false);
    }
  });

  it("gives merged and closed the same tone here as on the PR list", () => {
    expect(statusTone("merged")).toBe("var(--ok)");
    expect(statusTone("closed")).toBe("var(--stale)");
  });
});
