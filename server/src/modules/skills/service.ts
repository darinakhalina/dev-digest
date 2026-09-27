import type { Skill, SkillImportPreview, SkillVersion } from '@devdigest/shared';
import type { Container } from '../../platform/container.js';
import type { SkillsRepository } from './repository.js';
import { toSkillDto, toSkillVersionDto } from './helpers.js';
import { parseSkillImport } from './domain.js';
import { DEFAULT_SKILL_SOURCE, DEFAULT_SKILL_TYPE, MAX_IMPORT_BYTES } from './constants.js';
import { ValidationError } from '../../platform/errors.js';
import type { CreateSkillInput, SkillAuthoring, UpdateSkillInput } from './types.js';

export type { CreateSkillInput, UpdateSkillInput } from './types.js';


export class SkillsService implements SkillAuthoring {
  private repo: SkillsRepository;

  constructor(container: Container) {
    this.repo = container.skillsRepo;
  }

  async list(workspaceId: string): Promise<Skill[]> {
    const rows = await this.repo.list(workspaceId);
    const counts = await this.repo.agentCounts(rows.map((r) => r.id));
    return rows.map((row) => toSkillDto(row, counts.get(row.id) ?? 0));
  }

  async get(workspaceId: string, id: string): Promise<Skill | undefined> {
    const row = await this.repo.getById(workspaceId, id);
    if (!row) return undefined;
    const counts = await this.repo.agentCounts([row.id]);
    return toSkillDto(row, counts.get(row.id) ?? 0);
  }

  async versions(workspaceId: string, id: string): Promise<SkillVersion[] | undefined> {
    const row = await this.repo.getById(workspaceId, id);
    if (!row) return undefined;
    const rows = await this.repo.versions(row.id);
    return rows.map(toSkillVersionDto);
  }

  async create(workspaceId: string, input: CreateSkillInput): Promise<Skill> {
    const row = await this.repo.insert({
      workspaceId,
      name: input.name,
      description: input.description ?? '',
      type: input.type ?? DEFAULT_SKILL_TYPE,
      source: input.source ?? DEFAULT_SKILL_SOURCE,
      body: input.body,
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      ...(input.evidenceFiles !== undefined ? { evidenceFiles: input.evidenceFiles } : {}),
    });
    return toSkillDto(row);
  }

  async update(
    workspaceId: string,
    id: string,
    patch: UpdateSkillInput,
  ): Promise<Skill | undefined> {
    const row = await this.repo.update(workspaceId, id, patch);
    return row ? toSkillDto(row) : undefined;
  }

  async restore(workspaceId: string, id: string, version: number): Promise<Skill | undefined> {
    const row = await this.repo.getById(workspaceId, id);
    if (!row) return undefined;

    const body = await this.repo.versionBody(row.id, version);
    if (body === undefined) {
      throw new ValidationError('That version does not exist for this skill', {
        field: 'version',
        version,
      });
    }

    const updated = await this.repo.update(workspaceId, id, { body });
    if (!updated) return undefined;
    const counts = await this.repo.agentCounts([updated.id]);
    return toSkillDto(updated, counts.get(updated.id) ?? 0);
  }

  async delete(workspaceId: string, id: string): Promise<boolean> {
    return this.repo.deleteById(workspaceId, id);
  }

  importPreview(filename: string, contentBase64: string): SkillImportPreview {
    return parseSkillImport(filename, decodeBase64(contentBase64));
  }
}

function decodeBase64(contentBase64: string): Uint8Array {
  if (contentBase64.length > base64LengthFor(MAX_IMPORT_BYTES)) {
    throw new ValidationError(`Import exceeds ${MAX_IMPORT_BYTES} bytes`, {
      max_bytes: MAX_IMPORT_BYTES,
    });
  }
  return new Uint8Array(Buffer.from(contentBase64, 'base64'));
}

function base64LengthFor(bytes: number): number {
  return Math.ceil(bytes / 3) * 4 + 4;
}
