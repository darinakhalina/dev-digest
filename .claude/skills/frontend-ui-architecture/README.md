# frontend-ui-architecture

**Version:** 1.0.0 · **Scope:** `client/` — React 19, Next.js 15 App Router · **Last updated:** 2026-09-25

Human-facing documentation for the skill: what it decides, where its boundary with the neighbouring
skills lies, why it contains what it contains, and every source behind it. The agent reads
`SKILL.md` and the files in `references/`; this file is not loaded into a session.

## What it decides

**Where frontend code lives, and which way imports may point** — nothing about how to write it.

| Area | File |
|---|---|
| The placement table, three rules, heuristics | [SKILL.md](SKILL.md) |
| Folder strategies, promotion, dependency direction, enforcement, barrels, naming, nesting | [references/structure-and-boundaries.md](references/structure-and-boundaries.md) |
| Component vs hook vs pure function vs domain module; constants; helpers vs utils | [references/logic-placement.md](references/logic-placement.md) |
| App Router organisation, the client boundary, what applies to this client, version notes | [references/nextjs-organization.md](references/nextjs-organization.md) |

## Boundary with the neighbouring skills

| Question | Skill |
|---|---|
| Where does this component, hook, constant or helper go? Which way may this import point? | **frontend-ui-architecture** |
| Is this React usage correct — hooks rules, state hygiene, composition idioms, anti-patterns? | `react-best-practices` |
| What do `page`, `_folder`, `(group)` mean? RSC rules, data fetching, metadata, route handlers? | `next-best-practices` |
| How do I test this component? | `react-testing-library` |
| Type-level questions | `typescript-expert` |

One line: **this skill places code; the others implement it.** On a mixed task, use them together.

The binding answer for this repository's own conventions is `client/AGENTS.md`. The skill refers to
it and never restates it, so a rule lives in one place and cannot drift.

## Why it contains what it contains

The skill was written test-first. Before any of it existed, three fresh agents were given the same
five real placement questions about this client, with everything the repository already had — its
`AGENTS.md` files, docs and the other skills.

| Question | Result without the skill |
|---|---|
| A component two pages need | all three: `src/components/<kebab>/`, correct |
| A severity sort table | all three found the existing `SEVERITY_ORDER`, correct |
| A pure total-cost function with one caller | **split 2:1** — `src/lib/cost.ts` vs the route's `helpers.ts` |
| A detail-page component the list page wants | **one of three** moved it without noticing the list lacks its data and its spec forbids its buttons |
| A refresh button on a 185-line page | all three: into `FindingsTab`, via the existing `refetch`, correct |

So the agent already placed most code correctly — deriving it from precedent at a cost of ~130k
tokens and 18–19 file reads per run. What failed was narrow, and the skill addresses exactly that:

- the split on question 3 → rule 2, *a domain rule outranks colocation*
- the blind move on question 4 → rule 1, *a second import is not a second consumer*
- gaps all three agents named unprompted — the two folder casings, whether a parent route's
  `_components/` may be imported → rule 3 and a new entry in `client/AGENTS.md`

What the agents already did right is deliberately left out. Writing it down would only cost tokens.

### Measured with the skill

The same prompt, word for word, plus one line telling the agent to load the skill. Three runs:

| | Without the skill | With the skill |
|---|---|---|
| Question 3 — pure function, one caller | split 2:1 | **3:0**, each citing rule 2 |
| Question 4 — moving `FindingCard` | 1 of 3 moved it blind | **0 of 3**; all ran the data and contract checks and reused `FindingPreviewPanel` |
| Question 1 — a parent route's `_components/` | all three unsure | all three cited the rule |
| File reads per run | 18 · 19 · 18 | **12 · 13 · 11** |
| Time per run | 134 · 148 · 147 s | **88 · 89 · 84 s** |
| Tokens per run | 122k · 130k · 134k | **114k · 116k · 102k**, loading the skill included |

The runs raised two doubts the first draft left open, and both were closed before release: whether
something app-aware counts as a design-system primitive, and importing a domain rule through a
sibling's re-export. A control run afterwards resolved both, and exposed one wrong example — rule 2
named "what a run status implies" as owned by a module that does not exist — which was replaced with
the instruction to create the owning module.

This measures whether the skill teaches the right thing once loaded. Whether it triggers on its own
from the description was not measured.

## Where this differs from the lesson's reference skill

The lesson branch `upstream/lesson-2-lab/skills` ships a `frontend-architecture` skill. It was read
in full and used as input; what it does well was taken, and it is not the standard.

**Taken from it:** the neighbour-routing table, the helpers-vs-utils distinction, the caution against
layering code that has no logic, the hook naming test, the route-group pitfalls, the warning against
`'use client'` on a whole page, the thin-Server-Action rule, and the README layout.

**Not taken, and why:**

- `ReviewCard.constants.ts` naming — this client has seventeen `constants.ts` files and none named
  that way.
- `index.ts` as a feature's public API — the primary sources are split on it; this client's actual
  pattern is one `index.ts` per component folder.
- A variable-naming table (UPPER_SNAKE, `is`/`has`) — code style, not architecture.
- Signals for splitting a component and composition techniques — already in `react-best-practices`.
- "~200 lines" as a rule — no primary source states it.
- Its 70+ sources as a flat list — most are secondary, and primary and secondary were not told apart.

## Contested points

Where primary sources disagree. The skill takes a position on the first two and says so; the rest are
recorded so the next reader does not mistake one side for consensus.

1. **Single-caller logic.** Colocate it (Dodds, Comeau, Wieruch) or place it by responsibility (Qiu,
   Fowler). *Skill's position:* colocate, except a rule defining what a domain value means.
2. **Barrel files.** FSD requires an `index` per slice; Bulletproof, Vite and TkDodo say avoid them;
   Comeau measured the cost as negligible. *Skill's position:* one `index.ts` per component folder,
   never `export *` over a folder.
3. **When to split a component.** react.dev: when it grows. Kent: not before real problems. Qiu: keep
   small cohesive components together.
4. **Extracting a single-use hook.** Qiu and TkDodo (2020) yes; react.dev and Kent's AHA wait. TkDodo
   reversed in 2024–2026 for query configuration, preferring `queryOptions`.
5. **Feature or type folders.** Comeau by type; Bulletproof, FSD, Wieruch, Fowler by feature; the
   React FAQ and Next.js take no side.
6. **Casing.** kebab-case (Bulletproof, Wieruch, Next.js Learn) vs PascalCase files (Comeau, React
   and FSD examples). This client uses both, by scope — recorded in `client/AGENTS.md`.
7. **May features import each other?** Bulletproof no; FSD a code smell with four remedies; Nx yes.
8. **Where the DAL and Server Actions live.** The Next.js docs' own examples disagree with each other.

## Heuristics versus rules

No primary source sets a line limit for a component. `~200 lines` appears only in secondary posts;
ESLint's `max-lines` defaults to 300 and is a configurable tool default. `~15 files` most likely comes
from FSD's Steiger linter, whose threshold is described as chosen arbitrarily. Nesting limits — three
or four folders (old React FAQ), two component levels (Wieruch) — are both stated as recommendations.

## Sources

Every source below was opened and read in full on 2026-09-25; quotes were checked against the page's
own text, not a model's summary. Dates are publication or last-updated dates where the page gives one.

### Primary — structure and boundaries

- [Project Structure — Bulletproof React](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md) · Alan Alickovic · 2024-11-12
- [Project Standards — Bulletproof React](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-standards.md) · Alan Alickovic
- [Overview — Feature-Sliced Design](https://feature-sliced.design/docs/get-started/overview) · 2026-07-29
- [Public API — Feature-Sliced Design](https://feature-sliced.design/docs/reference/public-api) · 2026-05-28
- [Cross-imports — Feature-Sliced Design](https://feature-sliced.design/docs/guides/issues/cross-imports) · 2026-02-23
- [Usage with Next.js — Feature-Sliced Design](https://feature-sliced.design/docs/guides/tech/with-nextjs) · 2026-06-08
- [Steiger — FSD linter](https://github.com/feature-sliced/steiger)
- [React Folder Structure Best Practices [2026]](https://www.robinwieruch.de/react-folder-structure/) · Robin Wieruch · 2026-05-05
- [Colocation](https://kentcdodds.com/blog/colocation) · Kent C. Dodds · 2019-06-17
- [Delightful React File/Directory Structure](https://www.joshwcomeau.com/react/file-structure/) · Josh W. Comeau · 2022-03-15, updated 2025-12-03
- [File Structure — React legacy docs](https://legacy.reactjs.org/docs/faq-structure.html) · React team (no longer updated)
- [react-file-structure](https://react-file-structure.surge.sh/) · Dan Abramov
- [Screaming Architecture](https://blog.cleancoder.com/uncle-bob/2011/09/30/Screaming-Architecture.html) · Robert C. Martin · 2011-09-30
- [PresentationDomainDataLayering](https://martinfowler.com/bliki/PresentationDomainDataLayering.html) · Martin Fowler · 2015-08-26
- [Please Stop Using Barrel Files](https://tkdodo.eu/blog/please-stop-using-barrel-files) · Dominik Dorfmeister · 2024-07-26
- [Speeding up the JavaScript ecosystem — the barrel file debacle](https://marvinh.dev/blog/speeding-up-javascript-ecosystem-part-7/) · Marvin Hagemeister · 2023-10-08
- [Performance — Vite](https://vite.dev/guide/performance)
- [How we optimized package imports in Next.js](https://vercel.com/blog/how-we-optimized-package-imports-in-next-js) · Shu Ding · 2023-10-13
- [no-restricted-paths — eslint-plugin-import](https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-restricted-paths.md)
- [eslint-plugin-boundaries](https://github.com/javierbrea/eslint-plugin-boundaries)
- [Rules reference — dependency-cruiser](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md)
- [Enforce Module Boundaries — Nx](https://nx.dev/docs/kb/project-dependency-rules)

### Primary — component design and logic placement

- [Thinking in React](https://react.dev/learn/thinking-in-react) · react.dev
- [Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure) · react.dev
- [Sharing State Between Components](https://react.dev/learn/sharing-state-between-components) · react.dev
- [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) · react.dev
- [Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks) · react.dev
- [Keeping Components Pure](https://react.dev/learn/keeping-components-pure) · react.dev
- [Passing Data Deeply with Context](https://react.dev/learn/passing-data-deeply-with-context) · react.dev
- [Extracting State Logic into a Reducer](https://react.dev/learn/extracting-state-logic-into-a-reducer) · react.dev
- [Children](https://react.dev/reference/react/Children) and [cloneElement](https://react.dev/reference/react/cloneElement) · react.dev
- [Higher-Order Components — React legacy docs](https://legacy.reactjs.org/docs/higher-order-components.html)
- [Modularizing React Applications with Established UI Patterns](https://martinfowler.com/articles/modularizing-react-apps.html) · Juntao Qiu · 2023-02-16
- [When to break up a component into multiple components](https://kentcdodds.com/blog/when-to-break-up-a-component-into-multiple-components) · Kent C. Dodds · 2019-07-19
- [AHA Programming](https://kentcdodds.com/blog/aha-programming) · Kent C. Dodds · 2020-06-22
- [State Colocation will make your React app faster](https://kentcdodds.com/blog/state-colocation-will-make-your-react-app-faster) · Kent C. Dodds · 2019-09-23
- [Application State Management with React](https://kentcdodds.com/blog/application-state-management-with-react) · Kent C. Dodds · 2020-07-21
- [Compound Components with React Hooks](https://kentcdodds.com/blog/compound-components-with-react-hooks) · Kent C. Dodds · 2019-02-18
- [Inversion of Control](https://kentcdodds.com/blog/inversion-of-control) · Kent C. Dodds · 2019-11-18
- [Presentational and Container Components](https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0) · Dan Abramov · 2015, update 2019 (medium.com returns 403 to tools; wording checked on a Wayback Machine copy)
- [Writing Resilient Components](https://overreacted.io/writing-resilient-components/) · Dan Abramov · 2019-03-16
- [Before You memo()](https://overreacted.io/before-you-memo/) · Dan Abramov · 2021-02-23
- [Goodbye, Clean Code](https://overreacted.io/goodbye-clean-code/) · Dan Abramov · 2020-01-11
- [The WET Codebase](https://overreacted.io/the-wet-codebase/) · Dan Abramov · 2020-07-13
- [Practical React Query](https://tkdodo.eu/blog/practical-react-query) · Dominik Dorfmeister · 2020, updated 2023-10-21
- [React Query as a State Manager](https://tkdodo.eu/blog/react-query-as-a-state-manager) · Dominik Dorfmeister · 2021-08-20
- [Creating Query Abstractions](https://tkdodo.eu/blog/creating-query-abstractions) · Dominik Dorfmeister · 2026-02-23
- [The Query Options API](https://tkdodo.eu/blog/the-query-options-api) · Dominik Dorfmeister · 2024-01-17
- [Working with Zustand](https://tkdodo.eu/blog/working-with-zustand) · Dominik Dorfmeister · 2022-11-20
- [Does TanStack Query replace Redux, MobX or other global state managers?](https://tanstack.com/query/latest/docs/framework/react/guides/does-this-replace-client-state) · TanStack
- [Redux Style Guide](https://redux.js.org/style-guide/) · Redux team
- [patterns.dev](https://www.patterns.dev/) · weaker primary: pages are unsigned
- [no-magic-numbers — ESLint](https://eslint.org/docs/latest/rules/no-magic-numbers)
- [The Single Responsibility Principle](https://blog.cleancoder.com/uncle-bob/2014/05/08/SingleReponsibilityPrinciple.html) · Robert C. Martin · 2014-05-08

### Primary — Next.js App Router

All nextjs.org pages report Next.js 16.3.6; this client runs 15, so version-specific points are gated
in `references/nextjs-organization.md`.

- [Project Structure](https://nextjs.org/docs/app/getting-started/project-structure) · 2026-07-21
- [src Folder](https://nextjs.org/docs/app/api-reference/file-conventions/src-folder) · 2025-10-17
- [Route Groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups) · 2025-06-16
- [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) · 2026-08-25
- [Server and Client Boundary](https://nextjs.org/docs/app/guides/server-and-client-boundary) · 2026-08-25
- [How to think about data security](https://nextjs.org/docs/app/guides/data-security) · 2026-08-25
- [Authentication](https://nextjs.org/docs/app/guides/authentication) · 2026-08-25
- [Mutating Data](https://nextjs.org/docs/app/getting-started/mutating-data) · 2026-08-25 (formerly "Updating Data")
- [Server Actions and Mutations](https://nextjs.org/docs/app/guides/server-actions) · 2026-06-17
- [use server](https://nextjs.org/docs/app/api-reference/directives/use-server) and [use client](https://nextjs.org/docs/app/api-reference/directives/use-client) · 2026-08-25
- [Backend for Frontend](https://nextjs.org/docs/app/guides/backend-for-frontend) · 2026-06-25
- [Fetching Data](https://nextjs.org/docs/app/getting-started/fetching-data) · 2026-09-07
- [proxy.js](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) · 2026-09-07
- [Upgrading to Version 15](https://nextjs.org/docs/app/guides/upgrading/version-15) and [to Version 16](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Next.js 16](https://nextjs.org/blog/next-16) · Next.js team · 2025-10-21
- [Single-Page Applications](https://nextjs.org/docs/app/guides/single-page-applications) · 2026-08-25
- [use client](https://react.dev/reference/rsc/use-client), [use server](https://react.dev/reference/rsc/use-server), [Server Components](https://react.dev/reference/rsc/server-components), [Server Functions](https://react.dev/reference/rsc/server-functions) · react.dev
- [What Does "use client" Do?](https://overreacted.io/what-does-use-client-do/) · Dan Abramov · 2025-04-25
- [How to Think About Security in Next.js](https://nextjs.org/blog/security-nextjs-server-components-actions) · Sebastian Markbåge · 2023-10-23 — partly outdated (action IDs, `middleware.ts`)
- [Common mistakes with the Next.js App Router](https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them) · Lee Robinson · 2024-01-08 — partly outdated (GET caching)
- [next-learn dashboard final example](https://github.com/vercel/next-learn/tree/main/dashboard/final-example) · Vercel

### Secondary — kept because they add what primary sources lack

- [How We Achieved 75% Faster Builds by Removing Barrel Files](https://www.atlassian.com/blog/atlassian-engineering/faster-builds-when-removing-barrel-files) · Atlassian · 2025-06-26 — the only large-scale measurement found
- [Screaming Architecture — Evolution of a React folder structure](https://dev.to/profydev/screaming-architecture-evolution-of-a-react-folder-structure-4g25) · Johannes Kettmann · 2022-02-25 — the only source applying Martin's idea to React folders
- [next-safe-action](https://next-safe-action.dev/docs/getting-started) — evidence of community practice for centralised action clients
- [Next.js App Router Project Structure](https://makerkit.dev/blog/tutorials/nextjs-app-router-project-structure) · Makerkit — evidence of community colocation practice; its date does not match its title
- *Clean Code*, chapter 10, Robert C. Martin — origin of the "describe it without 'and'" test; the wording could only be checked through secondary course notes

### Consulted, not individually verified

The source list of the lesson's reference skill, `upstream/lesson-2-lab/skills`, read as input. These were not opened and checked one by one for this skill, and nothing in `SKILL.md` or `references/` rests on them alone. Listed so the record of what was used is complete.

Reachability, checked 2026-09-25: 40 of the 63 return HTTP 200. Of the rest, 21 — twenty
Medium-hosted pages and one DZone page — answer automated requests with 403 and are probably fine in
a browser; the two
`profy.dev` links do not resolve at all (DNS failure). By contrast, 84 of the 85 verified sources
above return 200 — the exception is the Medium original of Dan Abramov's article, noted where it is
listed.

- [Recommended Folder Structure for React 2025 — DEV (Pramod Boda)](https://dev.to/pramod_boda/recommended-folder-structure-for-react-2025-48mc)
- [How to structure a React App in 2025 (SPA/SSR/Native) — Ramon Prata](https://ramonprata.medium.com/how-to-structure-a-react-app-in-2025-spa-ssr-or-native-10d8de7a245a)
- [How to Build a Professional React Project Structure in 2025 — Netguru](https://www.netguru.com/blog/react-project-structure)
- [Guidelines to improve your React folder structure — Max Rozen](https://maxrozen.com/guidelines-improve-react-app-folder-structure)
- [How to Structure a React Project in 2025: Clean, Scalable, Practical — DEV](https://dev.to/algo_sync/how-to-structure-a-react-project-in-2025-clean-scalable-and-practical-15j6)
- [Production-Grade React Project Structure — DZone](https://dzone.com/articles/production-grade-react-project-structure)
- [Popular React Folder Structures and Screaming Architecture — profy.dev](https://profy.dev/article/react-folder-structure)
- [How To Structure React Projects Beginner→Advanced — Web Dev Simplified](https://blog.webdevsimplified.com/2022-07/react-folder-structure/)
- [4 folder structures to organize your React project — reboot.studio](https://reboot.studio/blog/folder-structures-to-organize-react-project)
- [Bulletproof React (canonical feature-based example) — GitHub](https://github.com/alan2207/bulletproof-react)
- [3 Folder Structures in React… Why Feature-Based — Asrul Kadir](https://asrulkadir.medium.com/3-folder-structures-in-react-ive-used-and-why-feature-based-is-my-favorite-e1af7c8e91ec)
- [Mastering React Folder Structures — Deltaromeoyanki](https://medium.com/@deltaromeoyanki/mastering-react-folder-structures-your-ultimate-guide-to-scalable-and-maintainable-projects-5e200d630025)
- [react-folder-structures — GitHub (balajidharma)](https://github.com/balajidharma/react-folder-structures)
- [Separation of concerns with React hooks — Felix Gerschau](https://felixgerschau.com/react-hooks-separation-of-concerns/)
- [Separating responsibilities using Hooks — Sairys](https://sairys.medium.com/react-separating-responsibilities-using-hooks-b9c90dbb3ab9)
- [Path To A Clean(er) React Architecture pt.6 — Business Logic Separation — profy.dev](https://profy.dev/article/react-architecture-business-logic-and-dependency-injection)
- [Separating Business Logic from UI Components in React 18 — Israel (Bootcamp)](https://medium.com/design-bootcamp/separating-%EF%B8%8F-business-logic-from-ui-components-in-react-18-aa1775b3caba)
- [React Separation of Concern — Mehul Thakkar](https://mehulcse.com/blogs/react-separation-of-concern)
- [Why Separating Business Logic From Components Matters — Asrul Kadir](https://asrulkadir.medium.com/why-separating-business-logic-from-components-matters-in-react-applications-5dbe2c71a2ba)
- [Where to Write Business Logic in React — Filippo Rivolta (Stackademic)](https://medium.com/@rivoltafilippo/where-to-write-business-logic-in-react-separation-of-concers-for-frontend-interviews-59283b5d4b27)
- [Best Practices for Keeping React UI and Logic Separate — DhiWise](https://www.dhiwise.com/post/mastering-the-art-of-separating-ui-and-logic-in-react)
- [Single Responsibility in ReactJS — Roni Shabo](https://medium.com/@roni.shabo/single-responsibility-in-reactjs-9c60e4163862)
- [Splitting a UI into Components: Six Pillars of Component Architecture — Abbas Roholamin](https://medium.com/@abbas-roholamin/splitting-a-ui-into-components-in-react-six-pillars-of-component-architecture-04538e542ce5)
- [Single Responsibility Principle in React — cekrem.github.io](https://cekrem.github.io/posts/single-responsibility-principle-in-react/)
- [7 Architectural Attributes of a Reliable React Component — Dmitri Pavlutin](https://dmitripavlutin.com/7-architectural-attributes-of-a-reliable-react-component/)
- [Single Responsibility Principle in React — DEV (mikhaelesa)](https://dev.to/mikhaelesa/single-responsibility-principle-in-react-10oc)
- [Splitting Components in React — Thiraphat Phutson](https://thiraphat-ps-dev.medium.com/splitting-components-in-react-a-path-to-cleaner-and-more-maintainable-code-f0828eca627c)
- [Techniques for decomposing React components — David Tang (DailyJS)](https://medium.com/dailyjs/techniques-for-decomposing-react-components-e8a1081ef5da)
- [Mastering S.O.L.I.D Principles in React — DEV (drruvari)](https://dev.to/drruvari/mastering-solid-principles-in-react-easy-examples-and-best-practices-142b)
- [How to Improve Your ReactJS Code with Constants — Bomberbot](https://www.bomberbot.com/reactjs/how-to-improve-your-reactjs-code-with-constants-an-expert-guide/)
- [5 React Component Best Practices — Caelin Sutch (Better Programming)](https://betterprogramming.pub/best-practices-i-wish-all-react-developers-knew-part-1-ff6cdee0666a)
- [How to structure files in a large React application — damusnet](https://medium.com/@damusnet/how-to-structure-your-files-in-a-large-react-application-the-solution-99389c64985e)
- [32 React Best Practices — LoginRadius](https://www.loginradius.com/blog/engineering/guest-post/react-best-coding-practices)
- [How to Improve Your ReactJS Code (readability & performance) — freeCodeCamp](https://www.freecodecamp.org/news/improve-reactjs-code/)
- [Building Your Own Hooks — legacy React docs](https://legacy.reactjs.org/docs/hooks-custom.html)
- [Refactoring components in React with custom hooks — CodeScene](https://codescene.com/blog/refactoring-components-in-react-with-custom-hooks)
- [Best Practices for Creating Reusable Custom Hooks — DEV (hasancse)](https://dev.to/hasancse/best-practices-for-creating-reusable-custom-hooks-in-react-37nj)
- [Writing Your Own React Hooks: Advanced Patterns — Vinay Billa](https://medium.com/@vinaybilla2021/writing-your-own-react-hooks-advanced-patterns-and-practices-a3ad8768a1a4)
- [Implementing a Custom React Hook: Best Practices — PullRequest/HackerOne](https://www.pullrequest.com/blog/implementing-a-custom-react-hook-best-practices-and-a-practical-example/)
- [React Custom Hooks: Crafting Reusable & Clean Code — DEV (gboladetrue)](https://dev.to/gboladetrue/react-custom-hooks-crafting-reusable-and-clean-code-like-a-pro-3kol)
- [Naming Conventions in React for Clean & Scalable Code — Sufle.io](https://www.sufle.io/blog/naming-conventions-in-react)
- [React Naming Conventions Simplified — GitHub Gist (kamauwashington)](https://gist.github.com/kamauwashington/4396ea26537e0abd94ac7409998870e9)
- [Naming Conventions Best Practices in React — Rajitha Sanjayamal](https://rajithasanjayamal.medium.com/naming-conventions-best-practices-in-react-37624d020288)
- [Personal React Naming Conventions Guide — 90Pixel](https://blog.90pixel.com/a-personal-guide-to-cleaner-and-consistent-naming-0db39092b2e9)
- [How Should React Files Be Named — Devin Rosario (JS in Plain English)](https://javascript.plainenglish.io/best-practices-how-should-react-files-be-named-682eadc53a0e)
- [Five best practices for React developers in 2026 — Educative](https://www.educative.io/blog/best-practices-react-developer)
- [File Structure — Epic React (Kent C. Dodds)](https://www.epicreact.dev/modules/welcome-to-epic-react-v1/file-structure)
- [Kent C. Dodds — blog index](https://kentcdodds.com/blog/list)
- [Project Organization and File Colocation — Next.js docs](https://nextjs.org/docs/13/app/building-your-application/routing/colocation)
- [Inside the App Router: Best Practices for File & Directory Structure (2025) — Melvin Prince](https://medium.com/better-dev-nextjs-react/inside-the-app-router-best-practices-for-next-js-file-and-directory-structure-2025-edition-ed6bc14a8da3)
- [Best Practices for Organizing Your Next.js 15 (2025) — DEV (bajrayejoon)](https://dev.to/bajrayejoon/best-practices-for-organizing-your-nextjs-15-2025-53ji)
- [App Router Directory Design: Project Structure Patterns — DEV (pipipi-dev)](https://dev.to/pipipi-dev/app-router-directory-design-nextjs-project-structure-patterns-31eo)
- [How to Organize Your Next.js App with the App Router — Aritra Paul](https://medium.com/@aritrapaulpc/how-to-organize-your-next-js-app-with-the-app-router-best-practices-folder-structures-4bba816df061)
- [Project Structure, Routing, Layouts & File Conventions — Dr. Shahin Siami](https://shahin.page/article/nextjs-project-structure-routing-layouts-file-conventions)
- [Organizing Routes: Private Folders & Project Structure — Shahin Siami](https://shahin.page/article/nextjs-routing-private-folders-and-project-structure)
- [Understanding Route Visibility and Colocation — DEV (Bridget Amana)](https://dev.to/bridget_amana/understanding-route-visibility-and-colocation-in-nextjs-app-router-2bni)
- [Next.js Colocation Template (live demo)](https://next-colocation-template.vercel.app/)
- [How to Build Reusable Architecture for Large Next.js Applications — freeCodeCamp](https://www.freecodecamp.org/news/reusable-architecture-for-large-nextjs-applications/)
- [The Next.js Directory Structure That Scales: Technical Layer First — Bitsmiths](https://bitsmiths.studio/blogs/nextjs-directory-structure)
- [Architecting Large-Scale Next.js Applications — DEV (addwebsolution)](https://dev.to/addwebsolutionpvtltd/architecting-large-scale-nextjs-applications-folder-structure-patterns-best-practices-2dpj)
- [Feature Driven Architecture (FDA) for Next.js — Julien Mauclair](https://medium.com/@JMauclair/feature-driven-architecture-fda-a-scalable-way-to-structure-your-next-js-applications-b8c1703a29c0)
- [Next.js Project Structure 2026: Scalable Full-Stack Template — GroovyWeb](https://www.groovyweb.co/blog/nextjs-project-structure-full-stack)
- [GitHub (arhamkhnz)](https://github.com/arhamkhnz/next-colocation-template)

## Changelog

- **1.0.0** (2026-09-25) — First release. Placement table, three rules derived from a no-skill
  baseline, and three references: structure and boundaries, logic placement, Next.js organisation.
