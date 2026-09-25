import { describe, it, expect } from "vitest";
import { parsePatch } from "./helpers";

describe("parsePatch", () => {
  it("returns an empty list for a missing patch", () => {
    expect(parsePatch(null)).toEqual([]);
    expect(parsePatch(undefined)).toEqual([]);
    expect(parsePatch("")).toEqual([]);
  });

  it("numbers added, removed and context lines against the hunk header", () => {
    const patch = ["@@ -10,3 +10,4 @@", " kept", "-removed", "+added one", "+added two", " kept again"].join(
      "\n",
    );
    const lines = parsePatch(patch);

    expect(lines).toEqual([
      { kind: "hunk", text: "@@ -10,3 +10,4 @@" },
      { kind: "ctx", text: "kept", oldNo: 10, newNo: 10 },
      { kind: "del", text: "removed", oldNo: 11 },
      { kind: "add", text: "added one", newNo: 11 },
      { kind: "add", text: "added two", newNo: 12 },
      { kind: "ctx", text: "kept again", oldNo: 12, newNo: 13 },
    ]);
  });

  it("restarts numbering at each new hunk header", () => {
    const patch = ["@@ -1,1 +1,1 @@", " a", "@@ -50,1 +52,1 @@", " b"].join("\n");
    const lines = parsePatch(patch);

    expect(lines[1]).toEqual({ kind: "ctx", text: "a", oldNo: 1, newNo: 1 });
    expect(lines[3]).toEqual({ kind: "ctx", text: "b", oldNo: 50, newNo: 52 });
  });
});
