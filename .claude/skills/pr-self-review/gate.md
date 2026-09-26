# Gate — checks, verdict, state, limits

Read with [SKILL.md](SKILL.md) (procedure) and [routing.md](routing.md) (scope + skill map).

## 1. Deterministic gates — first, and without a model

`scripts/repo-rules.sh` decides the whole "Do not touch" catalog from git alone: NDJSON findings on
stdout, exit 1 if any. It covers the five `CLAUDE.md` symlinks, migrations being append-only,
schema changed without a migration, hand-edited lockfiles, `.claude/INSIGHTS.md` staying put, and
drift between the two vendored `@devdigest/shared` copies.

One nuance it encodes, learned from this repo's history: `migrations/meta/_journal.json` and
`meta/*_snapshot.json` are rewritten by every legitimate `pnpm db:generate`, so only `*.sql` is
append-only. A rule that flagged the whole directory would fire on every migration ever made.

Then, per package that has changed files, in this order — first non-zero exit → **BLOCKED**:

| # | Gate | Command | When |
|---|---|---|---|
| 1 | typecheck | `pnpm typecheck` | always |
| 2 | architecture | `pnpm arch` | `server/**` changed |
| 3 | tests | `pnpm test` | always |
| 4 | bundler | `pnpm build` | `client/**` changed — the only check that exercises the bundler |

`pnpm arch` carries a ratchet: the baseline in `.dependency-cruiser-known-violations.json` is
currently empty and may only shrink. **Regenerating it so a new violation passes is itself a
CRITICAL**, and it is visible in the diff — check for it.

`e2e` is deliberately excluded: `./scripts/e2e.sh` raises an isolated stack on three ports and
costs minutes. It belongs to CI, not to a gate that runs before every push.

Secrets are found by a scanner, not by the model — regex plus entropy, deterministic and
reproducible. On a public repository GitHub's own push protection already blocks a push containing
a secret, which is a free fourth layer.

## 2. One verdict, and no tier that accumulates

Findings keep this repo's contract scale — `CRITICAL` / `WARNING` / `SUGGESTION`
(`server/src/vendor/shared/contracts/findings.ts`) — because the product already speaks it and a
second vocabulary would need a mapping layer that drifts.

The **verdict**, though, is binary: PASS or BLOCKED. Every emitted finding gets exactly one of three
outcomes — fixed, suppressed with a reason, or blocking. "Look at it later" is not an outcome.
Google measured why: developers ignore a warning tier, so a check is either build-breaking or
suppressed, with nothing in between that piles up unread. WARNING and SUGGESTION therefore go into
the report's evidence section, not into a to-do list nobody clears.

**A finding that cannot name a concrete fix is not emitted at all.** By Google's own definition an
alert counts as a false positive whenever the developer took no action — which makes an unclear
message indistinguishable from a wrong one, even when the bug behind it is real.

## 3. The closed CRITICAL catalog

Only these block. Anything else is at most WARNING, however a skill labels it. The point is
predictability: a developer should be able to know, before running it, what could stop them.

**Repo rules** (all deterministic, from `repo-rules.sh`)
- A `CLAUDE.md` symlink turned into a regular file — it silently overrides the `AGENTS.md` beside it.
- A migration `.sql` modified, renamed or deleted.
- `server/src/db/schema/**` changed with no new migration.
- A lockfile changed without its `package.json` — CI installs `--frozen-lockfile`, so this passes
  locally and fails only there.
- The two vendored `@devdigest/shared` copies drifting apart.

**Backend**
- An onion violation at `error` level: I/O inside `reviewer-core`, a service importing a concrete
  adapter, a route reaching into `src/adapters/`, a cross-module import that isn't `types.ts` or
  `domain.ts`.
- External input crossing a trust boundary unvalidated: a route body or query used without a Zod
  schema, an LLM response or job payload parsed without one.

**UI**
- A hooks-rules violation, a side effect during render, or state stored that should be derived.
- A Next special file (`page`, `layout`, `not-found`, `loading`, `template`) that imports from
  `@devdigest/ui` without `"use client"` — see §7; this one has already taken the whole app down.

**Both**
- A secret or credential in the diff.
- A type error or failing test from §1.

## 4. Two filters before anything blocks

1. **Confidence ≥ 8/10.** Anthropic's own `/security-review` ships only findings at that bar, and
   the `code-review` plugin filters below its threshold. Borrowed rather than invented.
2. **Adversarial pass.** A second reading whose only job is to refute: is the input really
   attacker-controlled, is this really a changed line, does this really violate the stated rule?
   **Default to refuted when uncertain.** A survivor blocks. A refuted CRITICAL is downgraded to
   WARNING and reported *as downgraded* — never dropped quietly, because a gate that hides its own
   mistakes can't be calibrated.

One bad block teaches a team to reach for the override, and after that the gate is decoration.

## 5. Suppression

```ts
// pr-self-review-ignore: <reason>
```

Same line as the finding. The reason is mandatory and is echoed in the report ("suppressed: N"),
so suppressions stay auditable instead of silent. Audit them by age periodically — a suppression
nobody can justify any more is a finding.

That a deterministic rule will sometimes be legitimately broken is not hypothetical here: commit
`2006964` renamed five migrations on purpose, to repair a broken journal. Every rule in §3 needs a
documented way out for exactly that case.

## 6. State, escape hatch, and the layer that actually enforces

### `.pr-self-review.json` — repo root, git-ignored

```jsonc
{
  "verdict": "PASS",              // or "BLOCKED"
  "diffHash": "<scripts/diff-hash.sh>",
  "base": "origin/main",
  "headSha": "<git rev-parse HEAD>",
  "criticalCount": 0,
  "warningCount": 2,
  "suppressedCount": 1,
  "degraded": false,              // true when a routed skill was missing
  "ranAt": "<ISO-8601>",
  "findings": [{ "file": "", "line": 0, "severity": "", "skill": "", "issue": "", "fix": "", "confidence": 0 }]
}
```

The `.gitignore` entry is load-bearing. An untracked state file is itself part of the diff, so
writing it would change the hash it just recorded and invalidate its own PASS.

The hook recomputes the hash with the **same script** and denies on a missing file, a `BLOCKED`
verdict, a moved diff, or a state it cannot read. That last one is deliberate: where the fork's
script falls back to allowing when its JSON parser is unavailable, this one refuses. A gate that
silently evaporates is worse than one that is briefly in the way — and on this machine that is not
theoretical, because `node` lives under nvm and is absent from a minimal `PATH`, which is why these
scripts use `jq`.

### Escape hatch
- Local: `PR_SELF_REVIEW_OVERRIDE="reason"` — allowed and logged to stderr.
- CI: a label on the PR, not an environment variable, because a reviewer can see a label.

Log every override. A rising override rate is the measurement that says the gate is miscalibrated,
and it is the only honest signal — count what developers *did*, not whether the findings were right.

### CI is the only real enforcement
Exactly one required check, `pr-self-review / gate`, and it must **never** be path-filtered: GitHub
leaves a skipped required check "Pending" forever and blocks the merge, and its own docs advise
against requiring workflows that can be skipped. All five existing workflows here are path-filtered,
and a PR touching only `.claude/**` triggers none of them. Filter inside a single always-running
job instead — a final job with `if: always()` aggregating `needs.*.result`, which cannot drift out
of step with the path patterns the way a duplicated skip-workflow does.

## 7. What this gate cannot catch

State this in the report; do not let silence imply coverage.

On 2026-09-25 `client/src/app/not-found.tsx` was added without `"use client"`. Through the
`@devdigest/ui` barrel it pulled recharts into the RSC graph and took down **every** route with
`Super expression must either be null or a function`. At that moment `pnpm typecheck` was green,
147 vitest tests were green, and `pnpm build` was green and prerendered `/_not-found`. Checked
afterwards: `next build` + `next start` + a real 404 request also serve the page correctly. Only
`next dev` reproduces it.

Every gate in §1 would have said PASS. So:

- when the diff touches `client/src/app/**`, either perform a runtime step — start the dev server,
  request one real URL and one 404, read the console — or print `runtime: not verified`;
- the report always ends by naming what stayed unchecked.

The other recorded case (`client/INSIGHTS.md`, 2026-09-21) is the same shape: a component broken
only when pointer and keyboard cross, with every single-input test passing.
