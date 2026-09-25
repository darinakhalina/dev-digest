import { type Repo } from '@devdigest/shared';
import * as t from '../../db/schema.js';
import { AppError } from '../../platform/errors.js';
import {
  GITHUB_HOST,
  GITHUB_OWNER_RE,
  GITHUB_REPO_NAME_RE,
  GITHUB_SSH_RE,
} from './constants.js';

/**
 * F1 — repos pure helpers (extracted from routes.ts; no behaviour change).
 * Pure functions only — no I/O, no DB, no container.
 */

function invalidRepoUrl(url: string): AppError {
  return new AppError('invalid_repo_url', `Not a GitHub repository address: '${url}'`, 400);
}

function githubPathOf(url: string): string | null {
  const ssh = url.match(GITHUB_SSH_RE);
  if (ssh) return ssh[1] ?? null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' || u.hostname !== GITHUB_HOST) return null;
  if (u.username || u.password || u.port || u.search || u.hash) return null;
  return u.pathname.slice(1);
}

export function parseRepoUrl(url: string): { owner: string; name: string } {
  const path = githubPathOf(url);
  if (path === null) throw invalidRepoUrl(url);
  const segments = path.replace(/\/$/, '').split('/');
  if (segments.length !== 2) throw invalidRepoUrl(url);
  const owner = segments[0]!;
  const name = segments[1]!.replace(/\.git$/, '');
  if (!GITHUB_OWNER_RE.test(owner)) throw invalidRepoUrl(url);
  if (!GITHUB_REPO_NAME_RE.test(name) || name === '.' || name === '..') throw invalidRepoUrl(url);
  return { owner, name };
}

/** Map a persisted repo row to the API `Repo` DTO. */
export function toRepoDto(row: typeof t.repos.$inferSelect): Repo {
  return {
    id: row.id,
    workspace_id: row.workspaceId,
    owner: row.owner,
    name: row.name,
    full_name: row.fullName,
    default_branch: row.defaultBranch,
    clone_path: row.clonePath,
    last_polled_at: row.lastPolledAt?.toISOString() ?? null,
    created_by: row.createdBy,
  };
}
