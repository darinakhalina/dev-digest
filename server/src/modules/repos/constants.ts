/**
 * F1 — repos module constants (extracted from routes.ts; no behaviour change).
 */

/** JobRunner kind for the asynchronous `git clone` job. */
export const CLONE_JOB_KIND = 'clone';

/** Clone depth — shallow clone (latest commit only) keeps imports fast. */
export const CLONE_DEPTH = 1;

export const GITHUB_HOST = 'github.com';

export const GITHUB_OWNER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;

export const GITHUB_REPO_NAME_RE = /^[A-Za-z0-9._-]{1,100}$/;

export const GITHUB_SSH_RE = /^git@github\.com:(.+)$/;
