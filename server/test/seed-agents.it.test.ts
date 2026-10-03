import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { startPg, dockerAvailable, type PgFixture } from './helpers/pg.js';
import { seed, DEFAULT_MODEL, DEFAULT_PROVIDER } from '../src/db/seed.js';
import * as t from '../src/db/schema.js';
import { SEED_AGENT_SKILLS } from '../src/db/seed-skills.js';

const hasDocker = await dockerAvailable();
const d = hasDocker ? describe : describe.skip;

if (!hasDocker) {
  // eslint-disable-next-line no-console
  console.warn('[seed-agents] Docker not available — skipping integration tests.');
}

const AGENT = 'Test Quality Reviewer';

d('seed — the Test Quality Reviewer and its skills', () => {
  let pg: PgFixture;
  let workspaceId: string;

  beforeAll(async () => {
    pg = await startPg();
    ({ workspaceId } = await seed(pg.handle.db));
  });
  afterAll(async () => {
    await pg?.stop();
  });

  async function agentRow() {
    const [row] = await pg.handle.db
      .select()
      .from(t.agents)
      .where(and(eq(t.agents.workspaceId, workspaceId), eq(t.agents.name, AGENT)));
    return row;
  }

  it('seeds the agent on the workspace default provider and model', async () => {
    const agent = await agentRow();
    expect(agent).toBeDefined();
    expect(agent!.provider).toBe(DEFAULT_PROVIDER);
    expect(agent!.model).toBe(DEFAULT_MODEL);
    expect(agent!.enabled).toBe(true);
  });

  it('gives it a prompt about tests, not a general review prompt', async () => {
    const agent = await agentRow();
    expect(agent!.systemPrompt).toMatch(/would a test in this diff fail/i);
    expect(agent!.systemPrompt).toContain('# Severity');
    expect(agent!.systemPrompt).toContain('# Do NOT flag');
  });

  async function orderedLinks(agentId: string) {
    return pg.handle.db
      .select({ name: t.skills.name, order: t.agentSkills.order })
      .from(t.agentSkills)
      .innerJoin(t.skills, eq(t.skills.id, t.agentSkills.skillId))
      .where(eq(t.agentSkills.agentId, agentId))
      .orderBy(t.agentSkills.order);
  }

  it('attaches its skills in the declared order, with the positions actually stored', async () => {
    const agent = await agentRow();
    const links = await orderedLinks(agent!.id);

    expect(links.map((l) => l.name)).toEqual(SEED_AGENT_SKILLS[AGENT]);
    expect(links.map((l) => l.order)).toEqual([0, 1, 2]);
  });

  it('re-seeding the same database duplicates nothing and keeps the same rows', async () => {
    const before = await agentRow();
    await seed(pg.handle.db);

    const agents = await pg.handle.db
      .select()
      .from(t.agents)
      .where(and(eq(t.agents.workspaceId, workspaceId), eq(t.agents.name, AGENT)));
    expect(agents).toHaveLength(1);
    expect(agents[0]!.id, 'the agent row was replaced, not kept').toBe(before!.id);

    const links = await orderedLinks(agents[0]!.id);
    expect(links.map((l) => l.name)).toEqual(SEED_AGENT_SKILLS[AGENT]);
    expect(links.map((l) => l.order)).toEqual([0, 1, 2]);

    for (const name of SEED_AGENT_SKILLS[AGENT]!) {
      const rows = await pg.handle.db
        .select()
        .from(t.skills)
        .where(and(eq(t.skills.workspaceId, workspaceId), eq(t.skills.name, name)));
      expect(rows, `skill ${name}`).toHaveLength(1);
    }
  });
});
