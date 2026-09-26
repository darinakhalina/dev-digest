---
name: pr-self-review
description: Use when about to push, open or update a pull request in this repository, or when asked to self-review local changes before a PR — including "check my changes", "am I ready to push", "review before the PR". Also invoked by the pre-push gate.
user-invocable: true
disable-model-invocation: true
allowed-tools: Bash, Read, Grep, Glob, Agent, Write
metadata:
  version: "1.0.0"
---

# PR self-review — the local pre-PR gate

Catch problems **before** a pull request exists. This skill is an orchestrator: it holds no review
knowledge of its own. It scopes the diff, runs the cheap deterministic checks, then hands each
changed file to the skill that already owns that kind of knowledge, and turns what comes back into
one verdict.

Companion files: **[routing.md](routing.md)** — diff scope, buckets, file→skill map.
**[gate.md](gate.md)** — deterministic checks, the closed CRITICAL catalog, verdict, state,
escape hatch. Read the one the step needs; don't read both up front.

## What this gate can and cannot do

Say this plainly, because getting it wrong is how a gate becomes theatre:

| Layer | Stops | Bypassed by |
|---|---|---|
| `PreToolUse` hook | Claude's own `git push` | `!` prefix, your own terminal, the merge button, a crashed or timed-out hook |
| `pre-push` hook | any push from this clone | `--no-verify` |
| CI required check | **the merge itself** | repo admin |

Only the third actually forbids a merge. The first two are fast feedback. Never report a local
PASS as "safe to merge" — report it as "the local gate found nothing".

## Invocation

`disable-model-invocation: true` is deliberate: the gate runs when a person asks for it
(`/pr-self-review`), never because a model judged the moment right. A review that starts on its own
burns tokens on half-finished trees, and a verdict nobody asked for is a verdict nobody reads. The
push hook only reminds you it is missing — it never starts the review itself.

## Procedure

Stop at the first hard failure. Don't spend tokens reviewing architecture on a tree that doesn't
compile.

### 1. Scope
Per [routing.md](routing.md): `BASE = git merge-base origin/main HEAD`, all open changes
(committed-not-merged + staged + unstaged + untracked), **added and modified lines only**. Drop the
skip-list. No reviewable change → write `PASS` and stop.

Then report the size, and let it set expectations rather than block: past roughly 400 changed lines
or 20 files the review is explicitly lower-confidence, and the report must say so. Pretending 200
files got the same attention as 5 is worse than admitting they didn't.

### 2. Repo rules and deterministic gates
`scripts/repo-rules.sh` first — it decides the whole "Do not touch" catalog from git alone, in
milliseconds, with no model. Then the per-package gates in [gate.md](gate.md) §1. Any failure →
**BLOCKED**, skip the LLM passes entirely.

### 3. Route and review
Per [routing.md](routing.md): split the changed files into buckets, and spawn **one subagent per
non-empty bucket, in parallel**, each preloading only that bucket's skills. A bucket with no files
gets no subagent. A skill named in the routing table but missing from `.claude/skills/` makes the
run **DEGRADED**, never a silent PASS.

Require structured findings — `{file, line, severity, skill, issue, fix, confidence}` — not prose.

### 4. Filter, verify, decide
Per [gate.md](gate.md) §3–§5. Two independent filters before anything blocks: confidence ≥ 8/10,
and an adversarial pass that tries to refute the finding. A refuted CRITICAL is **downgraded and
reported as downgraded**, never dropped in silence.

**A finding with no concrete fix is not emitted.** If it can't name the next step, it reads as noise,
and noise is what teaches people to bypass the gate.

### 5. Record and report
Write `.pr-self-review.json` (git-ignored — and that entry is load-bearing, not housekeeping: an
untracked state file changes the diff hash and would invalidate its own PASS). Stamp it with
`scripts/diff-hash.sh`, the same script the hook uses, so the two can't disagree.

End the report with `✅ PASS` or `⛔ BLOCKED — N critical`, then a line naming **what stayed
unverified** — runtime behaviour, untouched packages, skipped buckets. Silence must never read as
"everything was checked"; see [gate.md](gate.md) §7 for why this repo knows that the hard way.
