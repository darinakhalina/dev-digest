import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { startPg, dockerAvailable, type PgFixture } from './helpers/pg.js';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/platform/config.js';
import { seed } from '../src/db/seed.js';
import * as t from '../src/db/schema.js';
import { MockGitClient, MockGitHubClient } from '../src/adapters/mocks.js';

const hasDocker = await dockerAvailable();
const d = hasDocker ? describe : describe.skip;

if (!hasDocker) {
  // eslint-disable-next-line no-console
  console.warn('[agent-skill-counts] Docker not available — skipping integration tests.');
}

d('agent.skill_count / skill.agent_count', () => {
  let pg: PgFixture;
  let app: FastifyInstance;
  let foreignWorkspaceId: string;

  beforeAll(async () => {
    pg = await startPg();
    await seed(pg.handle.db);
    const config = loadConfig({ ...process.env, NODE_ENV: 'test' } as NodeJS.ProcessEnv);
    app = await buildApp({
      config,
      db: pg.handle.db,
      overrides: { git: new MockGitClient(), github: new MockGitHubClient() },
    });
    await app.ready();
    const [foreign] = await pg.handle.db
      .insert(t.workspaces)
      .values({ name: 'another tenant' })
      .returning();
    foreignWorkspaceId = foreign!.id;
  });
  afterAll(async () => {
    await app?.close();
    await pg?.stop();
  });

  async function newAgent(name: string): Promise<string> {
    const res = await app.inject({
      method: 'POST',
      url: '/agents',
      payload: { name, provider: 'openai', model: 'gpt-4o-mini', system_prompt: 'Review.' },
    });
    expect(res.statusCode).toBe(201);
    return res.json().id as string;
  }

  async function newSkill(name: string): Promise<string> {
    const res = await app.inject({
      method: 'POST',
      url: '/skills',
      payload: { name, description: name, type: 'custom', body: 'Rule.' },
    });
    expect(res.statusCode).toBe(201);
    return res.json().id as string;
  }

  async function getAgent(id: string) {
    const res = await app.inject({ method: 'GET', url: `/agents/${id}` });
    expect(res.statusCode).toBe(200);
    return res.json();
  }

  it('a fresh agent reports no skills, and each attach raises the count', async () => {
    const agentId = await newAgent('Counting Agent');
    expect((await getAgent(agentId)).skill_count).toBe(0);

    const first = await newSkill('count-one');
    const second = await newSkill('count-two');

    await app.inject({
      method: 'POST',
      url: `/agents/${agentId}/skills`,
      payload: { skill_ids: [first, second] },
    });

    expect((await getAgent(agentId)).skill_count).toBe(2);

    const listed = (await app.inject({ method: 'GET', url: '/agents' })).json() as Array<{
      id: string;
      skill_count: number;
    }>;
    expect(listed.find((a) => a.id === agentId)?.skill_count).toBe(2);
  });

  it('detaching a skill lowers the count on both sides', async () => {
    const agentId = await newAgent('Detaching Agent');
    const skillId = await newSkill('count-three');

    await app.inject({
      method: 'POST',
      url: `/agents/${agentId}/skills`,
      payload: { skill_ids: [skillId] },
    });
    expect((await getAgent(agentId)).skill_count).toBe(1);

    const attached = (await app.inject({ method: 'GET', url: `/skills/${skillId}` })).json();
    expect(attached.agent_count).toBe(1);

    await app.inject({
      method: 'POST',
      url: `/agents/${agentId}/skills`,
      payload: { skill_ids: [] },
    });

    expect((await getAgent(agentId)).skill_count).toBe(0);
    expect((await app.inject({ method: 'GET', url: `/skills/${skillId}` })).json().agent_count).toBe(
      0,
    );
  });

  it('an updated agent still reports the skills it already had', async () => {
    const agentId = await newAgent('Renamed Agent');
    const skillId = await newSkill('count-four');
    await app.inject({
      method: 'POST',
      url: `/agents/${agentId}/skills`,
      payload: { skill_ids: [skillId] },
    });

    const updated = await app.inject({
      method: 'PUT',
      url: `/agents/${agentId}`,
      payload: { description: 'Now with a description' },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().skill_count).toBe(1);
  });

  it('a link owned by another workspace is not counted', async () => {
    const agentId = await newAgent('Own Workspace Agent');
    const skillId = await newSkill('count-five');

    const [foreignAgent] = await pg.handle.db
      .insert(t.agents)
      .values({
        workspaceId: foreignWorkspaceId,
        name: 'Foreign Agent',
        provider: 'openai',
        model: 'gpt-4o-mini',
        systemPrompt: 'Review.',
      })
      .returning();
    await pg.handle.db
      .insert(t.agentSkills)
      .values({ agentId: foreignAgent!.id, skillId, order: 0 });

    expect((await getAgent(agentId)).skill_count).toBe(0);
    expect((await app.inject({ method: 'GET', url: `/skills/${skillId}` })).json().agent_count).toBe(
      0,
    );

    const listed = (await app.inject({ method: 'GET', url: '/agents' })).json() as Array<{
      id: string;
    }>;
    expect(listed.some((a) => a.id === foreignAgent!.id)).toBe(false);
  });
});
