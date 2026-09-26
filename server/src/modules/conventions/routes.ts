import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  ConventionSkillProposalRequest,
  CreateSkillFromConventionsRequest,
  UpdateConventionRequest,
} from '@devdigest/shared';
import { getContext } from '../_shared/context.js';
import { IdParams } from '../_shared/schemas.js';
import { CloneSampleProvider } from './samples.js';
import { ConventionsService } from './service.js';

const ConventionParams = z.object({
  id: z.string().uuid(),
  conventionId: z.string().uuid(),
});

export default async function conventionsRoutes(appBase: FastifyInstance) {
  const app = appBase.withTypeProvider<ZodTypeProvider>();
  const container = app.container;

  const service = new ConventionsService({
    repo: container.conventionsRepo,
    repos: container.repos,
    samples: new CloneSampleProvider({
      repoIntel: container.repoIntel,
      git: container.git,
    }),
    skills: container.skills,
    resolveModel: (workspaceId) => container.featureModel(workspaceId, 'conventions'),
    llm: (provider) => container.llm(provider),
  });

  app.get('/repos/:id/conventions', { schema: { params: IdParams } }, async (req) => {
    const { workspaceId } = await getContext(container, req);
    return service.list(workspaceId, req.params.id);
  });

  app.post('/repos/:id/conventions/extract', { schema: { params: IdParams } }, async (req) => {
    const { workspaceId } = await getContext(container, req);
    return service.extract(workspaceId, req.params.id);
  });

  app.patch(
    '/repos/:id/conventions/:conventionId',
    { schema: { params: ConventionParams, body: UpdateConventionRequest } },
    async (req) => {
      const { workspaceId } = await getContext(container, req);
      return service.patch(workspaceId, req.params.id, req.params.conventionId, req.body);
    },
  );

  app.post(
    '/repos/:id/conventions/skill/proposal',
    { schema: { params: IdParams, body: ConventionSkillProposalRequest } },
    async (req) => {
      const { workspaceId } = await getContext(container, req);
      return service.propose(
        workspaceId,
        req.params.id,
        req.body.convention_ids,
        req.body.name,
      );
    },
  );

  app.post(
    '/repos/:id/conventions/skill',
    { schema: { params: IdParams, body: CreateSkillFromConventionsRequest } },
    async (req, reply) => {
      const { workspaceId } = await getContext(container, req);
      const skill = await service.createSkill(workspaceId, req.params.id, {
        conventionIds: req.body.convention_ids,
        name: req.body.name,
        description: req.body.description,
        type: req.body.type,
        enabled: req.body.enabled,
        body: req.body.body,
      });
      reply.status(201);
      return skill;
    },
  );
}
