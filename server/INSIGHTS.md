# Insights — server

Non-obvious, file-grounded findings that reading the code does not reveal.
Written and maintained through the `engineering-insights` skill, which carries the format,
the section rules and the quality bar.

## What Works

## What Doesn't Work

**2026-09-19** — The seeded PR #482 cannot exercise the reviewer: its `pr_files` rows carry real
`additions`/`deletions` but `patch` is an empty string, so the list shows a convincing `M · 285`
across 9 files while the agent receives no diff at all. A run against it completes green with 0
findings and score 100, which reads as "the reviewer works" when nothing was reviewed. Import a real
repository before validating anything that depends on findings, grounding or scores.
Evidence: server/src/db/seed.ts

## Codebase Patterns

**2026-09-23** — `reviews.agent_id` is a plain uuid with **no foreign key**, while
`agent_runs.agent_id` declares `references(() => agents.id, { onDelete: 'set null' })`. Two
consequences worth relying on rather than rediscovering: deleting an agent nulls its runs but
leaves its reviews attributed, so anything grouping findings per agent keeps working after the
agent is gone; and a DB-backed test can pass any `crypto.randomUUID()` as an agent id without
inserting an agent row, which is how the per-agent findings tests avoid a fixture entirely.
Evidence: server/src/db/schema/reviews.ts:17

**2026-09-19** (refined 2026-09-22) — A review run's prompt gets `repoMap` and `callers` but never `skills`, `memory` or
`specs`: `run-executor.ts:201-203` fills only the first two, and the trace literal hardcodes the
rest to null. The reviewer therefore knows the repo's *structure* (1494 tokens of skeleton, visible
in the run log) but none of its *rules* — it cannot flag a CLAUDE.md convention such as
`Schema.parse(req.body)` inside a handler, because nobody shows it the convention. Confirmed by
running a reviewer against a PR that violates that rule: three general findings, zero project ones.
Until those slots are wired, the working substitute is the agent's own `system_prompt`, which does
reach the model: adding the conventions to it took the same PR from 3 findings to 7 — including the
one it had been blind to — while a deliberately clean PR went from 1 finding to 0, so the gain was
not bought with noise. Keep such rules stated with the consequence they cause; the prompt discards
a claim that has no mechanism behind it.
The mechanism is not what this entry said: the three slots are not passed as `null`, they are
absent from the `reviewPullRequest` call object entirely
(`server/src/modules/reviews/run-executor.ts:191-213`), so `assemblePrompt` omits their sections and
the model is shown no heading rather than an empty one. Two different literals are hardcoded, and
neither is the prompt: `memory_pulled: []` / `specs_read: []` in a SUCCESSFUL run's trace
(`run-executor.ts:282`), and `skills: null, memory: null, specs: null` in the trace synthesised for
a run that died before assembly (`run-executor.ts:429`) — so a `null` there means "failed early",
not "offered and empty". Wiring a slot therefore means adding a key to that call, not replacing a
null. Evidence: server/src/modules/reviews/run-executor.ts:191

## Tool & Library Notes

## Recurring Errors & Fixes

## Session Notes

**2026-09-19** — `RunStats` is read out of the `run_traces` jsonb document, `RunSummary` off a
column, and that is why their `cost_usd` fields differ: `nullish` for the first, `nullable` for the
second. A document written before a field existed simply has no key, so the contract has to admit
`undefined`; a column the server always serialises does not. Rejected making both `nullable` for
symmetry — it type-checks and then lies about every trace older than the field.
Evidence: server/src/vendor/shared/contracts/trace.ts:65

**2026-09-19** — Supersedes the 2026-09-19 entry above on `RunStats` only in one respect: the PR
list's cost is now the SUM of every completed run on the PR, not the cost of the latest review. The
earlier choice tied cost to the same review the score ring comes from, which reads consistently but
answers a question nobody asked — what one of several runs cost. The column is headed "Cost", and
the cost of a PR is what has been spent on it. A run the provider never priced adds nothing rather
than zeroing the total, and a PR with no priced run stays null so "—" and "$0.00" stay distinct.
Evidence: server/src/modules/pulls/routes.ts:126

**2026-09-23** — The PR list's FINDINGS column groups on `reviews.agent_id`, and the rejected
alternative is the one the course repository already ships: `upstream/lesson-2-lab/skills` solves
the same "several agents reviewed this PR" problem with `BATCH_WINDOW_MS = 120_000` around each
PR's newest review, and its own comment says why — "There's no batch id in the schema yet, so we
approximate one with a time window". It is an approximation of something the schema already
records. Agents started separately more than two minutes apart fall outside the window, and so
does one agent re-run after a fan-out; both are ordinary paths, because the run menu offers each
agent individually. Grouping on `agent_id` needs no window, no new column and no tuning constant.
Do not copy the window from that branch when the same question comes up again for the score or
anywhere else. Evidence: server/src/modules/pulls/routes.ts:149

## Open Questions
