import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { strToU8, zipSync } from 'fflate';
import { startPg, dockerAvailable, type PgFixture } from './helpers/pg.js';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/platform/config.js';
import { seed } from '../src/db/seed.js';
import * as t from '../src/db/schema.js';

const hasDocker = await dockerAvailable();
const d = hasDocker ? describe : describe.skip;

if (!hasDocker) {
  // eslint-disable-next-line no-console
  console.warn('[skills] Docker not available — skipping integration tests.');
}

const config = () => loadConfig({ ...process.env, NODE_ENV: 'test' } as NodeJS.ProcessEnv);

d('skills CRUD + import — SPEC-2026-09-26-agent-skills', () => {
  let pg: PgFixture;
  let app: FastifyInstance;
  let ownWorkspaceId: string;
  let foreignWorkspaceId: string;

  beforeAll(async () => {
    pg = await startPg();
    await seed(pg.handle.db);
    app = await buildApp({ config: config(), db: pg.handle.db });
    await app.ready();
    const [own] = await pg.handle.db.select().from(t.workspaces);
    ownWorkspaceId = own!.id;
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

  const newSkill = {
    name: 'Severity Rubric',
    description: 'What each severity means and when it applies.',
    type: 'rubric' as const,
    body: 'CRITICAL = data loss or auth bypass.',
  };

  async function create(payload: Record<string, unknown> = newSkill) {
    return app.inject({ method: 'POST', url: '/skills', payload });
  }

  it('AC-1 — a created skill comes back in the list', async () => {
    const created = await create();
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      name: 'Severity Rubric',
      type: 'rubric',
      source: 'manual',
      enabled: true,
      version: 1,
    });

    const listed = await app.inject({ method: 'GET', url: '/skills' });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().map((s: { id: string }) => s.id)).toContain(created.json().id);
  });

  it('AC-1 — a create writes the skill and its first version together', async () => {
    const id = (await create()).json().id as string;
    const versions = await pg.handle.db
      .select()
      .from(t.skillVersions)
      .where(eq(t.skillVersions.skillId, id));
    expect(versions).toHaveLength(1);
    expect(versions[0]).toMatchObject({ version: 1, body: newSkill.body });
  });

  it('AC-2 — a fifth type is rejected and nothing is stored', async () => {
    const before = (await app.inject({ method: 'GET', url: '/skills' })).json().length;
    const res = await create({ ...newSkill, type: 'vibes' });
    expect(res.statusCode).toBe(422);
    const after = (await app.inject({ method: 'GET', url: '/skills' })).json().length;
    expect(after).toBe(before);
  });

  it('AC-3 — an edited body is what the next read returns', async () => {
    const id = (await create()).json().id as string;
    const updated = await app.inject({
      method: 'PUT',
      url: `/skills/${id}`,
      payload: { body: 'CRITICAL = data loss, auth bypass or secret exposure.' },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({ version: 2 });

    const read = await app.inject({ method: 'GET', url: `/skills/${id}` });
    expect(read.json().body).toBe('CRITICAL = data loss, auth bypass or secret exposure.');
  });

  it('AC-4 — a skill in another workspace reads as not-found, not as an empty success', async () => {
    const [foreignSkill] = await pg.handle.db
      .insert(t.skills)
      .values({
        workspaceId: foreignWorkspaceId,
        name: 'Their Rubric',
        description: 'theirs',
        type: 'rubric',
        source: 'manual',
        body: 'not yours',
      })
      .returning();

    const read = await app.inject({ method: 'GET', url: `/skills/${foreignSkill!.id}` });
    expect(read.statusCode).toBe(404);
    expect(read.json().error.code).toBe('not_found');

    const updated = await app.inject({
      method: 'PUT',
      url: `/skills/${foreignSkill!.id}`,
      payload: { body: 'rewritten' },
    });
    expect(updated.statusCode).toBe(404);

    const deleted = await app.inject({ method: 'DELETE', url: `/skills/${foreignSkill!.id}` });
    expect(deleted.statusCode).toBe(404);

    const [stillThere] = await pg.handle.db
      .select()
      .from(t.skills)
      .where(eq(t.skills.id, foreignSkill!.id));
    expect(stillThere?.body).toBe('not yours');

    const listed = await app.inject({ method: 'GET', url: '/skills' });
    expect(listed.json().map((s: { id: string }) => s.id)).not.toContain(foreignSkill!.id);
  });

  it('AC-9 — deleting a skill unlinks it from its agents and leaves them alive', async () => {
    const skillId = (await create()).json().id as string;
    const agentId = (
      await app.inject({
        method: 'POST',
        url: '/agents',
        payload: {
          name: 'Test Quality Reviewer',
          provider: 'openai',
          model: 'gpt-4o-mini',
          system_prompt: 'Review the tests.',
        },
      })
    ).json().id as string;

    const linked = await app.inject({
      method: 'POST',
      url: `/agents/${agentId}/skills`,
      payload: { skill_ids: [skillId] },
    });
    expect(linked.statusCode).toBe(200);

    const deleted = await app.inject({ method: 'DELETE', url: `/skills/${skillId}` });
    expect(deleted.statusCode).toBe(200);

    const agent = await app.inject({ method: 'GET', url: `/agents/${agentId}` });
    expect(agent.statusCode).toBe(200);
    const skillsOfAgent = await app.inject({ method: 'GET', url: `/agents/${agentId}/skills` });
    expect(skillsOfAgent.json()).toEqual([]);
  });

  it('AC-16/AC-18 — an import returns a preview and stores nothing', async () => {
    const before = (await app.inject({ method: 'GET', url: '/skills' })).json().length;
    const res = await app.inject({
      method: 'POST',
      url: '/skills/import',
      payload: {
        filename: 'imported.md',
        content_base64: Buffer.from('# Imported Rubric\n\nbody\n').toString('base64'),
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      name: 'Imported Rubric',
      source: 'imported_url',
      type: 'custom',
      ignored_files: [],
    });

    const after = await app.inject({ method: 'GET', url: '/skills' });
    expect(after.json().length).toBe(before);
    expect(after.json().map((s: { name: string }) => s.name)).not.toContain('Imported Rubric');
  });

  it('AC-17 — an archive preview carries only the skill document and names what it ignored', async () => {
    const archive = zipSync({
      'SKILL.md': strToU8('# Archived Skill\n\nrule\n'),
      'install.sh': strToU8('rm -rf /'),
    });
    const res = await app.inject({
      method: 'POST',
      url: '/skills/import',
      payload: {
        filename: 'skill.zip',
        content_base64: Buffer.from(archive).toString('base64'),
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().body).not.toContain('rm -rf');
    expect(res.json().ignored_files).toEqual(['install.sh']);
  });

  it('AC-21 — an unsupported file is refused with the accepted kinds', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/skills/import',
      payload: {
        filename: 'payload.exe',
        content_base64: Buffer.from('MZ').toString('base64'),
      },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().error.message).toContain('.zip');
  });

  it('AC-20 — a confirmed import stores a disabled, import-sourced skill', async () => {
    const preview = (
      await app.inject({
        method: 'POST',
        url: '/skills/import',
        payload: {
          filename: 'stranger.md',
          content_base64: Buffer.from("# Stranger's Rule\n\ntrust nothing\n").toString('base64'),
        },
      })
    ).json();

    const stored = await create({ ...preview, enabled: false });
    expect(stored.statusCode).toBe(201);
    expect(stored.json()).toMatchObject({
      name: "Stranger's Rule",
      source: 'imported_url',
      enabled: false,
    });
  });

  it('/skills/import is routed before /skills/:id', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/skills/import',
      payload: { filename: 'x.md', content_base64: Buffer.from('# X\n').toString('base64') },
    });
    expect(res.statusCode).not.toBe(404);
    expect(res.statusCode).toBe(200);
  });

  it('every stored skill belongs to the caller workspace', async () => {
    const id = (await create()).json().id as string;
    const [row] = await pg.handle.db.select().from(t.skills).where(eq(t.skills.id, id));
    expect(row?.workspaceId).toBe(ownWorkspaceId);
  });
});
