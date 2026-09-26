import type { PrDetail, PrMeta } from '@devdigest/shared';
import type { Container } from '../../platform/container.js';
import { NotFoundError } from '../../platform/errors.js';
import { PullsRepository } from './repository.js';
import { toStoredPrDetail } from './helpers.js';
import { deriveReviewStatus } from './status.js';
import type { PullsSync } from './types.js';

const STATS_BACKFILL_LIMIT = 10;

export class PullsService implements PullsSync {
  private repo: PullsRepository;

  constructor(
    private container: Container,
    private onRefreshSkipped: (err: unknown) => void = () => undefined,
  ) {
    this.repo = new PullsRepository(container.db);
  }

  async list(workspaceId: string, repoId: string): Promise<PrMeta[]> {
    const repo = await this.repo.findRepo(repoId);
    if (!repo || repo.workspaceId !== workspaceId) throw new NotFoundError('Repo not found');

    let gh = null;
    try {
      gh = await this.container.github();
    } catch (err) {
      this.onRefreshSkipped(err);
    }

    if (gh) {
      try {
        const pulls = await gh.listPullRequests({ owner: repo.owner, name: repo.name });
        await this.repo.upsertFromGitHub(workspaceId, repo.id, pulls);
      } catch (err) {
        this.onRefreshSkipped(err);
      }
    }

    const rows = await this.repo.listForRepo(repo.id);

    if (gh) {
      const needStats = rows
        .filter((r) => r.additions === 0 && r.deletions === 0 && r.filesCount === 0)
        .slice(0, STATS_BACKFILL_LIMIT);
      for (const r of needStats) {
        try {
          const detail = await gh.getPullRequest({ owner: repo.owner, name: repo.name }, r.number);
          const stats = {
            additions: detail.additions,
            deletions: detail.deletions,
            filesCount: detail.files_count,
          };
          await this.repo.updateStats(r.id, stats);
          r.additions = stats.additions;
          r.deletions = stats.deletions;
          r.filesCount = stats.filesCount;
        } catch (err) {
          this.onRefreshSkipped(err);
        }
      }
    }

    const prIds = rows.map((r) => r.id);
    const [summaryByPr, costByPr] = await Promise.all([
      this.container.reviewRepo.reviewSummaryForPrs(prIds),
      this.container.reviewRepo.costForPrs(workspaceId, prIds),
    ]);

    const now = Date.now();
    return rows.map((r) => {
      const summary = summaryByPr.get(r.id);
      return {
        id: r.id,
        number: r.number,
        title: r.title,
        author: r.author,
        branch: r.branch,
        base: r.base,
        head_sha: r.headSha,
        additions: r.additions,
        deletions: r.deletions,
        files_count: r.filesCount,
        status: deriveReviewStatus({
          ghStatus: r.status,
          lastReviewedSha: r.lastReviewedSha,
          headSha: r.headSha,
          updatedAt: r.updatedAt,
          now,
        }),
        opened_at: r.openedAt?.toISOString() ?? null,
        updated_at: r.updatedAt?.toISOString() ?? null,
        score: summary?.score ?? null,
        cost_usd: costByPr.get(r.id) ?? null,
        findings: summary?.findings ?? null,
      };
    });
  }

  async syncFromGitHub(workspaceId: string, repoId: string): Promise<{ synced: number }> {
    const repo = await this.repo.findRepo(repoId);
    if (!repo || repo.workspaceId !== workspaceId) throw new NotFoundError('Repo not found');
    const gh = await this.container.github();
    const pulls = await gh.listPullRequests({ owner: repo.owner, name: repo.name });
    await this.repo.upsertFromGitHub(workspaceId, repo.id, pulls);
    await this.container.repos.touchLastPolled(repo.id);
    return { synced: pulls.length };
  }

  async resolvePrAndRepo(workspaceId: string, prId: string) {
    const pr = await this.repo.findPull(workspaceId, prId);
    if (!pr) throw new NotFoundError('Pull request not found');
    const repo = await this.repo.findRepo(pr.repoId);
    if (!repo) throw new NotFoundError('Repo not found');
    return { pr, repo };
  }

  async detail(workspaceId: string, prId: string): Promise<PrDetail> {
    const pr = await this.repo.findPull(workspaceId, prId);
    if (!pr) throw new NotFoundError('Pull request not found');
    const repo = await this.repo.findRepo(pr.repoId);
    if (!repo) throw new NotFoundError('Repo not found');

    let fresh: PrDetail | null = null;
    try {
      const gh = await this.container.github();
      fresh = await gh.getPullRequest({ owner: repo.owner, name: repo.name }, pr.number);
    } catch (err) {
      this.onRefreshSkipped(err);
    }

    if (fresh) {
      await this.repo.replaceDetail(pr.id, fresh);
      return { ...fresh, id: pr.id };
    }
    const { files, commits } = await this.repo.storedDetail(pr.id);
    return toStoredPrDetail(pr, files, commits);
  }
}
