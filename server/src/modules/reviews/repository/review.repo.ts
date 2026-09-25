import { and, desc, eq, inArray } from 'drizzle-orm';
import type { Db, Executor } from '../../../db/client.js';
import * as t from '../../../db/schema.js';
import type { Finding, PrFindings, Severity, FindingCategory } from '@devdigest/shared';
import type { FindingRow, PullRow } from '../../../db/rows.js';

export type ReviewRow = typeof t.reviews.$inferSelect;

// ---- reviews + findings ---------------------------------------------------

export async function insertReview(
  db: Executor,
  values: {
    workspaceId: string;
    prId: string;
    agentId: string | null;
    runId: string | null;
    kind: 'summary' | 'review';
    verdict: string | null;
    summary: string | null;
    score: number | null;
    model: string | null;
  },
): Promise<ReviewRow> {
  const [row] = await db.insert(t.reviews).values(values).returning();
  return row!;
}

export async function insertFindings(
  db: Executor,
  reviewId: string,
  findings: Finding[],
): Promise<FindingRow[]> {
  if (findings.length === 0) return [];
  const rows = await db
    .insert(t.findings)
    .values(
      findings.map((f) => ({
        reviewId,
        file: f.file,
        startLine: f.start_line,
        endLine: f.end_line,
        severity: f.severity,
        category: f.category,
        title: f.title,
        rationale: f.rationale,
        suggestion: f.suggestion ?? null,
        confidence: f.confidence,
        kind: f.kind ?? 'finding',
        trifectaComponents: f.trifecta_components ?? null,
      })),
    )
    .returning();
  return rows;
}

/** Reviews for a PR (newest first), each with its findings. */
export async function reviewsForPull(
  db: Db,
  prId: string,
): Promise<{ review: ReviewRow; findings: FindingRow[] }[]> {
  const reviews = await db
    .select()
    .from(t.reviews)
    .where(eq(t.reviews.prId, prId))
    .orderBy(desc(t.reviews.createdAt));
  if (reviews.length === 0) return [];
  const ids = reviews.map((r) => r.id);
  const findings = await db.select().from(t.findings).where(inArray(t.findings.reviewId, ids));
  return reviews.map((review) => ({
    review,
    findings: findings.filter((f) => f.reviewId === review.id),
  }));
}

export async function getReview(db: Db, reviewId: string): Promise<ReviewRow | undefined> {
  const [row] = await db.select().from(t.reviews).where(eq(t.reviews.id, reviewId));
  return row;
}

/** Delete a whole review (one agent's run) + its findings (cascade), scoped
 *  to the workspace. Returns false if not found in the workspace. */
export async function deleteReview(
  db: Db,
  workspaceId: string,
  reviewId: string,
): Promise<boolean> {
  const rows = await db
    .delete(t.reviews)
    .where(and(eq(t.reviews.workspaceId, workspaceId), eq(t.reviews.id, reviewId)))
    .returning({ id: t.reviews.id });
  return rows.length > 0;
}

// ---- finding actions ------------------------------------------------------

export async function getFinding(db: Db, findingId: string): Promise<FindingRow | undefined> {
  const [row] = await db.select().from(t.findings).where(eq(t.findings.id, findingId));
  return row;
}

/** Resolve workspace_id + pr_id for a finding (via review → pr). */
export async function findingContext(
  db: Db,
  findingId: string,
): Promise<{ finding: FindingRow; review: ReviewRow; pull: PullRow } | undefined> {
  const finding = await getFinding(db, findingId);
  if (!finding) return undefined;
  const review = await getReview(db, finding.reviewId);
  if (!review) return undefined;
  const [pull] = await db
    .select()
    .from(t.pullRequests)
    .where(eq(t.pullRequests.id, review.prId));
  if (!pull) return undefined;
  return { finding, review, pull };
}

export async function setFindingAccepted(
  db: Db,
  findingId: string,
  at: Date | null,
): Promise<FindingRow | undefined> {
  const [row] = await db
    .update(t.findings)
    .set({ acceptedAt: at, dismissedAt: null })
    .where(eq(t.findings.id, findingId))
    .returning();
  return row;
}

export async function setFindingDismissed(
  db: Db,
  findingId: string,
  at: Date | null,
): Promise<FindingRow | undefined> {
  const [row] = await db
    .update(t.findings)
    .set({ dismissedAt: at, acceptedAt: null })
    .where(eq(t.findings.id, findingId))
    .returning();
  return row;
}

const DESCRIPTION_LIMIT = 160;
const SEVERITY_RANK: Record<string, number> = { CRITICAL: 0, WARNING: 1, SUGGESTION: 2 };

export async function reviewSummaryForPrs(
  db: Db,
  prIds: string[],
): Promise<Map<string, { score: number | null; findings: PrFindings | null }>> {
  const out = new Map<string, { score: number | null; findings: PrFindings | null }>();
  if (prIds.length === 0) return out;

  const reviewRows = await db
    .select({
      id: t.reviews.id,
      prId: t.reviews.prId,
      agentId: t.reviews.agentId,
      score: t.reviews.score,
    })
    .from(t.reviews)
    .where(and(inArray(t.reviews.prId, prIds), eq(t.reviews.kind, 'review')))
    .orderBy(desc(t.reviews.createdAt));

  const latestScoreByPr = new Map<string, number | null>();
  const countedReviewsByPr = new Map<string, string[]>();
  const seen = new Set<string>();
  for (const rv of reviewRows) {
    if (!latestScoreByPr.has(rv.prId)) latestScoreByPr.set(rv.prId, rv.score);
    const key = `${rv.prId}:${rv.agentId ?? 'NULL'}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const bucket = countedReviewsByPr.get(rv.prId) ?? [];
    bucket.push(rv.id);
    countedReviewsByPr.set(rv.prId, bucket);
  }

  const reviewToPr = new Map<string, string>();
  for (const [prId, ids] of countedReviewsByPr) for (const id of ids) reviewToPr.set(id, prId);

  const countedReviewIds = [...reviewToPr.keys()];
  const findingsByPr = new Map<string, PrFindings>();
  if (countedReviewIds.length > 0) {
    const findingRows = await db
      .select({
        reviewId: t.findings.reviewId,
        severity: t.findings.severity,
        title: t.findings.title,
        category: t.findings.category,
        file: t.findings.file,
        startLine: t.findings.startLine,
        confidence: t.findings.confidence,
        rationale: t.findings.rationale,
      })
      .from(t.findings)
      .where(inArray(t.findings.reviewId, countedReviewIds));

    const groupedByPr = new Map<string, typeof findingRows>();
    for (const row of findingRows) {
      const prId = reviewToPr.get(row.reviewId);
      if (!prId) continue;
      const bucket = groupedByPr.get(prId) ?? [];
      bucket.push(row);
      groupedByPr.set(prId, bucket);
    }

    for (const [prId, findingsForPr] of groupedByPr) {
      if (findingsForPr.length === 0) continue;
      const counts: Record<string, number> = {};
      for (const row of findingsForPr) counts[row.severity] = (counts[row.severity] ?? 0) + 1;
      const previews = [...findingsForPr]
        .sort(
          (a, b) =>
            (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9) ||
            b.confidence - a.confidence ||
            a.file.localeCompare(b.file) ||
            a.startLine - b.startLine ||
            a.title.localeCompare(b.title),
        )
        .map((row) => ({
          severity: row.severity as Severity,
          title: row.title,
          category: row.category as FindingCategory,
          file: row.file,
          line: row.startLine,
          confidence: row.confidence,
          description:
            row.rationale.length > DESCRIPTION_LIMIT
              ? `${row.rationale.slice(0, DESCRIPTION_LIMIT)}…`
              : row.rationale,
        }));
      findingsByPr.set(prId, { counts: counts as PrFindings['counts'], total: findingsForPr.length, previews });
    }
  }

  for (const prId of prIds) {
    out.set(prId, {
      score: latestScoreByPr.get(prId) ?? null,
      findings: findingsByPr.get(prId) ?? null,
    });
  }
  return out;
}
