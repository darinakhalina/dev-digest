# Logic placement

Which layer a piece of code belongs to — component, hook, pure function or domain module — and where
constants, helpers and utils go. How to write each of those correctly is `react-best-practices`;
this file only decides where they live. Sources are in `../README.md`.

## Contents

- [Separate view from non-view logic](#separate-view-from-non-view-logic)
- [The placement map](#the-placement-map)
- [Domain rules and single callers](#domain-rules-and-single-callers)
- [Hooks: when a hook, and where](#hooks-when-a-hook-and-where)
- [Constants](#constants)
- [Helpers vs utils](#helpers-vs-utils)
- [Container/presentational is not required](#containerpresentational-is-not-required)
- [Do not layer what has no logic](#do-not-layer-what-has-no-logic)

## Separate view from non-view logic

Juntao Qiu's article on martinfowler.com states the principle: separate view from non-view logic,
split the non-view logic further by responsibility, and put each piece in its place. His reason is
that the React view is only one consumer of non-view code, so squeezing everything into components or
hooks couples logic to rendering for no gain.

react.dev draws the same line from the other side: a reducer "is a pure function that doesn't depend
on your component", and logic shared between event handlers becomes a plain function those handlers
call.

## The placement map

| The code | Layer | In this client |
|---|---|---|
| Markup and layout | component | the route's `_components/<Name>/`, or `src/components/` when shared |
| React state, effects, subscriptions | custom hook | beside its only consumer; `src/lib/hooks/` once shared |
| Server data: fetching, caching, invalidation | data hook over the API client | `src/lib/hooks/*` → `src/lib/api.ts` only — `client/AGENTS.md` |
| A rule defining what a domain value means | pure function in a domain module | `src/lib/<domain>.ts` — `severity.ts`, `cost.ts` |
| Other pure logic | pure function | `<Name>/helpers.ts`, or the route's `helpers.ts` |
| Values | constants | `constants.ts` beside the consumer |
| User-facing strings | messages | `messages/en/<area>.json`, never in JSX |

Server state is a cache, not client state. Kent C. Dodds, TkDodo (the TanStack Query maintainer) and
the TanStack docs all say to keep it in the cache library and not copy it into local or global state.
In this client that library is TanStack Query, and the only door to it is `src/lib/hooks/`.

## Domain rules and single callers

The sources genuinely disagree here, so the choice is stated, not assumed.

- **Colocate** (Kent C. Dodds, Josh Comeau, Robin Wieruch): code with one caller stays beside it and
  moves up when a second caller appears.
- **Place by responsibility** (Qiu, Fowler): non-view logic belongs with the responsibility it
  implements, and at scale the top level becomes domain modules.

**This skill's position:** colocate by default, with one exception. A rule that says what a domain
value *means* lives in the `src/lib/` module that owns that meaning, even with a single caller:

- that a `null` cost is "unknown" and `0` is "free" — `src/lib/cost.ts`
- the set of severities and their order — `src/lib/severity.ts`

When a domain rule has no owning module yet — what a run status implies has none today — create
`src/lib/<domain>.ts` for it rather than parking the rule beside the one caller that needs it first.

The reason is drift. A domain rule restated beside one caller is a second copy, and copies diverge
without anyone noticing: this client already holds the severity levels in three places that have
drifted, and the fourth copy is always one convenient `constants.ts` away.

The test: *would another screen that showed this value need the same rule to show it correctly?* If
yes, it is a domain rule. If it only arranges data for this one component, it is a helper.

## Hooks: when a hook, and where

From react.dev:

- A custom hook shares **stateful logic, not state** — each call gets its own.
- Name a function `use…` only if it calls hooks. A function that doesn't is a plain function
  (`getSorted`, not `useSorted`).
- "You don't need to extract a custom Hook for every little duplicated bit of code."
- No lifecycle wrappers such as `useMount` — keep each hook to one concrete purpose.
- If the hook can't be given a name a non-programmer could guess the purpose of, it is not ready to
  be extracted.

Whether to extract a hook with a single use is contested: Qiu and TkDodo (2020) say yes, react.dev
and Kent's AHA ("Avoid Hasty Abstractions") say wait. Placement is not contested — a hook starts
beside its only consumer and moves to `src/lib/hooks/` when shared.

## Constants

- Values used by one component go in `<Name>/constants.ts`; values used by one route in the route's
  `constants.ts`. This client has seventeen of them, all named plainly.
- A value that defines a domain concept is not a local constant — it is a domain rule, and it lives
  in `src/lib/<domain>.ts` (see above). `SEVERITY_ORDER` is the example: already exported from
  `src/lib/severity.ts`, and a component that needs an order imports it rather than redefining it.
- Name magic numbers and strings. ESLint's `no-magic-numbers` defines them as numbers without an
  explicit meaning that should become named constants; the rule is opt-in.
- User-facing text is not a constant. It goes in `messages/`.

## Helpers vs utils

Josh Comeau's definitions:

- **A helper** is something specific to a given project.
- **A utility** is a generic function that accomplishes an abstract task, meaningful in any project.

Both start beside their consumer and move up when reused in several places. A `utils.ts` that nobody
can name the purpose of is a junk drawer: split it by what the functions belong to, and move the
ones that belong to one component back beside it.

No primary source requires helpers or utils to be pure, but code with side effects is not a helper:
network calls belong in `src/lib/api.ts` behind a data hook, and effects belong in a hook.

## Container/presentational is not required

Dan Abramov introduced the container/presentational split in 2015 and withdrew it in 2019:

> "I don't suggest splitting your components like this anymore."

Hooks now separate stateful logic from rendering without an arbitrary component split. TkDodo reaches
the same conclusion for data: a Dashboard does not need a DashboardView and a DashboardContainer.
Do not create container components to hold data wiring; use a hook.

## Do not layer what has no logic

The layering above pays off only where real logic exists. A single request or a one-line transform
does not need a hook, a helper and a domain module. Put code in the lowest layer that can hold it,
and add a layer when the code gives you a reason.
