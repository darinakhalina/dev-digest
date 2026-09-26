import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import type { Finding } from '@devdigest/shared';
import { startPg, dockerAvailable, type PgFixture } from './helpers/pg.js';
import { seed } from '../src/db/seed.js';
import * as t from '../src/db/schema.js';
import { ReviewRepository } from '../src/modules/reviews/repository.js';

const hasDocker = await dockerAvailable();
const d = hasDocker ? describe : describe.skip;

const FINDING: Finding = {
  id: 'f-1',
  severity: 'CRITICAL',
  category: 'security',
  title: 'Hardcoded secret',
  file: 'src/config.ts',
  start_line: 11,
  end_line: 11,
  rationale: 'A live key is committed.',
  confidence: 0.9,
  kind: 'finding',
};

d('run outcome is persisted atomically — SPEC-2026-09-25-run-reliability', () => {
  let pg: PgFixture;
  let repo: ReviewRepository;
  let workspaceId: string;
  let prId: string;

  beforeAll(async () => {
    pg = await startPg();
    await seed(pg.handle.db);
    const [ws] = await pg.handle.db.select().from(t.workspaces);
    workspaceId = ws!.id;
    const [r] = await pg.handle.db
      .insert(t.repos)
      .values({ workspaceId, owner: 'acme', name: 'persist', fullName: 'acme/persist' })
      .returning();
    const [pr] = await pg.handle.db
      .insert(t.pullRequests)
      .values({
        workspaceId,
        repoId: r!.id,
        number: 7,
        title: 't',
        author: 'a',
        branch: 'b',
        base: 'main',
        headSha: 'head-1',
        status: 'needs_review',
      })
      .returning();
    prId = pr!.id;
    repo = new ReviewRepository(pg.handle.db);
  });
  afterAll(async () => {
    await pg?.stop();
  });

  async function newRun(status: string) {
    const [run] = await pg.handle.db.insert(t.agentRuns).values({ workspaceId, prId, status }).returning();
    return run!.id;
  }

  function outcome(runId: string, findings: Finding[]) {
    return {
      review: {
        workspaceId,
        prId,
        agentId: null,
        runId,
        kind: 'review' as const,
        verdict: 'request_changes',
        summary: 's',
        score: 40,
        model: 'm',
      },
      findings,
      reviewedSha: 'head-1',
      complete: {
        status: 'done' as const,
        durationMs: 10,
        tokensIn: 1,
        tokensOut: 1,
        costUsd: null,
        findingsCount: findings.length,
        grounding: '1/1 passed',
        score: 40,
        blockers: 1,
        error: null,
      },
    };
  }

  async function reviewsOf(runId: string) {
    return pg.handle.db.select().from(t.reviews).where(eq(t.reviews.runId, runId));
  }
  async function statusOf(runId: string) {
    const [row] = await pg.handle.db.select().from(t.agentRuns).where(eq(t.agentRuns.id, runId));
    return row!.status;
  }

  it('saves the review, its findings and the done status together', async () => {
    const runId = await newRun('running');
    const saved = await repo.persistRunOutcome(outcome(runId, [FINDING]));
    expect(saved?.findings).toHaveLength(1);
    expect(await reviewsOf(runId)).toHaveLength(1);
    expect(await statusOf(runId)).toBe('done');
  });

  it('keeps nothing when writing the findings fails midway', async () => {
    const runId = await newRun('running');
    const broken = { ...FINDING, title: null as unknown as string };
    await expect(repo.persistRunOutcome(outcome(runId, [broken]))).rejects.toThrow();
    expect(await reviewsOf(runId)).toHaveLength(0);
    expect(await statusOf(runId)).toBe('running');
  });

  it('keeps nothing and leaves the run cancelled when it was cancelled first', async () => {
    const runId = await newRun('cancelled');
    expect(await repo.persistRunOutcome(outcome(runId, [FINDING]))).toBeNull();
    expect(await reviewsOf(runId)).toHaveLength(0);
    expect(await statusOf(runId)).toBe('cancelled');
  });
});
