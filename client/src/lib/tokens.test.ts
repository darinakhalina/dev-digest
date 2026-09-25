import { describe, it, expect } from "vitest";
import { formatTokenCount, formatTokenRange } from "./tokens";

describe("formatTokenCount — SPEC-2026-09-25-lib-modules", () => {
  it("does not round a real small count down to zero", () => {
    expect(formatTokenCount(300)).not.toBe("0k");
    expect(formatTokenCount(300)).toBe("300");
  });

  it("shows one decimal below 10k", () => {
    expect(formatTokenCount(1500)).toBe("1.5k");
  });

  it("drops a redundant .0", () => {
    expect(formatTokenCount(2000)).toBe("2k");
  });

  it("rounds to whole k at 10k and above", () => {
    expect(formatTokenCount(12000)).toBe("12k");
  });

  it("switches to M above a million", () => {
    expect(formatTokenCount(1_500_000)).toBe("1.5M");
  });
});

describe("formatTokenRange", () => {
  it("formats a small in/out pair without losing either side to 0k", () => {
    expect(formatTokenRange(300, 150)).toBe("300→150");
  });

  it("formats a large pair compactly", () => {
    expect(formatTokenRange(12000, 1500)).toBe("12k→1.5k");
  });
});
