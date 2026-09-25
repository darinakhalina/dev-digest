# Insights — client

Non-obvious, file-grounded findings that reading the code does not reveal.
Written and maintained through the `engineering-insights` skill, which carries the format,
the section rules and the quality bar.

## What Works

## What Doesn't Work

**2026-09-21** — Do not key UI state in a findings panel on the identity of its `findings` prop.
`useFindingAction` invalidates `["reviews", prId]` on success, the refetch hands down a fresh array,
and any `useEffect` with `findings` in its deps fires on every accept/reject — a severity filter
reset itself the moment the reader acted on a card, which reads as the list jumping on its own.
Reviews are per-run and each run mounts its own panel, so remount already gives fresh state; key
such effects on `prId` alone. Evidence: client/src/lib/hooks/reviews.ts:158

## Codebase Patterns

**2026-09-19** — One run's token count is rendered two different ways on screens a click apart: the
Agent-runs timeline sums them (`9,119 tok`, `RunCostBadge.tsx:31`) while the trace drawer keeps them
separate and rounded (`12k→1.5k`, `RunTraceDrawer/helpers.ts:27`). Neither is wrong on its own, but
the same run reads as two different numbers, and the drawer's form cannot be compared to the
timeline's at all. Reuse one of the two when adding a third surface rather than inventing a format
that matches neither. Evidence: client/src/components/run-cost-badge/RunCostBadge.tsx:31

**2026-09-22** — A severity level lives in THREE places, not the two that the root `CLAUDE.md`'s
"check both `vendor/shared` copies" gotcha implies: the two vendored contract copies, and
`@devdigest/ui`'s own hand-written `Severity` union, which knows nothing about the contract or its
vendoring. Those two have already drifted — the UI union carries an `INFO` the contract has never
had, which is why `INFO` sits dead in every `SEVERITY_ORDER`. Adding a level is three edits.
Known from an experiment rather than from reading the code: adding a fourth level to both contract
copies and running `pnpm typecheck` gave SEVEN errors, not one — the exhaustiveness guard in
`lib/severity.ts`, plus six at call sites in four files where `<SeverityBadge>` or the `SEV` record
rejected the new member. So missing the third place costs a failed typecheck that names every site,
never a silent gap; make all three edits in one change instead of discovering them one compiler run
at a time. Evidence: client/src/vendor/ui/primitives/tokens.ts:3

**2026-09-25** — A disclosure header (`role="button" onClick={toggle}`) that contains a real nested
`<button>` cannot use `e.stopPropagation()` on the child alone to keep Enter/Space from also
toggling the parent: `stopPropagation` only stops the click from bubbling, but a native button's own
Enter/Space→click synthesis still fires, and React's synthetic `onKeyDown` on the ancestor still
sees that keydown regardless of the child's click-time `stopPropagation`. The fix applied across five
disclosure headers (`FindingCard`, `FileCard`, `TraceSection`, `ToolCallRow`, `PromptBlock`) is a
target guard on the parent's own `onKeyDown`: `if (e.target !== e.currentTarget) return;` before
handling Enter/Space. `PromptBlock` is the sharpest case — its copy/fullscreen buttons already called
`e.stopPropagation()` on click, which reads as "already handled," but Enter on either button still
toggled the header's `open` state until the target guard was added. Evidence:
client/src/app/repos/[repoId]/pulls/[number]/_components/RunTraceDrawer/_components/PromptBlock/PromptBlock.tsx:36

## Tool & Library Notes

**2026-09-21** — When two inputs open the same thing, the test that matters CROSSES them; one test
per input passes on a component that is broken. A timeline preview panel kept a single open-slot
for pointer and keyboard and passed every test in its file — hover opens, hover closes, focus
opens, Escape closes, each on its own — while Chrome closed it on `mouseleave` although focus was
still holding it open. jsdom can express the crossing: `mouseEnter → focus → mouseLeave` fails on
the single-slot version. Nothing made anyone write it, and this client's gate cannot make up for
that — typecheck, vitest and build all stayed green; a browser pass is what exposed it.
Evidence: client/src/app/repos/[repoId]/pulls/[number]/_components/RunHistory/RunHistory.test.tsx:223

## Recurring Errors & Fixes

**2026-09-21** — The client's `vendor/shared` barrel cannot be used to import a VALUE. It
re-exports `./contracts/findings.js` while the files on disk are `.ts` — the server's extension
convention, carried into the client along with the vendored copy — and Next's bundler does not
rewrite `.js` to `.ts`, so the page 500s with module-not-found pointing at the importing file.
Every other client import from that barrel is an `import type`, which is erased before bundling,
which is why the mine sat untouched. Import a value deep instead, past the barrel:
`from "@devdigest/shared/contracts/findings"` — the `@devdigest/shared/*` alias already exists in
`client/tsconfig.json`. `pnpm typecheck` and vitest both resolve the extension themselves and stay
green on the broken import, so this is only reproducible through `pnpm dev`.
The deep import is no longer the remedy: `next.config.mjs` now sets
`resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"] }`, which teaches the bundler what tsc
and vitest already did, so the barrel is importable as a value like any other module. The deep
import fixed one call site and left the mine for whoever came next.
Evidence: client/src/vendor/shared/index.ts:19

**2026-09-21** — Supersedes the entry above, which is no longer true and whose advice should not
be followed: the barrel now carries values fine, and importing past it is not the fix. The cause
was the bundler alone, and it is cured once for the whole package by `resolve.extensionAlias =
{ ".js": [".ts", ".tsx", ".js"] }` in `client/next.config.mjs` — tsc and vitest already did this
themselves, which is why only `pnpm dev` / `pnpm build` ever saw the breakage. Import values from
`@devdigest/shared` normally; if such an import fails to resolve, suspect that config line was
removed rather than reaching for a deep import.
Evidence: client/next.config.mjs:10

**2026-09-25** — A Next.js special file (`page.tsx`, `layout.tsx`, `not-found.tsx`, `loading.tsx`,
`template.tsx`) that imports anything from `@devdigest/ui` and lacks `"use client"` crashes every
route it applies to with `Super expression must either be null or a function`, not a targeted error —
`not-found.tsx` had no directive, imported only `Icon`, and that was enough to take the whole app
down, because the barrel (`vendor/ui/index.ts`) re-exports `./charts` unconditionally, and
`charts/LineChart.tsx` imports `recharts`, a client-only library whose class components can't
evaluate in the RSC module graph. `error.tsx`/`global-error.tsx` are safe from this because Next
itself refuses to build them without `"use client"`; `not-found.tsx` has no such enforcement, so nothing
catches a missing directive there. The file was introduced in this state at 18:35 and survived two more
"typecheck && vitest && build" verification passes (through 19:35+) before anyone opened a browser —
not because those checks were run carelessly, but because none of them can see this bug in principle.
Confirmed by directly testing the failure boundary, not assuming it: reintroducing the missing
directive and running `next build` → `next start` → `curl` a real 404 URL served a correct "Page not
found" page, no crash. Only `next dev` reproduces it — production's build-time client-reference-manifest
pass resolves the server/client module boundary for the whole app graph up front, while `next dev`
compiles each route's RSC and client layers incrementally and lazily on first hit, and it is that
incremental compilation that puts `recharts` in the wrong layer. So neither `pnpm typecheck`, nor
vitest, nor even `pnpm run build`, is a substitute for opening the dev server and requesting the page —
that is the one check with any chance of catching this class of bug, and it wasn't run until asked for.
Before adding a new Next special file (`page.tsx`, `layout.tsx`, `loading.tsx`, `template.tsx`,
`not-found.tsx`), grep it for `"use client"` if it, even transitively through a barrel, touches
`@devdigest/ui`. Evidence: client/src/app/not-found.tsx:1

**2026-09-25** — A fake `EventSource` for testing `useRunEvents` must NOT route every `emit(kind,
data)` through `onmessage`: real `EventSource.onmessage` fires only for a default SSE frame (no
`event:` field, i.e. jsdom/browser semantics call it a `"message"` event); a named event like
`event: tool` reaches only listeners added via `addEventListener("tool", …)`, never `onmessage`.
`useRunEvents` (`lib/hooks/reviews.ts:169`) relies on exactly this split — it sets `es.onmessage` and
also registers the same handler for `"info"|"tool"|"result"|"error"` via `addEventListener` — so a
fake that calls both on every emit double-counts: one test asserted 2 accumulated events after two
named emits and got 3. Route `"message"` to `onmessage` and every other kind only to that kind's
listeners. Evidence: client/src/lib/hooks/useRunEvents.test.ts:26

## Session Notes

## Open Questions
