import type { RepoRow } from './repository.js';

export interface RepoAccess {
  listForWorkspace(workspaceId: string): Promise<RepoRow[]>;
  getById(workspaceId: string, id: string): Promise<RepoRow | undefined>;
  touchLastPolled(repoId: string): Promise<void>;
}
