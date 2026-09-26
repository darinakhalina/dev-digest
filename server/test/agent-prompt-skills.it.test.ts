import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { startPg, dockerAvailable, type PgFixture } from './helpers/pg.js';
import { seed } from '../src/db/seed.js';
import * as t from '../src/db/schema.js';
import { AgentsRepository } from '../src/modules/agents/repository.js';
import { TiktokenTokenizer, approxTokens } from '../src/adapters/tokenizer/index.js';

const hasDocker = await dockerAvailable();
const d = hasDocker ? describe : describe.skip;

if (!hasDocker) {
  // eslint-disable-next-line no-console
  console.warn('[agent-prompt-skills] Docker not available — skipping integration tests.');
}

/**
 * SPEC-2026-09-26-agent-skills, server half: the SELECTION of skills that may
 * reach a model (AC-10/AC-11/AC-12) and the atomicity of replacing an agent's
 * set (AC-7). What the prompt does with the selection is pinned in
 * reviewer-core/test/prompt.test.ts.
 */
d('agents repository — skills that may reach a model', () => {
  let pg: PgFixture;
  let repo: AgentsRepository;
  let workspaceId: string;

  beforeAll(async () => {
    pg = await startPg();
    await seed(pg.handle.db);
    repo = new AgentsRepository(pg.handle.db);
    const [ws] = await pg.handle.db.select().from(t.workspaces);
    workspaceId = ws!.id;
  });
  afterAll(async () => {
    await pg?.stop();
  });

  async function makeSkill(
    name: string,
    source: 'manual' | 'imported_url' | 'extracted' | 'community',
    enabled: boolean,
  ): Promise<string> {
    const [row] = await pg.handle.db
      .insert(t.skills)
      .values({
        workspaceId,
        name,
        description: `${name} description`,
        type: 'rubric',
        source,
        body: `BODY OF ${name}`,
        enabled,
      })
      .returning({ id: t.skills.id });
    return row!.id;
  }

  async function makeAgent(name: string): Promise<string> {
    const row = await repo.insert({
      workspaceId,
      name,
      provider: 'openai',
      model: 'gpt-4o-mini',
      systemPrompt: 'Review the diff.',
    });
    return row.id;
  }

  it('AC-10/AC-11 — selects enabled skills in stored order and drops disabled ones', async () => {
    const agentId = await makeAgent('Selector');
    const first = await makeSkill('first', 'manual', true);
    const off = await makeSkill('off', 'manual', false);
    const last = await makeSkill('last', 'manual', true);
    await repo.setSkills(agentId, [first, off, last]);

    const selected = await repo.promptSkills(agentId);
    expect(selected.map((s) => s.body)).toEqual(['BODY OF first', 'BODY OF last']);
    expect(selected.map((s) => s.order)).toEqual([0, 2]);
  });

  it('AC-11 — the disabled skill is still ATTACHED; only the selection excludes it', async () => {
    const agentId = await makeAgent('Attachment view');
    const on = await makeSkill('on', 'manual', true);
    const off = await makeSkill('also-off', 'manual', false);
    await repo.setSkills(agentId, [on, off]);

    expect((await repo.linkedSkills(agentId)).map((l) => l.skill.name)).toEqual([
      'on',
      'also-off',
    ]);
    expect((await repo.promptSkills(agentId)).map((s) => s.body)).toEqual(['BODY OF on']);
  });

  it('AC-11 — two readers of the selection get the same set', async () => {
    const agentId = await makeAgent('Two readers');
    await repo.setSkills(agentId, [
      await makeSkill('shared-on', 'manual', true),
      await makeSkill('shared-off', 'community', false),
    ]);
    const [a, b] = await Promise.all([repo.promptSkills(agentId), repo.promptSkills(agentId)]);
    expect(a).toEqual(b);
    expect(a).toHaveLength(1);
  });

  it('AC-12 — only a manually authored skill is trusted; every import is not', async () => {
    const agentId = await makeAgent('Trust');
    await repo.setSkills(agentId, [
      await makeSkill('hand-written', 'manual', true),
      await makeSkill('from-url', 'imported_url', true),
      await makeSkill('extracted-one', 'extracted', true),
      await makeSkill('community-one', 'community', true),
    ]);

    expect((await repo.promptSkills(agentId)).map((s) => s.trusted)).toEqual([
      true,
      false,
      false,
      false,
    ]);
  });

  it('AC-7 — a failed replacement leaves the previous set intact, never an empty one', async () => {
    const agentId = await makeAgent('Atomic');
    const keep = await makeSkill('keep-me', 'manual', true);
    await repo.setSkills(agentId, [keep]);

    const missing = '00000000-0000-0000-0000-000000000000';
    await expect(repo.setSkills(agentId, [keep, missing])).rejects.toThrow();

    expect((await repo.linkedSkills(agentId)).map((l) => l.skill.id)).toEqual([keep]);
  });

  it('AC-7 — a successful replacement still replaces the whole set, in the new order', async () => {
    const agentId = await makeAgent('Replace');
    const a = await makeSkill('a', 'manual', true);
    const b = await makeSkill('b', 'manual', true);
    await repo.setSkills(agentId, [a, b]);
    await repo.setSkills(agentId, [b]);

    expect((await repo.linkedSkills(agentId)).map((l) => l.skill.id)).toEqual([b]);
  });

  it('AC-15 — an agent whose every skill is disabled selects nothing at all', async () => {
    const agentId = await makeAgent('All off');
    await repo.setSkills(agentId, [await makeSkill('quiet', 'manual', false)]);
    expect(await repo.promptSkills(agentId)).toEqual([]);
  });

  it('AC-9 — deleting a skill detaches it without deleting the agent', async () => {
    const agentId = await makeAgent('Survivor');
    const doomed = await makeSkill('doomed', 'manual', true);
    await repo.setSkills(agentId, [doomed]);
    await pg.handle.db.delete(t.skills).where(eq(t.skills.id, doomed));

    expect(await repo.promptSkills(agentId)).toEqual([]);
    expect(await repo.getById(workspaceId, agentId)).toBeDefined();
  });
});

/**
 * AC-14 — the skills block's cost is counted with the repo's real tokenizer,
 * the same one repo-intel budgets the repo map with, not `length / 4`.
 */
describe('skills token accounting', () => {
  it('counts real BPE tokens, not a character heuristic', () => {
    const block = '## Severity rubric\n- A missing null check on a public entry point is major.';
    const counted = new TiktokenTokenizer().count(block);

    expect(counted).toBeGreaterThan(0);
    expect(counted).not.toBe(approxTokens(block));
  });
});
