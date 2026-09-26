# Spec: PR-page bugs from the 2026-09-25 audit

| | |
|---|---|
| **Spec ID** | SPEC-2026-09-25-pr-page-bugs |
| **Status** | draft |
| **Source** | Phase 1 (client) of the whole-project audit of 2026-09-25 |

## Problem & why

Six bugs on or near the pull-request page were confirmed by opening the code and, where the claim
was about behaviour rather than shape, by a test.

- The `j`/`k`/`a`/`d` keyboard shortcuts listen on `window`. With more than one review run expanded,
  each has its own listener, so pressing `a` accepts the first finding of **every** expanded run at
  once. The listener also has no modifier guard, so Cmd/Ctrl+A — normally "select all" — silently
  accepts a finding, and clicking a card never moves the keyboard focus onto it, so the keyboard and
  the pointer can point at different findings.
- `RunStatus` calls its `onDone` callback again on every re-render once a run has settled, because
  the effect that fires it depends on the callback identity and the page passes a new function each
  render.
- The agent editor copies the agent into nine pieces of local state and only resets them when the
  agent's id changes. Toggling "enabled" from the sidebar does not change the id, so the form's
  toggle goes stale, and pressing Save sends the stale value back.
- Opening a live run's trace never shows the live log, because the page never tells the drawer the
  run is live.
- The home page treats "the API did not answer" the same as "there are no repositories yet" and
  sends the user to onboarding.
- A file card's list key is its position, not its path, so an expanded file or a draft comment can
  attach to the wrong file after the list changes.

Two smaller findings from the Next.js pass are folded in because they touch the same pages: there is
no `error.tsx`/`not-found.tsx` anywhere, so an unexpected render error blanks the app and an unknown
URL shows the framework's own page instead of the product's; and the PR list's row is a clickable
`div`, not a link, so it cannot be opened in a new tab or reached by keyboard.

## Goals / Non-goals

**Goals**

- A keyboard shortcut acts on exactly the finding the user is looking at, in exactly one place.
- A callback passed to a settling-run indicator fires once per settle.
- The agent form reflects a change made elsewhere in the app, and never overwrites it on save.
- A live run's trace drawer shows the live log while the run is live.
- The home page tells apart "nothing to show" from "could not find out".
- A list item's identity survives a refetch.
- An unexpected error, and an unknown URL, show a page belonging to the product.
- The PR list's row is a real link.

**Non-goals**

- Rewriting the shortcut system beyond the one panel it is broken in.
- The agent card / list navigation (a separate "maybe" from the same audit pass) — only the PR row
  is in scope.
- Any change to what counts as a blocker, a severity or a preview — only where existing numbers
  come from.

## User stories

- As a reviewer with two runs expanded, I want `a` to accept only the finding I'm looking at, so
  that I don't silently accept findings I never looked at.
- As a reviewer, I want the form to show the current enabled state of the agent I'm editing, so that
  saving never undoes a change I made from the list.
- As a reviewer opening the trace of a run that is still going, I want to see it stream, so that I
  don't have to guess whether it's still running.
- As a user whose API is down, I want to be told that, not sent to set up a repository I already
  have.
- As a reviewer, I want to open a pull request in a new tab, so that I can compare several at once.

## Acceptance criteria (EARS)

**Keyboard shortcuts**

- **AC-1** — The system SHALL act on a keyboard shortcut only while the pointer or keyboard focus is
  within the panel that shortcut belongs to.
  _(observable: with two panels open, pressing `a` in one changes only that panel's focused finding)_
- **AC-2** — The system SHALL ignore a shortcut key pressed together with a modifier key.
  _(observable: Cmd+A, Ctrl+A and Alt+D inside a panel change nothing)_
- **AC-3** — WHEN a finding is selected by pointer, the system SHALL make it the target of the next
  keyboard shortcut.
  _(observable: clicking a card, then pressing `d`, dismisses that card, not the first one)_

**Run-settled notification**

- **AC-4** — The system SHALL call a run-settled callback once per transition from running to
  settled, regardless of how many times its container re-renders meanwhile.

**Agent form**

- **AC-5** — WHILE viewing an agent's editor, the system SHALL reflect that agent's current enabled
  state even when it was changed from elsewhere in the app.
- **AC-6** — WHEN the form is saved, the system SHALL NOT send a value for a field the form does not
  let the user change.
  _(observable: saving the form never includes `enabled` in its request body)_

**Live trace**

- **AC-7** — WHEN a reader opens the trace of a run that is still running, the system SHALL show its
  live log.

**Home page**

- **AC-8** — IF the repository list cannot be loaded, THEN the system SHALL show an error with a way
  to retry, distinct from the state shown when the list loads and is empty.

**List identity**

- **AC-9** — The system SHALL key a file card by the file's path, not its position in the list.

**Error and not-found pages**

- **AC-10** — WHEN a page throws during render, the system SHALL show a page belonging to the
  product, with a way to retry, instead of the framework's default.
- **AC-11** — WHEN a URL matches no page, the system SHALL show a page belonging to the product with
  a way back to the app.

**PR list navigation**

- **AC-12** — The system SHALL render each row of the pull-request list as a link to that pull
  request, openable with a modifier click or the keyboard, without triggering navigation when its
  findings icons are used.

## Edge cases

| Case | Handling |
|---|---|
| Two panels open, shortcut pressed on neither | Nothing happens in either |
| `shown` shrinks below the current focus index | The index clamps to the last item rather than pointing past the end |
| `onDone` prop changes identity mid-run | The latest one fires; none fires twice |
| Agent id changes while the form is open | The form reloads for the new agent, as it already does |
| A file card is mid-edit when the list reorders | Its key travels with it; nothing loses its open state incorrectly |
| A render error happens inside the root layout itself | The global error page renders without depending on anything that could itself be broken |

## Non-functional

- No new runtime dependency.
- No change to a contract or to server behaviour.

## Cross-module interactions

None — this spec is client-only.

## Untrusted inputs

None new.
