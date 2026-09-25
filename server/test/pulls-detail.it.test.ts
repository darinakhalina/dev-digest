import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { startPg, dockerAvailable, type PgFixture } from './helpers/pg.js';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/platform/config.js';
import { seed } from '../src/db/seed.js';
import { MockGitHubClient } from '../src/adapters/mocks.js';
import type { GitHubClient } from '@devdigest/shared';
import * as t from '../src/db/schema.js';

const hasDocker = await dockerAvailable();
const d = hasDocker ? describe : describe.skip;

const config = () => loadConfig({ ...process.env, NODE_ENV: 'test' } as NodeJS.ProcessEnv);

d('GET /pulls/:id refresh — SPEC-2026-09-25-run-reliability', () => {
  let pg: PgFixture;
  let prId: string;

  beforeAll(async () => {
    pg = await startPg();
    await seed(pg.handle.db);
    const [ws] = await pg.handle.db.select().from(t.workspaces);
    const [repo] = await pg.handle.db
      .insert(t.repos)
      .values({ workspaceId: ws!.id, owner: 'acme', name: 'detail', fullName: 'acme/detail' })
      .returning();
    const [pr] = await pg.handle.db
      .insert(t.pullRequests)
      .values({
        workspaceId: ws!.id,
        repoId: repo!.id,
        number: 9,
        title: 't',
        author: 'a',
        branch: 'b',
        base: 'main',
        headSha: 'h',
        status: 'open',
      })
      .returning();
    prId = pr!.id;
    await pg.handle.db.insert(t.prFiles).values({ prId, path: 'kept.ts', additions: 1, deletions: 0, patch: '@@' });
  });
  afterAll(async () => {
    await pg?.stop();
  });

  async function storedPaths() {
    const rows = await pg.handle.db.select().from(t.prFiles).where(eq(t.prFiles.prId, prId));
    return rows.map((r) => r.path).sort();
  }

  async function get(github: GitHubClient) {
    const app = await buildApp({ config: config(), db: pg.handle.db, overrides: { github } });
    const res = await app.inject({ method: 'GET', url: `/pulls/${prId}` });
    await app.close();
    return res;
  }

  it('keeps the stored files when writing the fresh ones fails, and reports the failure', async () => {
    const broken = new MockGitHubClient({
      detail: { files: [{ path: null as unknown as string, additions: 1, deletions: 0, patch: '' }] },
    });
    const res = await get(broken);
    expect(res.statusCode).toBe(500);
    expect(await storedPaths()).toEqual(['kept.ts']);
  });

  it('serves the stored detail when GitHub is unreachable', async () => {
    const offline = new MockGitHubClient();
    offline.getPullRequest = async () => {
      throw new Error('offline');
    };
    const res = await get(offline);
    expect(res.statusCode).toBe(200);
    expect(res.json().files.map((f: { path: string }) => f.path)).toEqual(['kept.ts']);
  });

  it('replaces the stored files with the fresh ones', async () => {
    const res = await get(new MockGitHubClient());
    expect(res.statusCode).toBe(200);
    expect(await storedPaths()).toEqual(['src/config.ts']);
  });
});
