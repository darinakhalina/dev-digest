import { describe, it, expect } from "vitest";
import { ATTACHED_ZONE, AVAILABLE_ZONE, moveSkill, resolveDrop } from "./helpers";

const ATTACHED = ["a", "b", "c"];

describe("resolveDrop — what a finished drag means", () => {
  it("reorders when an attached row lands on another attached row", () => {
    expect(resolveDrop(ATTACHED, "c", "a")).toEqual(["c", "a", "b"]);
    expect(resolveDrop(ATTACHED, "a", "c")).toEqual(["b", "c", "a"]);
  });

  it("changes nothing when a row lands on itself", () => {
    expect(resolveDrop(ATTACHED, "b", "b")).toBeNull();
  });

  it("changes nothing when the drag ends outside any zone", () => {
    expect(resolveDrop(ATTACHED, "b", null)).toBeNull();
  });

  it("attaches at the position it was dropped on", () => {
    expect(resolveDrop(ATTACHED, "x", "a")).toEqual(["x", "a", "b", "c"]);
    expect(resolveDrop(ATTACHED, "x", "c")).toEqual(["a", "b", "x", "c"]);
  });

  it("attaches at the end when dropped on the zone rather than a row", () => {
    expect(resolveDrop(ATTACHED, "x", ATTACHED_ZONE)).toEqual(["a", "b", "c", "x"]);
  });

  it("inserts after the target when the drag came from above it", () => {
    expect(resolveDrop(ATTACHED, "x", "c", true)).toEqual(["a", "b", "c", "x"]);
    expect(resolveDrop(ATTACHED, "x", "a", true)).toEqual(["a", "x", "b", "c"]);
  });

  it("changes nothing when an already attached row is released on the list background", () => {
    expect(resolveDrop(ATTACHED, "b", ATTACHED_ZONE)).toBeNull();
  });

  it("detaches when an attached row is dropped on the available list", () => {
    expect(resolveDrop(ATTACHED, "b", AVAILABLE_ZONE)).toEqual(["a", "c"]);
    expect(resolveDrop(ATTACHED, "b", "x")).toEqual(["a", "c"]);
  });

  it("ignores a drag that starts and ends outside the attached list", () => {
    expect(resolveDrop(ATTACHED, "x", "y")).toBeNull();
    expect(resolveDrop(ATTACHED, "x", AVAILABLE_ZONE)).toBeNull();
  });

  it("keeps the whole order, not just the moved pair", () => {
    const long = ["a", "b", "c", "d", "e"];
    expect(resolveDrop(long, "e", "b")).toEqual(["a", "e", "b", "c", "d"]);
    expect(moveSkill(long, 4, 1)).toEqual(["a", "e", "b", "c", "d"]);
  });
});
