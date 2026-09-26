# Routing — what gets reviewed, and by which skill

Read with [SKILL.md](SKILL.md) (procedure) and [gate.md](gate.md) (the verdict).

## 1. Diff scope

```sh
BASE="$(git merge-base origin/main HEAD)"
```

"All open changes" is everything not yet on `main`, working tree included:

| Source | Command |
|---|---|
| committed-not-merged + staged + unstaged | `git diff "$BASE"` |
| untracked | `git ls-files --others --exclude-standard` |

**Review added and modified lines only.** Never flag a pre-existing problem on a line the diff
doesn't touch, even inside a file the diff changes. Bound every finding by the hunk ranges of
`git diff "$BASE"`. This is the single strongest rule against false positives, and it is also the
one that keeps the gate honest: the author is answerable for what they wrote, not for what they
inherited.

### Always skipped
- `client/src/vendor/shared/**`, `server/src/vendor/shared/**` — vendored. Still read for the
  drift check (`repo-rules.sh`), never style-reviewed.
- `server/src/db/migrations/**` — generated. `repo-rules.sh` checks they were not hand-edited;
  nothing reviews their contents.
- `node_modules/`, `dist/`, `.next/`, `*-lock.json`, `pnpm-lock.yaml`.
- `*.md`, `*.json` with no executable code.

## 2. Buckets

| Bucket | Paths |
|---|---|
| **UI** | `client/**/*.{ts,tsx,css}` |
| **Backend** | `server/**/*.ts`, `reviewer-core/**/*.ts` |
| **DB schema** | `server/src/db/schema/**` |
| **Tests** | `**/*.test.{ts,tsx}`, `e2e/**` |
| **Cross-cutting** | every changed `.ts` / `.tsx`, in addition to its own bucket |

A bucket with no files is **skipped entirely** — no subagent, no tokens. Cheap, and it keeps the
run proportional to what actually changed.

## 3. Skill map

Subagents do not inherit the caller's skills, so each one preloads its own. Give a subagent only
its slice of files and only these skills.

| Bucket | Skills |
|---|---|
| UI | `frontend-ui-architecture`, `react-best-practices`, `next-best-practices` |
| Backend | `onion-architecture`, `fastify-best-practices`, `drizzle-orm-patterns` |
| DB schema | `postgresql-table-design`, `drizzle-orm-patterns` |
| Tests | `react-testing-library` (UI tests only) — **style only, never blocks** |
| Cross-cutting | `typescript-expert`, `zod`, `security` |

Always fed alongside, as extra review criteria: the `INSIGHTS.md` of every touched package
(`client/`, `server/`, `reviewer-core/`, `e2e/`) and `.claude/INSIGHTS.md` when the diff touches
`.claude/`. Those files are this repo's record of what already went wrong here; a finding that
contradicts one of them is itself worth reporting.

## 4. Preflight — the routing table must match reality

Before spawning anything, check that every skill named above exists in `.claude/skills/`:

```sh
for s in frontend-ui-architecture react-best-practices next-best-practices \
         onion-architecture fastify-best-practices drizzle-orm-patterns \
         postgresql-table-design react-testing-library typescript-expert zod security; do
  [ -d ".claude/skills/$s" ] || echo "MISSING $s"
done
```

A missing skill makes the run **DEGRADED**: report which bucket went unreviewed and why. Never let
it pass silently — a whole bucket quietly skipped, reported as a green PASS, is the worst outcome
this design can produce. (The course fork's table names three skills this repository does not have
and misses the one it does; that is exactly the failure this preflight exists to catch.)

## 5. Cost — the diff here is bigger than you think

Measured on this branch: 216 files, ~10k changed lines, 103 of them in `client`. Fanning every file
out to a subagent on every push is how a gate gets uninstalled.

- **Cache per file.** Key on `sha256(file content) + skill version + prompt version` — content, not
  mtime, because a branch switch rewrites mtimes without changing a byte. On a hit, replay the
  stored finding set instead of re-reviewing.
- **Review the delta.** After a BLOCKED run, the re-run reviews what moved since that run, not the
  whole branch again.
- **Small diffs skip the fan-out.** Up to ~3 files in one bucket, review inline; the subagent
  overhead costs more than it saves.
