import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { SkillSource, SkillType } from '@devdigest/shared';
import { getContext } from '../_shared/context.js';
import { IdParams } from '../_shared/schemas.js';
import { NotFoundError } from '../../platform/errors.js';
import { SkillsService } from './service.js';

const CreateSkillBody = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: SkillType.optional(),
  source: SkillSource.optional(),
  body: z.string().min(1),
  enabled: z.boolean().optional(),
});

const UpdateSkillBody = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  type: SkillType.optional(),
  source: SkillSource.optional(),
  body: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
});

const RestoreSkillBody = z.object({
  version: z.number().int().positive(),
});

const ImportSkillBody = z.object({
  filename: z.string().min(1),
  content_base64: z.string().min(1),
});

const ImportSkillUrlBody = z.object({
  url: z.string().min(1).max(2048),
});

const AcceptRiskBody = z.object({
  accepted: z.literal(true),
});

/**
 * GET    /skills          list (workspace-scoped)
 * POST   /skills          create
 * POST   /skills/import   parse a file into a preview — stores nothing
 * GET    /skills/:id      one skill
 * PUT    /skills/:id      update
 * DELETE /skills/:id      delete
 */
export default async function skillsRoutes(appBase: FastifyInstance) {
  const app = appBase.withTypeProvider<ZodTypeProvider>();
  const service = new SkillsService(app.container);

  app.get('/skills', async (req) => {
    const { workspaceId } = await getContext(app.container, req);
    return service.list(workspaceId);
  });

  app.post('/skills', { schema: { body: CreateSkillBody } }, async (req, reply) => {
    const { workspaceId } = await getContext(app.container, req);
    const skill = await service.create(workspaceId, req.body);
    reply.status(201);
    return skill;
  });

  app.post('/skills/import', { schema: { body: ImportSkillBody } }, async (req) => {
    await getContext(app.container, req);
    return service.importPreview(req.body.filename, req.body.content_base64);
  });

  app.post('/skills/import-url', { schema: { body: ImportSkillUrlBody } }, async (req) => {
    await getContext(app.container, req);
    return service.importUrlPreview(req.body.url);
  });

  app.post(
    '/skills/:id/accept-risk',
    { schema: { params: IdParams, body: AcceptRiskBody } },
    async (req) => {
      const { workspaceId, userId } = await getContext(app.container, req);
      const skill = await service.acceptRisk(workspaceId, req.params.id, userId);
      if (!skill) throw new NotFoundError('Skill not found');
      return skill;
    },
  );

  app.get('/skills/:id', { schema: { params: IdParams } }, async (req) => {
    const { workspaceId } = await getContext(app.container, req);
    const skill = await service.get(workspaceId, req.params.id);
    if (!skill) throw new NotFoundError('Skill not found');
    return skill;
  });

  app.get('/skills/:id/versions', { schema: { params: IdParams } }, async (req) => {
    const { workspaceId } = await getContext(app.container, req);
    const versions = await service.versions(workspaceId, req.params.id);
    if (!versions) throw new NotFoundError('Skill not found');
    return versions;
  });

  app.post(
    '/skills/:id/restore',
    { schema: { params: IdParams, body: RestoreSkillBody } },
    async (req) => {
      const { workspaceId } = await getContext(app.container, req);
      const skill = await service.restore(workspaceId, req.params.id, req.body.version);
      if (!skill) throw new NotFoundError('Skill not found');
      return skill;
    },
  );

  app.put('/skills/:id', { schema: { params: IdParams, body: UpdateSkillBody } }, async (req) => {
    const { workspaceId } = await getContext(app.container, req);
    const skill = await service.update(workspaceId, req.params.id, req.body);
    if (!skill) throw new NotFoundError('Skill not found');
    return skill;
  });

  app.delete('/skills/:id', { schema: { params: IdParams } }, async (req) => {
    const { workspaceId } = await getContext(app.container, req);
    const ok = await service.delete(workspaceId, req.params.id);
    if (!ok) throw new NotFoundError('Skill not found');
    return { ok: true };
  });
}
