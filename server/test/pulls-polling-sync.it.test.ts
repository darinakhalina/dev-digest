import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { startPg, dockerAvailable, type PgFixture } from './helpers/pg.js';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/platform/config.js';
import { seed } from '../src/db/seed.js';
import { MockGitHubClient } from '../src/adapters/mocks.js';
import * as t from '../src/db/schema.js';

const hasDocker = await dockerAvailable();
const d = hasDocker ? describe : describe.skip;

const config = () => loadConfig({ ...process.env, NODE_ENV: 'test' } as NodeJS.ProcessEnv);

d('pulls/polling share one PR sync — SPEC-2026-09-25-onion-debt-cleared AC-1', () => {
  let pg: PgFixture;
  let workspaceId: string;
  let repoId: string;

  beforeAll(async () => {
    pg = await startPg();
    await seed(pg.handle.db);
    const [ws] = await pg.handle.db.select().from(t.workspaces);
    workspaceId = ws!.id;
    const [repo] = await pg.handle.db
      .insert(t.repos)
      .values({ workspaceId, owner: 'acme', name: 'sync', fullName: 'acme/sync' })
      .returning();
    repoId = repo!.id;
  });
  afterAll(async () => {
    await pg?.stop();
  });

  const github = new MockGitHubClient({
    pulls: [
      {
        number: 501,
        title: 'New PR',
        author: 'a',
        branch: 'b',
        base: 'main',
        head_sha: 'h1',
        additions: 0,
        deletions: 0,
        files_count: 0,
        status: 'open',
        opened_at: '2026-09-01T00:00:00Z',
        updated_at: '2026-09-01T00:00:00Z',
      },
    ],
  });

  async function storedOpenedAt() {
    const [row] = await pg.handle.db
      .select({ openedAt: t.pullRequests.openedAt })
      .from(t.pullRequests)
      .where(eq(t.pullRequests.repoId, repoId));
    return row?.openedAt ?? null;
  }

  it('records opened_at when a PR is synced through the manual poll endpoint', async () => {
    const app = await buildApp({ config: config(), db: pg.handle.db, overrides: { github } });
    const res = await app.inject({ method: 'POST', url: `/repos/${repoId}/poll` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ synced: 1, reviewTriggered: false });
    expect(await storedOpenedAt()).not.toBeNull();
    await app.close();
  });
});
