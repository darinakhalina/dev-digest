import type { Skill, SkillImportPreview, SkillThreatLevel, SkillVersion } from '@devdigest/shared';
import type { Container } from '../../platform/container.js';
import type { SkillsRepository } from './repository.js';
import { toSkillDto, toSkillVersionDto } from './helpers.js';
import {
  isBlockedFromModel,
  parseSkillImport,
  refusalMessage,
  resolveImportUrl,
  worseThreat,
} from './domain.js';
import { classifySkillBody, type ModelVerdict } from './scanner.js';
import {
  DEFAULT_SKILL_SOURCE,
  DEFAULT_SKILL_TYPE,
  SCAN_DEADLINE_MS,
  IMPORT_URL_MAX_BYTES,
  IMPORT_URL_MAX_REDIRECTS,
  IMPORT_URL_TIMEOUT_MS,
  MAX_IMPORT_BYTES,
} from './constants.js';
import { ValidationError } from '../../platform/errors.js';
import type { CreateSkillInput, SkillAuthoring, UpdateSkillInput } from './types.js';
import { isAllowedImportHost } from './domain.js';

export type { CreateSkillInput, UpdateSkillInput } from './types.js';


export class SkillsService implements SkillAuthoring {
  private repo: SkillsRepository;

  constructor(private container: Container) {
    this.repo = container.skillsRepo;
  }

  async list(workspaceId: string): Promise<Skill[]> {
    const rows = await this.repo.list(workspaceId);
    const counts = await this.repo.agentCounts(workspaceId, rows.map((r) => r.id));
    return rows.map((row) => toSkillDto(row, counts.get(row.id) ?? 0));
  }

  async get(workspaceId: string, id: string): Promise<Skill | undefined> {
    const row = await this.repo.getById(workspaceId, id);
    if (!row) return undefined;
    const counts = await this.repo.agentCounts(workspaceId, [row.id]);
    return toSkillDto(row, counts.get(row.id) ?? 0);
  }

  async versions(workspaceId: string, id: string): Promise<SkillVersion[] | undefined> {
    const row = await this.repo.getById(workspaceId, id);
    if (!row) return undefined;
    const rows = await this.repo.versions(row.id);
    return rows.map(toSkillVersionDto);
  }

  async create(workspaceId: string, input: CreateSkillInput): Promise<Skill> {
    const verdict = await this.classify(workspaceId, input.body);
    const row = await this.repo.insert({
      ...(verdict ? { modelLevel: verdict.level, modelReason: verdict.reason } : {}),
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
    if (patch.enabled === true && patch.body === undefined) {
      const existing = await this.repo.getById(workspaceId, id);
      if (!existing) return undefined;
      assertUsable(existing);
    }
    const verdict =
      patch.body === undefined ? null : await this.classify(workspaceId, patch.body);
    const row = await this.repo.update(workspaceId, id, {
      ...patch,
      ...(verdict ? { modelLevel: verdict.level, modelReason: verdict.reason } : {}),
    });
    return row ? toSkillDto(row) : undefined;
  }

  async acceptRisk(workspaceId: string, id: string, userId: string): Promise<Skill | undefined> {
    const row = await this.repo.acceptThreat(workspaceId, id, userId);
    if (!row) return undefined;
    const counts = await this.repo.agentCounts(workspaceId, [row.id]);
    return toSkillDto(row, counts.get(row.id) ?? 0);
  }

  private async classify(workspaceId: string, body: string): Promise<ModelVerdict | null> {
    try {
      const { provider, model } = await this.container.featureModel(workspaceId, 'skill_scan');
      const llm = await this.container.llm(provider);
      return await withDeadline(classifySkillBody(body, llm, model), SCAN_DEADLINE_MS);
    } catch {
      return null;
    }
  }

  async importUrlPreview(workspaceId: string, url: string): Promise<SkillImportPreview> {
    const resolved = resolveImportUrl(url);
    if (!resolved.ok) {
      throw new ValidationError(refusalMessage(resolved.reason), {
        field: 'url',
        rule: resolved.reason,
      });
    }

    const document = await this.container.documentFetcher.fetch(resolved.value.url, {
      allowHost: isAllowedImportHost,
      maxBytes: IMPORT_URL_MAX_BYTES,
      maxRedirects: IMPORT_URL_MAX_REDIRECTS,
      timeoutMs: IMPORT_URL_TIMEOUT_MS,
    });

    return this.withModelVerdict(
      workspaceId,
      parseSkillImport(resolved.value.filename, new TextEncoder().encode(document.text)),
    );
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
    const counts = await this.repo.agentCounts(workspaceId, [updated.id]);
    return toSkillDto(updated, counts.get(updated.id) ?? 0);
  }

  async delete(workspaceId: string, id: string): Promise<boolean> {
    return this.repo.deleteById(workspaceId, id);
  }

  async importPreview(
    workspaceId: string,
    filename: string,
    contentBase64: string,
  ): Promise<SkillImportPreview> {
    return this.withModelVerdict(workspaceId, parseSkillImport(filename, decodeBase64(contentBase64)));
  }

  private async withModelVerdict(
    workspaceId: string,
    preview: SkillImportPreview,
  ): Promise<SkillImportPreview> {
    const verdict = await this.classify(workspaceId, preview.body);
    if (!verdict) return preview;
    return { ...preview, threat_level: worseThreat(preview.threat_level, verdict.level) };
  }
}

async function withDeadline<T>(work: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  try {
    return await Promise.race([work, deadline]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function assertUsable(row: { threatLevel: SkillThreatLevel; threatAcceptedAt: Date | null }): void {
  if (!isBlockedFromModel({ level: row.threatLevel, acceptedAt: row.threatAcceptedAt })) return;
  throw new ValidationError(
    'This skill contains prompt-injection patterns. Edit the body, or accept the risk explicitly, before using it.',
    { rule: 'threat_not_accepted', threat_level: row.threatLevel },
  );
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
