# Insights — harness

Non-obvious findings about this repo's agent setup itself: skills, hooks, `AGENTS.md` wiring,
settings. Scoped to `.claude/` the way each package's file is scoped to its package — not a
catch-all for findings that belong to `server/`, `client/`, `reviewer-core/` or `e2e/`, and not a
place for Claude Code behaviour that is the same in every repository.

Written and maintained through the `engineering-insights` skill, which carries the format,
the section rules and the quality bar.

## What Works

**2026-09-22** (refined 2026-09-25) — Reading past findings is made deterministic by injection, not by instruction:
`SKILL.md:22` carries `` !`cat */INSIGHTS.md .claude/INSIGHTS.md` ``, which runs before the model
sees the skill body, so the files arrive as context rather than as a request the model may skip.
That is why a session can name which entries bear on its task before touching anything.

The cost is that the line must stay ONE literal command. The permission check rejects brace
expansion, `$VAR`, `||` and redirection, so it cannot be made defensive — no fallback, no
alternative path. Two consequences to plan around: the glob `*/INSIGHTS.md` only reaches files one
level deep, so a package nested deeper would be silently skipped; and the `.claude/` path is
spelled out because the glob does not match a dot-directory. Adding a fifth area means editing this
line by hand, and nothing will complain if you forget — the skill will simply read four files and
say nothing about the fifth. Evidence: .claude/skills/engineering-insights/SKILL.md:22
Both paths in that line resolve against the session's working directory, not the repository root,
and the working directory drifts: a Bash call that runs `cd` leaves the session there. With the
session inside `.claude/skills/frontend-ui-architecture/`, zsh found no match for `*/INSIGHTS.md`,
the command failed, and the skill did not load at all — not with four files, not with a warning,
just "Shell command failed". So a failure to load this skill is first a question of where the
session stands: return to the repository root and invoke it again before suspecting the skill.

**2026-09-25** — Write a skill for this repo only after running agents on the task without it. For
code placement in `client/`, three fresh agents already got three of five real questions right with
nothing but `client/AGENTS.md`, the package docs and precedent — the knowledge a placement skill
would restate was already in reach. What they lacked was agreement and cost: they split 2:1 on one
question, one of three moved a component blind on another, and each spent 18–19 file reads and
~130k tokens deriving conventions. A skill written only against those failures took the split to
3:0 and the blind moves to zero, with ~35% fewer file reads and ~40% less time, while staying under
600 words. Written from a best-practices list instead, it would have spent most of its tokens on
what agents already did right. The baseline prompt, both result tables and the three rules it
produced are in the skill's README. Evidence: .claude/skills/frontend-ui-architecture/README.md
The with-skill run must not be able to tell it is a test. For `onion-architecture` the same prompt
file was reused under the name `onion-baseline-prompt.md`; all three agents read "baseline", chose
not to load the skill, and said so — three runs that measured nothing. Give the task file a neutral
name, and check each transcript for the `Skill` call before counting a run as "with the skill".
Evidence: .claude/skills/onion-architecture/README.md

## What Doesn't Work

## Codebase Patterns

## Tool & Library Notes

## Recurring Errors & Fixes

## Session Notes

**2026-09-21** — "The skill fires without an explicit request" (criterion 9) has two distinct
satisfying mechanisms, not one: the skill description matching the request's own wording, and the
root `CLAUDE.md` session-protocol section, which told this session to invoke
`engineering-insights` by hand at the start of package work. Both count toward the
criterion — it is worded around the absence of a user request for the skill, not around which
mechanism raised it — but only the first is evidence of description-based auto-triggering. When
reporting which one fired, name the mechanism rather than calling a CLAUDE.md-driven invocation an
invalid measurement. Evidence: CLAUDE.md (## Session protocol).

**2026-09-24** — The five `CLAUDE.md` paths are symlinks to the `AGENTS.md` beside them, and the
reason is not the one every migration guide gives. Claude Code has read `AGENTS.md` natively since
v2.1.277 (this repo runs 2.1.281), and the official docs say an existing symlink can simply be
deleted — so the shims look redundant. Here they are not: `.claude/skills/zod/AGENTS.md` is a
vendored third-party file that is inert today only because a `CLAUDE.md` above it gates the whole
`AGENTS.md` mechanism. Delete the shims and that file becomes eligible to load as directory
instructions whenever anything under `.claude/skills/zod/` is opened, putting a zod rule index into
context uninvited. Keep the symlinks while any vendored skill ships an `AGENTS.md` of its own, and
check for new ones with `find .claude/skills -name AGENTS.md` before removing them.
Evidence: .claude/skills/zod/AGENTS.md

## Open Questions
