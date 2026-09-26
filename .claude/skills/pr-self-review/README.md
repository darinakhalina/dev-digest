# pr-self-review — sources, decisions, changelog

The skill itself is [SKILL.md](SKILL.md); the reasoning behind it is [PLAN.md](PLAN.md). This file
records where it came from and what was deliberately rejected.

## Layout

Filenames deliberately mirror the course fork (`upstream/lesson-2-lab/skills`,
`.claude/skills/pr-self-review/`) so the two can be compared side by side:

| File | Role |
|---|---|
| `SKILL.md` | the orchestrator procedure |
| `routing.md` | diff scope, buckets, file→skill map, preflight |
| `gate.md` | deterministic checks, CRITICAL catalog, verdict, state, limits |
| `scripts/diff-hash.sh` | one hash of all open changes, shared by the review and the hook |
| `scripts/check-gate.sh` | the `PreToolUse` hook |
| `scripts/repo-rules.sh` | **ours** — the "Do not touch" catalog, decided from git alone |

Shared vocabulary is kept identical on purpose: `.pr-self-review.json`, `diffHash`,
`PR_SELF_REVIEW_OVERRIDE`, `// pr-self-review-ignore:`, verdicts `PASS` / `BLOCKED`.

## Taken from the fork

| Idea | Why it survived review |
|---|---|
| Orchestrator, not a second copy of review knowledge | Routing into existing skills is the task; a second copy drifts |
| Deterministic gates before any model pass | Cheapest, highest-signal; no point reviewing a tree that won't compile |
| Added/modified lines only | Strongest anti-false-positive rule there is |
| Adversarial verification, downgrade instead of silent drop | One bad block trains a team to bypass the gate |
| Closed CRITICAL catalog | Predictability: you can know in advance what can stop you |
| `diffHash` staleness | Closes "reviewed, then kept typing" |
| Suppression with a mandatory reason, echoed in the report | Keeps suppressions auditable |
| The hook reads state and never runs the review | A hook that times out fails open — running the review inside it would erase the gate |

## Rejected, and why

| Fork's choice | Why not |
|---|---|
| `PreToolUse` presented as a merge gate | It only sees Claude's own tool calls. `!`, a second terminal and the merge button all walk past it. The task says *forbid merging* — only a required status check does that |
| `matcher: "Bash"` on every Bash call | `if: "Bash(git push*)"` scopes it, and handles `&&`, `$()` and variable indirection itself |
| `exit 2` to refuse | Documented recommendation is exit 0 with `hookSpecificOutput.permissionDecision`; the top-level `decision`/`reason` pair is deprecated |
| `node -e` for JSON, allowing on parse failure | Verified here: `node` is nvm-managed and absent from a minimal `PATH`, while `jq` and `shasum` are in `/usr/bin`. That script degrades into a silent no-op on this machine. We use `jq`, and "cannot verify" denies instead of allowing |
| `gh pr create` / `gh pr merge` as the main path | `gh` isn't installed here; PRs are opened from the URL `git push` prints. Kept as secondary entries for portability |
| Hardcoded skill map | It names three skills this repo lacks and misses `frontend-ui-architecture`. Hence the preflight in `routing.md` §4 |
| Invented `CRITICAL/HIGH/MEDIUM` scale | The product already ships `CRITICAL/WARNING/SUGGESTION`; a second scale needs a mapping layer that rots |
| "depcruise is not yet wired" | Stale: `pnpm arch` works here and its baseline is at zero |
| A warning tier that reports and accumulates | Google measured that developers ignore it; the verdict is binary and every finding has exactly one outcome |

## Added here, with sources

- **Deterministic repo-rule checks** (`repo-rules.sh`) from the root `AGENTS.md` "Do not touch"
  section — zero tokens. The `meta/_journal.json` carve-out comes from real history; commit
  `2006964` is a real, deliberate violation of the migration rule and is why every rule needs an
  override.
- **Binary verdict, no accumulating tier**, and **no finding without a fix** — *Software
  Engineering at Google*, ch. 20: under 10% effective false positives (measured ~5%), an alert
  counts as false whenever the developer took no action, and "anything that can be fixed
  automatically should be fixed automatically".
  https://abseil.io/resources/swe-book/html/ch20.html
- **Confidence ≥ 8/10**, borrowed from Anthropic's `/security-review` and the `code-review` plugin.
  https://github.com/anthropics/claude-code-security-review
- **Size sets review depth, not the verdict** — Google small CLs ("100 lines reasonable, 1000 too
  large"; 200 lines across 50 files is too large) and the SmartBear/Cisco 200–400 LOC finding.
  Measured locally: this branch is 216 files / ~10k lines, so a 400-line block would fire on nearly
  every PR here. https://google.github.io/eng-practices/review/developer/small-cls.html
- **Content-hash caching and skip-empty-bucket** — ESLint's `--cache-strategy content` (mtime
  changes without content changing is exactly a branch switch), Turborepo's replay of stored
  output, lefthook skipping a command when no files remain.
  https://eslint.org/docs/latest/use/command-line-interface · https://lefthook.dev/configuration/glob
- **Secrets from a scanner, not the model**, plus GitHub push protection as a free extra layer.
  https://github.com/gitleaks/gitleaks · https://docs.github.com/en/code-security/secret-scanning/introduction/about-push-protection
- **One never-path-filtered required check with an `if: always()` aggregator** — GitHub leaves a
  skipped required check pending forever and advises against requiring skippable workflows; all
  five workflows here are path-filtered and a `.claude/**`-only PR triggers none.
  https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks
- **A stated limit section** (`gate.md` §7) from this repo's own `client/INSIGHTS.md`: the
  2026-09-25 `not-found.tsx` crash passed typecheck, 147 tests and `pnpm build`.

Claude Code mechanics (hook scope, `if`, `permissionDecision`, fail-open on timeout, subagent
`skills:` preloading): https://code.claude.com/docs/en/hooks · https://code.claude.com/docs/en/skills ·
https://code.claude.com/docs/en/sub-agents

## Status

Built: the three deterministic scripts, the `PreToolUse` wiring, and the skill documents.
Every branch of `check-gate.sh` and every rule in `repo-rules.sh` was exercised against a
deliberately broken tree before commit.

Not built yet: the CI layer (`pr-self-review / gate` workflow + required check), the `pre-push`
hook, and the review cache. `PLAN.md` §9 carries the phasing.

## Changelog

### 1.0.0 — 2026-09-26
First version. Deterministic layer, routing and gate documents, `PreToolUse` hook.
Written against the course fork plus primary sources; the comparison tables above record what was
taken and what was refused.
