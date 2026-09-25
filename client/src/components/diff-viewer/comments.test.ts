import { describe, it, expect } from "vitest";
import type { PrReviewComment } from "../../lib/types";
import { buildThreads, keysForLine, commentTargetFor, partitionThreads, lineKey } from "./comments";
import type { Line } from "./helpers";

function comment(overrides: Partial<PrReviewComment>): PrReviewComment {
  return {
    id: 1,
    path: "src/a.ts",
    line: 10,
    original_line: 10,
    side: "RIGHT",
    body: "body",
    user: "dasha",
    created_at: "2026-09-25T00:00:00Z",
    html_url: "https://example.com",
    in_reply_to_id: null,
    is_outdated: false,
    ...overrides,
  };
}

describe("lineKey", () => {
  it("joins side and line, or returns null for no line", () => {
    expect(lineKey("RIGHT", 12)).toBe("RIGHT:12");
    expect(lineKey("LEFT", null)).toBeNull();
    expect(lineKey("LEFT", undefined)).toBeNull();
  });
});

describe("buildThreads", () => {
  it("groups a root and its replies into one thread, ordered oldest-first", () => {
    const root = comment({ id: 1, created_at: "2026-09-25T00:00:00Z" });
    const reply = comment({
      id: 2,
      in_reply_to_id: 1,
      created_at: "2026-09-25T00:05:00Z",
      body: "reply",
    });
    const threads = buildThreads([reply, root]);

    expect(threads).toHaveLength(1);
    expect(threads[0]!.rootId).toBe(1);
    expect(threads[0]!.comments.map((c) => c.id)).toEqual([1, 2]);
    expect(threads[0]!.line).toBe(10);
    expect(threads[0]!.side).toBe("RIGHT");
  });

  it("marks a thread outdated when the root has no line", () => {
    const threads = buildThreads([comment({ id: 5, line: null })]);
    expect(threads[0]!.isOutdated).toBe(true);
  });

  it("keeps unrelated comments in separate threads", () => {
    const threads = buildThreads([comment({ id: 1 }), comment({ id: 2, line: 20 })]);
    expect(threads).toHaveLength(2);
  });
});

describe("keysForLine", () => {
  it("returns a RIGHT key for an added line", () => {
    const ln: Line = { kind: "add", text: "x", newNo: 7 };
    expect(keysForLine(ln)).toEqual(["RIGHT:7"]);
  });

  it("returns a LEFT key for a removed line", () => {
    const ln: Line = { kind: "del", text: "x", oldNo: 3 };
    expect(keysForLine(ln)).toEqual(["LEFT:3"]);
  });

  it("returns both keys for a context line", () => {
    const ln: Line = { kind: "ctx", text: "x", oldNo: 3, newNo: 7 };
    expect(keysForLine(ln)).toEqual(["RIGHT:7", "LEFT:3"]);
  });

  it("returns no keys for a hunk header", () => {
    const ln: Line = { kind: "hunk", text: "@@ -1 +1 @@" };
    expect(keysForLine(ln)).toEqual([]);
  });
});

describe("commentTargetFor", () => {
  it("targets RIGHT for an added or context line", () => {
    expect(commentTargetFor({ kind: "add", text: "x", newNo: 5 })).toEqual({ line: 5, side: "RIGHT" });
    expect(commentTargetFor({ kind: "ctx", text: "x", oldNo: 5, newNo: 6 })).toEqual({
      line: 6,
      side: "RIGHT",
    });
  });

  it("targets LEFT for a removed line", () => {
    expect(commentTargetFor({ kind: "del", text: "x", oldNo: 4 })).toEqual({ line: 4, side: "LEFT" });
  });

  it("returns null for a hunk header", () => {
    expect(commentTargetFor({ kind: "hunk", text: "@@ -1 +1 @@" })).toBeNull();
  });
});

describe("partitionThreads", () => {
  it("matches a thread whose (side, line) is rendered, and buckets the rest as outdated", () => {
    const rendered = comment({ id: 1, side: "RIGHT", line: 5 });
    const gone = comment({ id: 2, side: "LEFT", line: 99 });
    const noLine = comment({ id: 3, line: null });
    const threads = buildThreads([rendered, gone, noLine]);

    const { matched, outdated } = partitionThreads(threads, new Set(["RIGHT:5"]));

    expect(matched.get("RIGHT:5")).toHaveLength(1);
    expect(outdated.map((t) => t.rootId).sort()).toEqual([2, 3]);
  });
});
