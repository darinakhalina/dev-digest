# Spec: One place per domain rule (client)

| | |
|---|---|
| **Spec ID** | SPEC-2026-09-25-lib-modules |
| **Status** | draft |
| **Source** | Phase 2 (client) of the whole-project audit of 2026-09-25 |

## Problem & why

The audit found the same handful of domain rules — what a severity means, what a verdict means,
how a token count is shown, what a run's outcome is, what a PR's status means — copied into two or
three components each. Some copies had already drifted: a suggestion finding was one colour in the
findings panel and another in the trace drawer; the trace drawer rounded a real token count of 300
down to "0k"; the review-run header showed "comment" in warning yellow while the banner below it,
built from the same verdict, showed it in info blue.

`frontend-ui-architecture`'s second rule says a rule defining what a domain value means lives with
the module that owns that meaning. Most of these values had no owning module yet.

## Goals / Non-goals

**Goals**

- Severity colour, order and per-level counting have one definition.
- A run's outcome (running / error / cancelled / rejected / reviewed / approved) has one definition,
  derived from the same deterministic gate everywhere it is shown.
- A PR's open/closed-or-merged state and its colour have one definition, shared by the list and the
  detail header.
- A token count under 1000 is never displayed as "0k".
- A verdict's colour and label have one definition.
- A cost value's "do we know this cost" question has one definition.
- The provider list and the feature-model registry are read from the contract, not copied.
- `AgentCard`, used by two routes as-is, lives in shared component space.

**Non-goals**

- Translating the remaining hardcoded English strings found by the same audit pass, or rewriting
  `@devdigest/ui` to stop carrying label text. Both are large, separate sweeps; touched only where a
  fix above already required editing the string.
- Thinning the four pages the audit flagged as not-thin. That is a structural reorganisation with no
  bug behind it, tracked separately.
- Rewriting every relative import to the `@/` alias. Only files this spec already touches were
  updated; the rest is a separate mechanical pass.
- A `@devdigest/ui` primitive (`ConfidenceNum`) reading an app-level threshold constant — primitives
  may not import from `src/lib`, so its own threshold stays inline, matching the app's threshold by
  coincidence of value rather than by import. Recorded as an accepted exception, not fixed here.

## User stories

- As a reviewer, I want a suggestion to be the same colour wherever I see it, so that colour tells
  me severity and nothing else.
- As a reviewer glancing at a run with 300 tokens, I want to see "300", not "0k", so that a small
  real number doesn't read as missing data.
- As a reviewer, I want the verdict badge on a run's header and the banner below it to agree, so
  that one card doesn't contradict itself.

## Acceptance criteria (EARS)

- **AC-1** — The system SHALL render a given severity level with the same colour in the findings
  list, the findings panel and the run trace drawer.
- **AC-2** — The system SHALL count and order findings by exactly the three severities the contract
  defines, admitting no fourth level.
- **AC-3** — WHEN a run's outcome is running, failed, cancelled, or done, the system SHALL classify
  it as running, error, cancelled, or (rejected / reviewed / approved by its blocker and finding
  counts) consistently everywhere that classification is shown.
- **AC-4** — The system SHALL format a token count under 1000 as its exact digits, never rounding it
  to "0k".
- **AC-5** — The system SHALL render a given verdict with the same colour and the same translated
  label wherever it appears on one screen.
- **AC-6** — The system SHALL treat a cost value as unknown under the same rule everywhere it
  decides whether to render a price or a placeholder.
- **AC-7** — The system SHALL read the provider list and the feature-model registry from the
  contract, not from a hand-maintained copy.
- **AC-8** — Neither route that shows an agent card SHALL import the other route's private folder to
  reach it.

## Edge cases

| Case | Handling |
|---|---|
| A severity outside the three canonical levels reaches the client | Counted as zero, not crashed on |
| A token count of exactly 0 | Shown as "0", not "0k" |
| A PR status of "open" (neither the three review states nor merged/closed) | Treated as not open-for-review and not closed-or-merged; unchanged from before this spec |

## Non-functional

- No new dependency.
- `pnpm build` stays the gate that catches a broken import path; `pnpm typecheck` and `pnpm test`
  alone do not.

## Cross-module interactions

None — the contract types these modules read already exist; nothing on the server changed.

## Contracts

No contract changes.

## Untrusted inputs

None new.
