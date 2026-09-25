import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { startPg, dockerAvailable, type PgFixture } from './helpers/pg.js';
import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';
import { loadConfig } from '../src/platform/config.js';
import { seed } from '../src/db/seed.js';
import * as t from '../src/db/schema.js';

const hasDocker = await dockerAvailable();
const d = hasDocker ? describe : describe.skip;

const config = () => loadConfig({ ...process.env, NODE_ENV: 'test' } as NodeJS.ProcessEnv);

d('run endpoints stay inside the caller workspace — SPEC-2026-09-25-security-hardening AC-12', () => {
  let pg: PgFixture;
  let app: FastifyInstance;
  let ownRunId: string;
  let foreignRunId: string;

  beforeAll(async () => {
    pg = await startPg();
    await seed(pg.handle.db);
    app = await buildApp({ config: config(), db: pg.handle.db });
    await app.ready();
    const [own] = await pg.handle.db.select().from(t.workspaces);
    const [foreign] = await pg.handle.db.insert(t.workspaces).values({ name: 'someone else' }).returning();
    const [ownRun] = await pg.handle.db
      .insert(t.agentRuns)
      .values({ workspaceId: own!.id, status: 'running' })
      .returning();
    const [foreignRun] = await pg.handle.db
      .insert(t.agentRuns)
      .values({ workspaceId: foreign!.id, status: 'running' })
      .returning();
    ownRunId = ownRun!.id;
    foreignRunId = foreignRun!.id;
    await pg.handle.db.insert(t.runTraces).values([
      { runId: ownRunId, trace: { run_id: ownRunId } },
      { runId: foreignRunId, trace: { run_id: foreignRunId } },
    ]);
  });
  afterAll(async () => {
    await app?.close();
    await pg?.stop();
  });

  async function statusOf(runId: string) {
    const [row] = await pg.handle.db.select().from(t.agentRuns).where(eq(t.agentRuns.id, runId));
    return row!.status;
  }

  it('reads the trace of its own run', async () => {
    const res = await app.inject({ method: 'GET', url: `/runs/${ownRunId}/trace` });
    expect(res.statusCode).toBe(200);
  });

  it("answers 404 for another workspace's trace", async () => {
    const res = await app.inject({ method: 'GET', url: `/runs/${foreignRunId}/trace` });
    expect(res.statusCode).toBe(404);
  });

  it("answers 404 when cancelling another workspace's run, and leaves it running", async () => {
    const res = await app.inject({ method: 'POST', url: `/runs/${foreignRunId}/cancel` });
    expect(res.statusCode).toBe(404);
    expect(await statusOf(foreignRunId)).toBe('running');
  });

  it('cancels its own run', async () => {
    const res = await app.inject({ method: 'POST', url: `/runs/${ownRunId}/cancel` });
    expect(res.statusCode).toBe(200);
    expect(await statusOf(ownRunId)).toBe('cancelled');
  });
});
