# Spec: Clear the onion-architecture gate's recorded debt

| | |
|---|---|
| **Spec ID** | SPEC-2026-09-25-onion-debt-cleared |
| **Status** | draft |
| **Source** | Phase 2 (server) of the whole-project audit of 2026-09-25, following on from
  `.claude/skills/onion-architecture`'s baseline of 21 recorded violations |

## Problem & why

The `onion-architecture` skill's gate (`pnpm arch`) was added with 21 known violations recorded in
a baseline file so the gate could go live without a rewrite. Recorded debt is still debt: two of the
21 edges were not just a layering shortcut but a real bug — `pulls` and `polling` each held their
own copy of the PR-upsert query, and the copies had already drifted: `polling`'s left a new PR's
`opened_at` null forever, because that field was only set on the `pulls` copy's insert branch.

## Goals / Non-goals

**Goals**

- Every route queries the database through that module's own repository, never directly.
- A rule, a query or a constant that two rings both need has exactly one owner reachable from both,
  not a version of the constant in the ring that needed it more.
- The PR-list upsert exists once, used by both `pulls` and `polling`.
- The gate's baseline is empty, and it stays empty going forward.

**Non-goals**

- Fixing the N+1 GitHub-detail backfill inside the PR list (a performance item, not a layering one)
  — relocated, not rewritten.
- Removing the `container.agentsRepo` / `container.reviewRepo` pattern of handing out a concrete
  repository class to any module that asks. That is accepted, existing design; this spec only stops
  it from spreading to `pulls`/`repos` in a way the gate would need a new exemption for, by using the
  same container-getter shape those two already use.
- Auditing every other file for a type-only-import opportunity. Only the two files the baseline
  named were touched.

## User stories

- As a developer touching `polling` or `pulls`, I want one PR-upsert to maintain, so that a fix in
  one path cannot leave the other stale.
- As a developer running `pnpm arch`, I want a clean baseline, so that a new violation is never lost
  among old ones I've learned to ignore.

## Acceptance criteria (EARS)

- **AC-1** — WHEN a PR is first synced from GitHub through either the pull-request list or the
  manual poll endpoint, the system SHALL record the same fields for it, including its opened date.
  _(observable: a brand-new PR synced via `POST /repos/:id/poll` has a non-null `opened_at` once its
  detail is later fetched, the same as one synced via `GET /repos/:id/pulls`)_
- **AC-2** — `pnpm arch` SHALL report zero violations, ignored or otherwise, on a clean tree.
- **AC-3** — The system SHALL serve `GET /repos/:id/pulls`, `GET /pulls/:id`, `GET/POST
  /pulls/:id/comments`, `POST /repos/:id/poll`, `GET /settings`, `PUT /settings`, `GET /workspace`
  with the same responses as before this change, for the same stored data.
  _(observable: the existing integration tests for these routes pass unchanged)_

## Edge cases

| Case | Handling |
|---|---|
| GitHub unreachable during a poll | `POST /repos/:id/poll` fails as before — polling has no offline fallback, unlike the PR list |
| A repo with zero PRs | Both endpoints report `synced: 0` / an empty list, as before |
| `repos/service.ts` enqueuing an index job when repo-intel's handler isn't registered | Unchanged: the failure is swallowed, logged nowhere new |

## Non-functional

- No schema change, no migration, no new dependency.
- `pnpm typecheck`, `pnpm test` (192 tests) and `pnpm arch` all pass on the resulting tree.

## Cross-module interactions

- `repos` gains a public surface (`container.repos`, backed by `RepoAccess` in
  `modules/repos/types.ts`) so `workspace` can read the repo list and `pulls`/`polling` can bump
  `last_polled_at` without importing `repos`' repository directly.
- `repo-intel` gains `enqueueIndex`/`enqueueRefresh` on its existing facade (`container.repoIntel`)
  so `repos` no longer needs to know repo-intel's job-kind constants to trigger indexing.
- `pulls` gains a public surface (`container.pulls`, backed by `PullsSync` in
  `modules/pulls/types.ts`) so `polling` can sync a repo's PRs through the same code path `pulls`
  uses for its own list.
- `reviews` gains two read-only aggregation methods (`reviewSummaryForPrs`, `costForPrs`) that
  `pulls` calls to build the list response, since the `reviews` and `agent_runs` tables belong to
  `reviews`.

## Contracts

No contract changes.

## Untrusted inputs

None new.
