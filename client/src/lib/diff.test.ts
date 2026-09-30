import { describe, it, expect } from "vitest";
import { collapseUnchanged, countChanges, diffLines } from "./diff";

describe("diffLines", () => {
  it("reports nothing changed when the two texts are identical", () => {
    const rows = diffLines("a\nb\nc", "a\nb\nc");
    expect(rows.every((r) => r.kind === "same")).toBe(true);
    expect(countChanges(rows)).toEqual({ added: 0, removed: 0 });
  });

  it("marks an inserted line as added and leaves the rest alone", () => {
    const rows = diffLines("a\nc", "a\nb\nc");
    expect(rows.map((r) => [r.kind, r.text])).toEqual([
      ["same", "a"],
      ["added", "b"],
      ["same", "c"],
    ]);
    expect(countChanges(rows)).toEqual({ added: 1, removed: 0 });
  });

  it("marks a deleted line as removed", () => {
    const rows = diffLines("a\nb\nc", "a\nc");
    expect(rows.map((r) => [r.kind, r.text])).toEqual([
      ["same", "a"],
      ["removed", "b"],
      ["same", "c"],
    ]);
    expect(countChanges(rows)).toEqual({ added: 0, removed: 1 });
  });

  it("reports a changed line as one removal and one addition", () => {
    const rows = diffLines("a\nold\nc", "a\nnew\nc");
    expect(countChanges(rows)).toEqual({ added: 1, removed: 1 });
    expect(rows.find((r) => r.kind === "removed")?.text).toBe("old");
    expect(rows.find((r) => r.kind === "added")?.text).toBe("new");
  });

  it("numbers lines against the side each one belongs to", () => {
    const rows = diffLines("a\nb", "a\nx\nb");
    const added = rows.find((r) => r.kind === "added")!;
    expect(added.oldLine).toBeNull();
    expect(added.newLine).toBe(2);
    const last = rows[rows.length - 1]!;
    expect(last).toMatchObject({ kind: "same", oldLine: 2, newLine: 3 });
  });

  it("handles one side being empty", () => {
    expect(countChanges(diffLines("", "a\nb"))).toEqual({ added: 2, removed: 1 });
    expect(countChanges(diffLines("a\nb", ""))).toEqual({ added: 1, removed: 2 });
  });
});

describe("collapseUnchanged", () => {
  const body = (n: number) => Array.from({ length: n }, (_, i) => `line ${i + 1}`).join("\n");

  it("keeps only the neighbourhood of a change", () => {
    const before = body(40);
    const after = before.replace("line 20", "line 20 CHANGED");
    const hunks = collapseUnchanged(diffLines(before, after), 2);

    expect(hunks).toHaveLength(1);
    const texts = hunks[0]!.map((r) => r.text);
    expect(texts).toContain("line 20 CHANGED");
    expect(texts).not.toContain("line 1");
    expect(texts).not.toContain("line 40");
  });

  it("splits distant changes into separate hunks", () => {
    const before = body(60);
    const after = before.replace("line 5", "line 5 X").replace("line 50", "line 50 Y");
    expect(collapseUnchanged(diffLines(before, after), 2)).toHaveLength(2);
  });

  it("returns nothing to show when the texts are identical", () => {
    expect(collapseUnchanged(diffLines(body(10), body(10)))).toEqual([]);
  });
});
