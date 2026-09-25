import type { RunSummary } from "@devdigest/shared";

export type RunOutcome = "running" | "error" | "cancelled" | "rejected" | "reviewed" | "approved";

export function isLive(status: string | null | undefined): boolean {
  return status === "running";
}

export function isSettled(status: string | null | undefined): boolean {
  return status === "done";
}

export function isDeletable(status: string | null | undefined): boolean {
  return !isLive(status);
}

export function runOutcome(run: Pick<RunSummary, "status" | "blockers" | "findings_count">): RunOutcome {
  if (isLive(run.status)) return "running";
  if (run.status === "failed") return "error";
  if (run.status === "cancelled") return "cancelled";
  if ((run.blockers ?? 0) > 0) return "rejected";
  if ((run.findings_count ?? 0) > 0) return "reviewed";
  return "approved";
}
