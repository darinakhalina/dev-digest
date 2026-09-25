import { describe, it, expect, vi } from 'vitest';
import { OctokitGitHubClient } from '../src/adapters/github/octokit.js';

const REPO = { owner: 'acme', name: 'api' };

function clientWith(fake: object): OctokitGitHubClient {
  const client = new OctokitGitHubClient('token');
  (client as unknown as { octokit: object }).octokit = fake;
  return client;
}

const PR = {
  number: 1,
  title: 't',
  user: { login: 'a' },
  head: { ref: 'b', sha: 's' },
  base: { ref: 'main' },
  additions: 1,
  deletions: 0,
  changed_files: 150,
  state: 'open',
  merged_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  body: '',
};

describe('OctokitGitHubClient — SPEC-2026-09-25-run-reliability', () => {
  it('returns every file and commit of a pull request, beyond the first page', async () => {
    const files = Array.from({ length: 150 }, (_, i) => ({ filename: `f${i}.ts`, additions: 1, deletions: 0, patch: '' }));
    const commits = Array.from({ length: 120 }, (_, i) => ({
      sha: `c${i}`,
      commit: { message: 'm', author: { name: 'a', date: '2026-01-01T00:00:00Z' } },
      author: { login: 'a' },
    }));
    const listFiles = vi.fn();
    const listCommits = vi.fn();
    const client = clientWith({
      rest: { pulls: { get: async () => ({ data: PR }), listFiles, listCommits }, issues: { get: vi.fn() } },
      paginate: async (method: unknown) => (method === listFiles ? files : commits),
    });
    const detail = await client.getPullRequest(REPO, 1);
    expect(detail.files).toHaveLength(150);
    expect(detail.commits).toHaveLength(120);
  });

  it('sends a review comment once, even when GitHub answers 502', async () => {
    const createReviewComment = vi.fn(async () => {
      throw Object.assign(new Error('Bad gateway'), { status: 502 });
    });
    const client = clientWith({ rest: { pulls: { createReviewComment } } });
    await expect(
      client.createReviewComment(REPO, 1, { body: 'b', path: 'a.ts', line: 1, commitId: 'c' }),
    ).rejects.toThrow('Bad gateway');
    expect(createReviewComment).toHaveBeenCalledTimes(1);
    expect(createReviewComment.mock.calls[0]![0]).toMatchObject({ request: { retries: 0 } });
  });
});
