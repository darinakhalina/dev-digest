import type { PrDetail } from '@devdigest/shared';
import type { Container } from '../../platform/container.js';
import { NotFoundError } from '../../platform/errors.js';
import { PullsRepository } from './repository.js';
import { toStoredPrDetail } from './helpers.js';

export class PullsService {
  private repo: PullsRepository;

  constructor(
    private container: Container,
    private onRefreshSkipped: (err: unknown) => void = () => undefined,
  ) {
    this.repo = new PullsRepository(container.db);
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
