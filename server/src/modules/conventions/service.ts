import type {
  ConventionCandidate,
  ConventionScan,
  ConventionSkillProposal,
  ConventionStatus,
  ConventionsList,
  FeatureModelChoice,
  LLMProvider,
  Provider,
  Skill,
  SkillType,
} from '@devdigest/shared';
import {
  ConflictError,
  ExternalServiceError,
  NotFoundError,
  ValidationError,
} from '../../platform/errors.js';
import { ATTEMPT_TIMEOUT_MS, MAX_CANDIDATES, SCAN_TIMEOUT_MS } from './constants.js';
import {
  describeSkill,
  findSnippetLines,
  formatEvidenceRange,
  hasEvidentialSubstance,
  proposeSkillName,
  renderSkillBody,
  type RenderableCandidate,
} from './domain.js';
import { buildConventionsPrompt } from './prompts.js';
import { ConventionExtractionOutput } from './schemas.js';
import type { ConventionsSampleSet, SampleProvider, ScannableRepo } from './samples.js';
import type {
  ConventionRow,
  ConventionScanRow,
  ConventionsRepository,
  InsertCandidate,
} from './repository.js';

export interface RepoLookup {
  getById(workspaceId: string, id: string): Promise<ScannableRepo | undefined>;
}

export interface SkillCreator {
  create(
    workspaceId: string,
    input: {
      name: string;
      description: string;
      type: SkillType;
      source: 'extracted';
      body: string;
      enabled: boolean;
      evidenceFiles: string[];
    },
  ): Promise<Skill>;
}

export interface FeatureModelResolver {
  (workspaceId: string): Promise<FeatureModelChoice>;
}

export interface LlmResolver {
  (provider: Provider): Promise<LLMProvider>;
}

export interface CreateSkillFromConventionsInput {
  conventionIds: string[];
  name: string;
  description: string;
  type: SkillType;
  enabled: boolean;
  body: string;
}

const scansInFlight = new Set<string>();

async function withDeadline<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new ExternalServiceError('The conventions scan ran out of time', {
            timeout_ms: ms,
          }),
        ),
      ms,
    );
  });
  try {
    return await Promise.race([work, deadline]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export class ConventionsService {
  constructor(
    private deps: {
      repo: ConventionsRepository;
      repos: RepoLookup;
      samples: SampleProvider;
      skills: SkillCreator;
      resolveModel: FeatureModelResolver;
      llm: LlmResolver;
    },
  ) {}

  async list(workspaceId: string, repoId: string): Promise<ConventionsList> {
    await this.requireRepo(workspaceId, repoId);
    const scan = await this.deps.repo.getLatestScan(workspaceId, repoId);
    if (!scan) return { scan: null, candidates: [] };
    const rows = await this.deps.repo.listByScan(workspaceId, repoId, scan.id);
    return { scan: toScanDto(scan), candidates: rows.map(toCandidateDto) };
  }

  async extract(workspaceId: string, repoId: string): Promise<ConventionsList> {
    const repo = await this.requireRepo(workspaceId, repoId);

    if (scansInFlight.has(repoId)) {
      throw new ConflictError('A scan of this repository is already running', {
        repo_id: repoId,
      });
    }
    scansInFlight.add(repoId);
    let releaseOnExit = true;
    try {
      const sample = await this.takeSample(repo);
      const { provider, model } = await this.deps.resolveModel(workspaceId);
      const llm = await this.deps.llm(provider);

      const work = llm.completeStructured({
        model,
        schema: ConventionExtractionOutput,
        schemaName: 'ConventionExtraction',
        messages: buildConventionsPrompt(sample),
        timeoutMs: ATTEMPT_TIMEOUT_MS,
        maxRetries: 1,
      });
      releaseOnExit = false;
      void work.catch(() => undefined).finally(() => scansInFlight.delete(repoId));

      const result = await withDeadline(work, SCAN_TIMEOUT_MS);

      const returned = result.data.candidates;
      const proposed = returned.slice(0, MAX_CANDIDATES);
      const verified = verifyAgainstSample(sample, proposed);

      const recorded = await this.deps.repo.recordScan(
        {
          workspaceId,
          repoId,
          sampleFileCount: sample.configFiles.length + sample.sourceFiles.length,
          indexed: sample.indexed,
          discardedCount: returned.length - verified.length,
          sourceSha: sample.sourceSha,
          provider,
          model: result.model,
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
          costUsd: result.costUsd,
        },
        verified,
      );

      return {
        scan: toScanDto(recorded.scan),
        candidates: recorded.candidates.map(toCandidateDto),
      };
    } finally {
      if (releaseOnExit) scansInFlight.delete(repoId);
    }
  }

  async patch(
    workspaceId: string,
    repoId: string,
    id: string,
    values: { status?: ConventionStatus; rule?: string },
  ): Promise<ConventionCandidate> {
    await this.requireRepo(workspaceId, repoId);
    const row = await this.deps.repo.patch(workspaceId, repoId, id, values);
    if (!row) throw new NotFoundError('Convention not found');
    return toCandidateDto(row);
  }

  async propose(
    workspaceId: string,
    repoId: string,
    conventionIds: string[],
    name?: string,
  ): Promise<ConventionSkillProposal> {
    const repo = await this.requireRepo(workspaceId, repoId);
    const rows = await this.requireAccepted(workspaceId, repoId, conventionIds);
    const renderable = rows.map(toRenderable);
    const skillName = name ?? proposeSkillName(repo.fullName, renderable);
    return {
      name: skillName,
      description: describeSkill(repo.fullName, renderable),
      body: renderSkillBody(skillName, repo.fullName, renderable),
    };
  }

  async createSkill(
    workspaceId: string,
    repoId: string,
    input: CreateSkillFromConventionsInput,
  ): Promise<Skill> {
    await this.requireRepo(workspaceId, repoId);
    const rows = await this.requireAccepted(workspaceId, repoId, input.conventionIds);
    return this.deps.skills.create(workspaceId, {
      name: input.name,
      description: input.description,
      type: input.type,
      source: 'extracted',
      body: input.body,
      enabled: input.enabled,
      evidenceFiles: rows.map((r) =>
        formatEvidenceRange(r.evidencePath, r.evidenceStartLine, r.evidenceEndLine),
      ),
    });
  }

  private async requireRepo(workspaceId: string, repoId: string): Promise<ScannableRepo> {
    const repo = await this.deps.repos.getById(workspaceId, repoId);
    if (!repo) throw new NotFoundError('Repo not found');
    return repo;
  }

  private async takeSample(repo: ScannableRepo): Promise<ConventionsSampleSet> {
    try {
      return await this.deps.samples.sample(repo);
    } catch (err) {
      if (err instanceof Error && err.message === 'CLONE_MISSING') {
        throw new ConflictError(
          'This repository has no local working copy yet — refresh it before scanning for conventions',
          { repo_id: repo.id },
        );
      }
      throw err;
    }
  }

  private async requireAccepted(
    workspaceId: string,
    repoId: string,
    requested: string[],
  ): Promise<ConventionRow[]> {
    const ids = [...new Set(requested)];
    const rows = await this.deps.repo.getByIds(workspaceId, repoId, ids);
    if (rows.length !== ids.length) {
      const found = new Set(rows.map((r) => r.id));
      throw new ValidationError('One or more conventions do not belong to this repository', {
        field: 'convention_ids',
        unknown_ids: ids.filter((id) => !found.has(id)),
      });
    }
    const notAccepted = rows.filter((r) => r.status !== 'accepted');
    if (notAccepted.length > 0) {
      throw new ValidationError('Only accepted conventions can be merged into a skill', {
        field: 'convention_ids',
        not_accepted_ids: notAccepted.map((r) => r.id),
      });
    }
    return ids.map((id) => rows.find((r) => r.id === id)!);
  }
}

function verifyAgainstSample(
  sample: ConventionsSampleSet,
  proposed: Array<{
    category: string;
    rule: string;
    evidence_path: string;
    evidence_snippet: string;
    confidence: number;
  }>,
): InsertCandidate[] {
  const sampled = new Map<string, string>();
  for (const f of [...sample.configFiles, ...sample.sourceFiles]) {
    sampled.set(f.path, f.content);
  }

  const out: InsertCandidate[] = [];
  for (const c of proposed) {
    const content = sampled.get(c.evidence_path);
    if (content === undefined) continue;
    if (!hasEvidentialSubstance(c.evidence_snippet)) continue;
    const range = findSnippetLines(content, c.evidence_snippet);
    if (!range) continue;
    out.push({
      category: c.category,
      rule: c.rule,
      evidencePath: c.evidence_path,
      evidenceStartLine: range.startLine,
      evidenceEndLine: range.endLine,
      evidenceSnippet: c.evidence_snippet,
      confidence: c.confidence,
    });
  }
  return out;
}

function toRenderable(row: ConventionRow): RenderableCandidate {
  return {
    category: row.category,
    rule: row.rule,
    evidencePath: row.evidencePath,
    evidenceStartLine: row.evidenceStartLine,
    evidenceEndLine: row.evidenceEndLine,
    evidenceSnippet: row.evidenceSnippet,
  };
}

function toCandidateDto(row: ConventionRow): ConventionCandidate {
  return {
    id: row.id,
    scan_id: row.scanId,
    category: row.category,
    rule: row.rule,
    evidence_path: row.evidencePath,
    evidence_start_line: row.evidenceStartLine,
    evidence_end_line: row.evidenceEndLine,
    evidence_snippet: row.evidenceSnippet,
    confidence: row.confidence,
    status: row.status,
  };
}

function toScanDto(row: ConventionScanRow): ConventionScan {
  return {
    id: row.id,
    repo_id: row.repoId,
    sample_file_count: row.sampleFileCount,
    discarded_count: row.discardedCount,
    indexed: row.indexed,
    source_sha: row.sourceSha,
    provider: row.provider,
    model: row.model,
    tokens_in: row.tokensIn,
    tokens_out: row.tokensOut,
    cost_usd: row.costUsd,
    created_at: row.createdAt.toISOString(),
  };
}
