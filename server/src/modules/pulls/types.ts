export interface PullsSync {
  syncFromGitHub(workspaceId: string, repoId: string): Promise<{ synced: number }>;
}
