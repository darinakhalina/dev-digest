import type { PrStatus } from "@devdigest/shared";

export const OPEN_REVIEW_STATUSES: ReadonlySet<PrStatus> = new Set(["needs_review", "reviewed", "stale"]);

export function isClosedOrMerged(status: PrStatus): boolean {
  return status === "merged" || status === "closed";
}

export function statusTone(status: PrStatus): string {
  if (status === "merged" || status === "reviewed") return "var(--ok)";
  if (status === "closed" || status === "stale") return "var(--stale)";
  return "var(--warn)";
}
