import type { RepoRow } from './repository.js';

export interface RepoAccess {
  listForWorkspace(workspaceId: string): Promise<RepoRow[]>;
  touchLastPolled(repoId: string): Promise<void>;
}
