import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { startPg, dockerAvailable, type PgFixture } from './helpers/pg.js';
import { seed } from '../src/db/seed.js';
import * as t from '../src/db/schema.js';
import { JobRunner } from '../src/platform/jobs.js';

const hasDocker = await dockerAvailable();
const d = hasDocker ? describe : describe.skip;

d('JobRunner — SPEC-2026-09-25-run-reliability', () => {
  let pg: PgFixture;
  let workspaceId: string;

  beforeAll(async () => {
    pg = await startPg();
    await seed(pg.handle.db);
    const [ws] = await pg.handle.db.select().from(t.workspaces);
    workspaceId = ws!.id;
  });
  afterAll(async () => {
    await pg?.stop();
  });

  async function row(id: string) {
    const [r] = await pg.handle.db.select().from(t.jobs).where(eq(t.jobs.id, id));
    return r!;
  }

  it('records how many attempts a job took', async () => {
    const jobs = new JobRunner(pg.handle.db, { retries: 2 });
    let calls = 0;
    jobs.register('flaky', z.object({}), async () => {
      calls += 1;
      if (calls === 1) throw Object.assign(new Error('503'), { status: 503 });
    });
    const job = await jobs.enqueue(workspaceId, 'flaky', {});
    await job.done;
    const r = await row(job.id);
    expect(r.status).toBe('done');
    expect(r.attempts).toBe(2);
  });

  it('rejects a payload that fails its schema, before writing any row', async () => {
    const jobs = new JobRunner(pg.handle.db);
    jobs.register('typed', z.object({ repoId: z.string() }), async () => undefined);
    await expect(jobs.enqueue(workspaceId, 'typed', { repoId: 42 })).rejects.toThrow();
    const rows = await pg.handle.db.select().from(t.jobs).where(eq(t.jobs.kind, 'typed'));
    expect(rows).toHaveLength(0);
  });

  it('aborts the handler when the job times out', async () => {
    const jobs = new JobRunner(pg.handle.db, { timeoutMs: 50, retries: 0 });
    let aborted = false;
    jobs.register('slow', z.object({}), (_payload, { signal }) => {
      signal.addEventListener('abort', () => {
        aborted = true;
      });
      return new Promise(() => undefined);
    });
    const job = await jobs.enqueue(workspaceId, 'slow', {});
    await expect(job.done).rejects.toThrow(/timed out/);
    expect(aborted).toBe(true);
    expect((await row(job.id)).status).toBe('failed');
  });

  it('marks jobs left queued or running by a dead process as interrupted', async () => {
    const [left] = await pg.handle.db
      .insert(t.jobs)
      .values({ workspaceId, kind: 'clone', payload: {}, status: 'running' })
      .returning();
    const jobs = new JobRunner(pg.handle.db);
    expect(await jobs.reapInterrupted()).toBeGreaterThanOrEqual(1);
    const r = await row(left!.id);
    expect(r.status).toBe('failed');
    expect(r.error).toMatch(/restart/);
  });
});
