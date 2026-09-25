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
  let ownWorkspaceId: string;

  beforeAll(async () => {
    pg = await startPg();
    await seed(pg.handle.db);
    app = await buildApp({ config: config(), db: pg.handle.db });
    await app.ready();
    const [own] = await pg.handle.db.select().from(t.workspaces);
    ownWorkspaceId = own!.id;
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
    const trace = {
      config: { agent: 'a', model: 'm', source: 'local' },
      stats: { duration_ms: 1, tokens_in: 1, tokens_out: 1, findings: 0, grounding: '0/0 passed' },
      prompt_assembly: { system: 's', user: 'u' },
      tool_calls: [],
      raw_output: '',
      memory_pulled: [],
      specs_read: [],
      log: [],
    };
    await pg.handle.db.insert(t.runTraces).values([
      { runId: ownRunId, trace },
      { runId: foreignRunId, trace },
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

  it('answers 404 for the event stream of an unknown or foreign run', async () => {
    const unknown = await app.inject({ method: 'GET', url: '/runs/00000000-0000-4000-8000-000000000000/events' });
    expect(unknown.statusCode).toBe(404);
    const foreign = await app.inject({ method: 'GET', url: `/runs/${foreignRunId}/events` });
    expect(foreign.statusCode).toBe(404);
  });

  it('ends the event stream of a run that is no longer live instead of holding it open', async () => {
    const [finished] = await pg.handle.db
      .insert(t.agentRuns)
      .values({ workspaceId: ownWorkspaceId, status: 'done' })
      .returning();
    const res = await app.inject({ method: 'GET', url: `/runs/${finished!.id}/events` });
    expect(res.statusCode).toBe(200);
  });
});
