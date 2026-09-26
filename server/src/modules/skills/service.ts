import type { Skill, SkillImportPreview, SkillSource, SkillType } from '@devdigest/shared';
import type { Container } from '../../platform/container.js';
import type { SkillsRepository } from './repository.js';
import { toSkillDto } from './helpers.js';
import { parseSkillImport } from './domain.js';
import { DEFAULT_SKILL_SOURCE, DEFAULT_SKILL_TYPE, MAX_IMPORT_BYTES } from './constants.js';
import { ValidationError } from '../../platform/errors.js';

export interface CreateSkillInput {
  name: string;
  description?: string;
  type?: SkillType;
  source?: SkillSource;
  body: string;
  enabled?: boolean;
}

export interface UpdateSkillInput {
  name?: string;
  description?: string;
  type?: SkillType;
  source?: SkillSource;
  body?: string;
  enabled?: boolean;
}

export class SkillsService {
  private repo: SkillsRepository;

  constructor(container: Container) {
    this.repo = container.skillsRepo;
  }

  async list(workspaceId: string): Promise<Skill[]> {
    const rows = await this.repo.list(workspaceId);
    return rows.map(toSkillDto);
  }

  async get(workspaceId: string, id: string): Promise<Skill | undefined> {
    const row = await this.repo.getById(workspaceId, id);
    return row ? toSkillDto(row) : undefined;
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
