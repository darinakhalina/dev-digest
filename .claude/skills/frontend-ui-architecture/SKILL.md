---
name: frontend-ui-architecture
description: Use when deciding where frontend code goes in React or Next.js — creating, moving, splitting or naming a component, hook, constant, helper or util; promoting route-local code to shared; placing business logic; or choosing folders under client/src. ALWAYS invoke before creating a file or folder under client/src/ and before importing anything from another route's folder. Do not move code into src/components or src/lib without it. NOT for writing React correctly (react-best-practices), RSC, rendering or data-fetching mechanics (next-best-practices), or tests (react-testing-library).
metadata:
  version: "1.0.0"
---

# Frontend UI architecture

Decides **where** frontend code lives and **which way imports may point**. It does not decide how to
write the code — the skills named in the description do that.

## In this repository

`client/AGENTS.md` is the binding answer for this repo's conventions — thin pages, `_components/`,
data only through `src/lib/hooks/*` → `src/lib/api.ts`, strings in `messages/`. Read it first. This
skill covers the judgement those rules leave open, and never overrides them.

Before creating a constant, helper, hook or component, search for an existing one. A second
definition of something that already exists is the most common way a codebase drifts.

## Where each kind of code goes

| The code | Goes in |
|---|---|
| UI used by one route | that route's `_components/<Name>/` |
| UI used by several routes, as-is | `src/components/<kebab-name>/` |
| A generic primitive (button, badge, layout) | `@devdigest/ui`, never re-implemented locally |
| React state, effects, data wiring | a hook — data hooks in `src/lib/hooks/` |
| A pure rule that defines what a domain value **means** | the `src/lib/<domain>.ts` module that owns it |
| Any other pure logic with one caller | beside it: `<Name>/helpers.ts` or the route's `helpers.ts` |
| Values used by one component or route | beside it: `constants.ts` |

Shared UI or a primitive? If it knows anything about this app — a contract type, a domain rule, a
`messages/` string — it is shared UI in `src/components/`. Only a component that knows nothing about
the app belongs in `@devdigest/ui`.

Sibling files are named plainly — `constants.ts`, `helpers.ts`, `styles.ts`, `index.ts` — never
`<Name>.constants.ts`.

## Three rules

**1. A second import is not a second consumer.** Promote to shared only when the new place can use
the thing *as it is*: same data shape, same contract, same allowed behaviour. If the second place
would need different props, data it does not have, or behaviour its spec forbids, it needs its own
variant, not a move. Check the data and the spec before moving anything.

**2. A domain rule outranks colocation.** Keep single-caller code beside its caller — except a rule
that says what a domain value means (that `null` cost is "unknown" and `0` is "free" in
`src/lib/cost.ts`, the order of severities in `src/lib/severity.ts`). That lives with the module
owning the meaning, even with one caller, because a second copy of a domain rule silently diverges.
If no module owns that meaning yet, create `src/lib/<domain>.ts` rather than parking the rule beside
its caller. Import it from that module, not
through a sibling's `constants.ts` that re-exports it — the re-export hides where the rule lives.

**3. Imports point one way.**

```
page.tsx → its _components/ → src/components/, src/lib/, @devdigest/ui, src/vendor/shared
```

A route never imports another route's `_components/` — a parent route's included. `src/components/`
and `src/lib/` never import from `app/`. Needing the reverse means something is in the wrong place.

## Heuristics, not rules

No primary source sets a line limit for a component or a file-count limit for a folder. "~200 lines"
and "~15 files" are folklore; treat size as a reason to look, and split by responsibility.

## References — load the one the task needs

- Folders, promotion, dependency direction, barrels, naming → [references/structure-and-boundaries.md](references/structure-and-boundaries.md)
- Component vs hook vs pure function vs lib module, constants, helpers vs utils → [references/logic-placement.md](references/logic-placement.md)
- App Router organisation, the client boundary, what applies to this client → [references/nextjs-organization.md](references/nextjs-organization.md)

Sources, contested points and the changelog: [README.md](README.md).
