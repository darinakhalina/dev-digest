# onion-architecture

**Version 1.0.0** · for people, not loaded by the agent. The agent reads `SKILL.md` and, on demand,
the files in `references/`.

## What it is for

Deciding which ring of the onion a piece of `server/` code belongs to, and which way imports may
point: where a query, a domain rule, an external call or a cross-module dependency goes. It forces
the direction with a dependency-cruiser gate (`pnpm arch` in `server/`) rather than leaving it to
memory.

Out of scope, and where it goes instead:

| Not this skill | Use |
|---|---|
| Writing Fastify code — plugins, hooks, schemas, errors | `fastify-best-practices` |
| Drizzle queries, relations, migrations | `drizzle-orm-patterns` |
| Table and index design | `postgresql-table-design` |
| Zod schema syntax | `zod` |
| The client | `frontend-ui-architecture` |
| `reviewer-core`'s own boundary | `reviewer-core/AGENTS.md` |

## Files

| File | What it holds |
|---|---|
| `SKILL.md` | the rule, the ring table, where each kind of code goes, three rules, the gate |
| `references/layers.md` | rings mapped to files with allowed imports, domain rules, cross-module access, rows and DTOs, transactions, errors, and where this server departs from the textbook |
| `references/tools.md` | Fastify, Zod, Drizzle, the LLM SDKs, Octokit, simple-git, jobs and SSE — each in its ring |
| `references/enforcement-and-testing.md` | the gate's rules, the baseline ratchet, the recorded debt, testing per ring |
| `server/.dependency-cruiser.cjs` | the rules the gate runs |
| `server/.dependency-cruiser-known-violations.json` | recorded debt the gate ignores; empty as of 2026-09-25 — the 21 edges present when the gate was added were fixed the same day, see `enforcement-and-testing.md` § *Debt recorded in the baseline* |

## How it was written

Test-first, as with `frontend-ui-architecture`: agents were run on real backend tasks without the
skill, and the skill was written against what they got wrong, not against a best-practices list.

**Baseline prompt** (six tasks, plan only, no edits): a `GET /pulls/:id/summary` endpoint; a
"ready to merge" rule; a Slack notification after a run; `reviews` refusing a run when `repos`
reports no clone; `GET /agents/:id/versions`; creating an agent and linking its skills atomically.

Two of the six were flawed: `GET /agents/:id/versions` already exists, and the rule named a `HIGH`
severity the contract does not have. All three agents caught both. The versions task is left out of
the results.

### Without the skill — 3 runs

| Task | Run 1 | Run 2 | Run 3 |
|---|---|---|---|
| Summary endpoint: where the query goes | new `pulls/repository.ts` + `service.ts` | repository + service in `reviews` | a function taking `db` in `pulls`, no repository |
| Ready-to-merge rule | `pulls/status.ts` | new `reviews/merge-readiness.ts` | `pulls/status.ts` |
| Slack notification | port, adapter, container, override | the same, plus a `NODE_ENV` check in the container | port, adapter, container, override |
| `reviews` needs `repos` data | interface through the container | concrete `RepoService` through the container | concrete service through the container |
| Atomic create | transaction in the repository | the same | the same |

Every run cost 128–132k tokens and 10–11 tool calls.

What the skill therefore had to settle: where a query goes in a module that has no repository
(three runs, three answers), which module owns a domain rule (2:1), and whether a module depends on
another's interface or its class (1:2). The external-system recipe and single-repository
transactions were already right in 3/3 and are kept short.

### With the skill — 3 runs

The first three runs were thrown away. The task file was named `onion-baseline-prompt.md`; the
agents read "baseline", deliberately did not load the skill, and said so. Two of them read the
gate's config instead, and both put the ready-to-merge rule in `_shared/` — the only folder the gate
then let two modules share. That exposed a real gap: the skill said a rule has one owner, and the
gate made it unusable from anywhere else. `domain.ts` became part of a module's public surface, and
the runs were repeated with the same prompt under a neutral file name.

| Task | Run A | Run B | Run C |
|---|---|---|---|
| Summary endpoint: where the query goes | reviews repository, reached through `reviews/types.ts` | the same | the same |
| Ready-to-merge rule | `pulls/domain.ts` + `pulls/constants.ts` | the same | the same |
| Slack notification | port, adapter, override; "not through `NODE_ENV`" | port, adapter, override | port, adapter, override; "not through `NODE_ENV`" |
| `reviews` needs `repos` data | `repos/types.ts` interface on the container | the same | the same |
| Atomic create | transaction in the repository | the same | transaction in the service |

- The three split questions went from 3 answers, 2:1 and 1:2 to 3:0 each.
- All three moved the inline query out of `pulls/routes.ts` instead of copying it; two declared a
  `response` schema unprompted; all three ended with `pnpm arch`.
- All three loaded the skill through its description (`Skill` tool); none opened the catalog.
- The only split left was the transaction: 2:1. `layers.md` now says a single repository exposes
  one method for the whole operation.
- **Cost did not go down.** 129–134k tokens (same as without), 15–18 tool calls (vs 10–11), 81–108 s
  (vs 57–73 s). Unlike the client skill, this one buys agreement and gate-checked placement, not
  speed: the agents read the skill on top of the code rather than instead of it.

## What was taken from the course branch, and what was not

The course's `upstream/lesson-2-lab/skills` branch ships an `onion-architecture` skill of its own. It
was read after this skill's research and baseline, so it could not anchor them.

**Taken**

- A ratchet rather than a big-bang: the gate adopts existing debt instead of demanding a rewrite.
  This skill goes further — its ratchet is a known-violations baseline, so a new violation fails
  every rule, where the course version only warns on the rules the old code breaks.
- An exception ledger with the fix for each entry, and "tighten the config in the same change".
- The tool → port → adapter table.
- CommonJS for the config, because `server` is `"type": "module"`.

**Not taken, and why**

| In the course skill | Problem |
|---|---|
| Cross-module access only through `container.*` | with a gate, a shared pure rule has nowhere to live but `_shared/` — observed in two runs; here `domain.ts` is public |
| Pure domain logic goes to `reviewer-core` | `reviewer-core` has no database and runs in CI; a rule about stored PR state would land in the wrong package. It has no in-server domain ring at all |
| Services may import `container` and reach cross-module data as `container.agentsRepo` | a service locator (Seemann) and a concrete class handed across modules — exactly where the baseline split 1:2 |
| The ring diagram nests infrastructure inside transport | Palermo puts both on the outer ring |
| "0 errors, 15 warnings" over 125 modules | stale; the real graph is 149 modules with 21 violations under stricter rules. Counts do not belong in a skill body |
| `npm run depcruise` | the repo uses pnpm, and the script was never added |
| `repo-intel → adapters` kept as a permanent exception | the imported files are pure parsers stored in `adapters/`, not port implementations; the fix is to move them |
| `version` as a top-level field, a description that summarises the content | the spec puts `version` under `metadata`; a description should say when to load, not what is inside |
| Mostly secondary blog posts, unverified | no Cockburn, no Fowler, no Seemann; none checked |

## Contested points — the choice made, and the alternative

| Question | This skill | The other side |
|---|---|---|
| Interface for every repository? | no — a module's service uses its own repository class; interfaces only across modules | Palermo, Microsoft and Allegro put repository interfaces in the core; Palermo's own 2022 sample has none; Bogard and Ayende warn against default abstractions |
| Where repository interfaces live, when they exist | not applicable here | domain (Palermo, Microsoft), application (Graça, Drotbohm, Sairyss), infrastructure (Stemmler) |
| Services receive the whole container | tolerated as existing style, not extended | Seemann: a service locator is an anti-pattern |
| Contract Zod types as service types | allowed; split only when shapes diverge | Martin: translate at every boundary; Fowler: local DTOs are harmful |
| Who opens a multi-repository transaction | the service, passing `tx` | Fowler, Vernon, Allegro and Sairyss agree; Evans and Vernon limit it to one aggregate |
| Cross-module access | through the owner's interface in `types.ts` | Graça and Sairyss: events only, no code references; Graça allows reading another module's data |
| Strict or relaxed layering | relaxed — any outer ring may call any inner one | strict layering, which Graça calls lasagna |
| `AppError.statusCode` | accepted, documented leak | Martin: no HTTP in the core |
| How much to mock | fakes for own ports, real Postgres, mocks for unmanaged systems | Cockburn puts a mock database at the heart of the pattern; Seb Rose argues fast stubs are worth it |
| Is onion worth it here | for the direction of imports, yes; for interface-per-class, no | Bogard, DHH and Goldberg prefer slices or three tiers |

## Found while writing it

- No route in `server/` declares a `response` schema, while `server/README.md` says the contracts
  drive response serialisation.
- The LLM adapters retry through `withRetry` and the SDKs retry by default: up to 12 attempts for one
  call.
- No code in the server uses a database transaction.

## Sources

Every page below was fetched on 2026-09-25 and its claims checked against the page text; the three
research passes kept raw copies. Status is the HTTP status received.

### Onion, hexagonal, clean — primary

| Source | Status | Used for |
|---|---|---|
| Jeffrey Palermo, The Onion Architecture part 1 (2008) — https://jeffreypalermo.com/2008/07/the-onion-architecture-part-1/ | 200 | domain at the centre, the database is external, not for small apps |
| Palermo, part 2 (2008) — https://jeffreypalermo.com/2008/07/the-onion-architecture-part-2/ | 200 | the controller depends only on core interfaces |
| Palermo, part 3 (2008) — https://jeffreypalermo.com/2008/08/the-onion-architecture-part-3/ | 200 | the four tenets; any outer layer may call any inner one |
| Palermo, part 4 — After Four Years (2013) — https://jeffreypalermo.com/2013/08/onion-architecture-part-4-after-four-years/ | 200 | works with and without DDD, without an IoC container |
| Palermo, onion-architecture-dotnet-6 (2022) — https://github.com/jeffreypalermo/onion-architecture-dotnet-6 | 200 | his current sample has no repository interfaces |
| Alistair Cockburn, Hexagonal Architecture (2005) — https://alistair.cockburn.us/hexagonal-architecture/ | 200 | ports and adapters, driving vs driven, leaks happen without detection |
| Robert C. Martin, The Clean Architecture (2012) — https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html | 200 | the Dependency Rule; no rows across boundaries |
| Robert C. Martin, Screaming Architecture (2011) — https://blog.cleancoder.com/uncle-bob/2011/09/30/Screaming-Architecture.html | 200 | structure shows the domain, not the framework |

### Patterns — Fowler, Evans, Vernon

| Source | Status | Used for |
|---|---|---|
| Martin Fowler, Repository — https://martinfowler.com/eaaCatalog/repository.html | 200 | collection-like facade over data mapping |
| Fowler, Service Layer — https://martinfowler.com/eaaCatalog/serviceLayer.html | 200 | the service layer controls transactions |
| Fowler, Transaction Script — https://martinfowler.com/eaaCatalog/transactionScript.html | 200 | the simple alternative |
| Fowler, Domain Model — https://martinfowler.com/eaaCatalog/domainModel.html | 200 | when a domain model pays |
| Fowler, AnemicDomainModel — https://martinfowler.com/bliki/AnemicDomainModel.html | 200 | thin application layer, behaviour in the domain |
| Fowler, PresentationDomainDataLayering — https://martinfowler.com/bliki/PresentationDomainDataLayering.html | 200 | modules first, layers inside; data-layer swaps rarely happen |
| Fowler, Data Transfer Object — https://martinfowler.com/eaaCatalog/dataTransferObject.html | 200 | DTOs are for crossing processes |
| Fowler, LocalDTO — https://martinfowler.com/bliki/LocalDTO.html | 200 | local DTOs are usually harmful |
| Fowler, Unit of Work — https://martinfowler.com/eaaCatalog/unitOfWork.html | 200 | writing a business transaction out together |
| Fowler, CQRS — https://martinfowler.com/bliki/CQRS.html | 200 | most systems do not need it |
| Fowler, Beck, Hansson, Is TDD Dead? — https://martinfowler.com/articles/is-tdd-dead/ | 200 | test-induced design damage; heavy mocking is a choice |
| Eric Evans, DDD Reference (2015) — https://www.domainlanguage.com/ddd/reference/ | 200 | repositories per aggregate root; transaction per aggregate |
| Vaughn Vernon, Effective Aggregate Design part I (2011) — https://www.dddcommunity.org/wp-content/uploads/files/pdf_articles/Vernon_2011_1.pdf | 200 | the application service owns the transaction |

### Secondary, widely cited

| Source | Status | Used for |
|---|---|---|
| Microsoft, Common web application architectures — https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures | 200 | onion = hexagonal = clean; only the composition root references infrastructure |
| Microsoft, Designing a DDD-oriented microservice — https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/ddd-oriented-microservice | 200 | not cited for direction: its figure has application depending on infrastructure |
| Microsoft, Infrastructure persistence layer design — https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/infrastructure-persistence-layer-design | 200 | repository per aggregate, never per table; repositories optional |
| Microsoft, Anti-Corruption Layer pattern — https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer | 200 | translate vendor models at the boundary |
| Herberto Graça, Explicit Architecture (2017) — https://herbertograca.com/2017/11/16/explicit-architecture-01-ddd-hexagonal-onion-clean-cqrs-how-i-put-it-all-together/ | 200 | ports in the application; components do not reference each other |
| Graça, Layered Architecture (2017) — https://herbertograca.com/2017/08/03/layered-architecture/ | 200 | strict layering becomes lasagna |
| Mark Seemann, Layers, Onions, Ports, Adapters: it's all the same (2013) — https://blog.ploeh.dk/2013/12/03/layers-onions-ports-adapters-its-all-the-same/ | 200 | UI must not reach data access even in the same ring |
| Seemann, Functional architecture is Ports and Adapters (2016) — https://blog.ploeh.dk/2016/03/18/functional-architecture-is-ports-and-adapters/ | 200 | a pure core needs no doubles |
| Seemann, Composition Root (2011) — https://blog.ploeh.dk/2011/07/28/CompositionRoot/ | 200 | one place composes the graph |
| Seemann, Service Locator is an Anti-Pattern (2010) — https://blog.ploeh.dk/2010/02/03/ServiceLocatorisanAnti-Pattern/ | 200 | the container passed into services |
| Simon Brown, Modular monolith / package by component — https://simonbrown.je/modular-monolith/ | 200 | controllers never access repositories; one public interface per component |
| Oliver Drotbohm, Sliced Onion Architecture (2023) — http://odrotbohm.github.io/2023/07/sliced-onion-architecture/ | 200 | one onion per module; persistence models often unnecessary |
| Allegro Tech, Onion Architecture (2023) — https://blog.allegro.tech/2023/02/onion-architecture.html | 200 | transactions in the application layer behind an interface |
| Khalil Stemmler, Organizing App Logic with the Clean Architecture — https://khalilstemmler.com/articles/software-design-architecture/organizing-app-logic/ | 200 | overkill for trivial apps |
| Stemmler, DTOs, Mappers and the Repository Pattern — https://khalilstemmler.com/articles/typescript-domain-driven-design/repository-dto-mapper/ | 200 | domain-named repository methods; one mapper |
| Stemmler, Dependency Inversion — https://khalilstemmler.com/wiki/dependency-inversion/ | 200 | swapping dependencies in tests |
| Stemmler, Handling errors with a Result class — https://khalilstemmler.com/articles/enterprise-typescript-nodejs/handling-errors-result-class/ | 200 | the Result alternative to throwing |
| Kamil Grzybek, Modular Monolith: A Primer — https://www.kamilgrzybek.com/blog/posts/modular-monolith-primer | 200 | business modules with defined interfaces |
| Grzybek, Modular Monolith: Integration Styles — https://www.kamilgrzybek.com/blog/posts/modular-monolith-integration-styles | 200 | direct call through a facade |
| Sairyss, domain-driven-hexagon — https://github.com/Sairyss/domain-driven-hexagon | 200 | TypeScript reference; ports in the application layer |
| Goldberg et al., Node.js Best Practices — https://github.com/goldbergyoni/nodebestpractices | 200 | components, entry-points/domain/data-access; the three-tier alternative |
| Node.js Best Practices, layer your app — https://github.com/goldbergyoni/nodebestpractices/blob/master/sections/projectstructre/createlayers.md | 200 | entry points pass plain objects |
| practica.js — https://github.com/practicajs/practica | 200 | three tiers with Fastify, no DI container |

### Critique

| Source | Status | Used for |
|---|---|---|
| Jimmy Bogard, Vertical Slice Architecture (2018) — https://www.jimmybogard.com/vertical-slice-architecture/ | 200 | layered styles are mock-heavy and rigid |
| David Heinemeier Hansson, Test-induced design damage (2014) — https://dhh.dk/2014/test-induced-design-damage.html | 200 | layers added only for mocks |
| Vladimir Khorikov, Domain model purity vs completeness — https://enterprisecraftsmanship.com/posts/domain-model-purity-completeness/ | 200 | keep out-of-process decisions out of the domain |
| Matthias Noback, Lasagna code (2018) — https://matthiasnoback.nl/2018/02/lasagna-code-too-many-layers/ | 200 | layering vs indirection; enforce the rules |
| Oren Eini, Limit your abstractions — https://ayende.com/blog/153889/ | 200 | interface explosion |
| Derek Comartin, Vertical slices vs clean architecture (2024) — https://codeopinion.com/is-vertical-slice-architecture-better-than-clean-architecture-or-ports-and-adapters/ | 200 | direction and cohesion are orthogonal |
| Comartin, Repository pattern with CQRS (2021) — https://codeopinion.com/should-you-use-the-repository-pattern-with-cqrs-yes-and-no/ | 200 | repositories for commands, not queries |
| Seb Rose, Architectural alignment (2015) — https://claysnow.co.uk/architectural-alignment-and-test-induced-design-damage-fallacy/ | 200 | fast stubs are often worth it |

### The stack's own documentation

| Source | Status | Used for |
|---|---|---|
| Fastify, Encapsulation — https://fastify.dev/docs/latest/Reference/Encapsulation/ | 200 | plugin contexts |
| Fastify, Plugins Guide — https://fastify.dev/docs/latest/Guides/Plugins-Guide/ | 200 | silent on business logic |
| Fastify, Getting Started — https://fastify.dev/docs/latest/Guides/Getting-Started/ | 200 | load order |
| Fastify, Decorators — https://fastify.dev/docs/latest/Reference/Decorators/ | 200 | decorators exist for object shape |
| Fastify, Hooks — https://fastify.dev/docs/latest/Reference/Hooks/ | 200 | `preClose`, `onClose` |
| Fastify, Errors — https://fastify.dev/docs/latest/Reference/Errors/ | 200 | one encapsulated error handler |
| Fastify, Validation and Serialization — https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/ | 200 | response schemas strip undeclared fields |
| Fastify, Type Providers — https://fastify.dev/docs/latest/Reference/Type-Providers/ | 200 | per-instance type providers |
| Fastify, Testing — https://fastify.dev/docs/latest/Guides/Testing/ | 200 | `buildApp` + `inject` |
| fastify-plugin — https://github.com/fastify/fastify-plugin | 200 | lifting decorators |
| @fastify/autoload — https://github.com/fastify/fastify-autoload | 200 | why `modules/index.ts` stays explicit |
| @fastify/awilix — https://github.com/fastify/fastify-awilix | 200 | the official container alternative |
| Matteo Collina, Building a modular monolith with Fastify — https://gitnation.com/contents/building-a-modular-monolith-with-fastify | 200 | modules by domain, contract separate from logic |
| fastify-type-provider-zod — https://github.com/turkerdev/fastify-type-provider-zod | 200 | v4 is the Zod 3 line; request vs response errors |
| Alexis King, Parse, don't validate (2019) — https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/ | 200 | parse once at the boundary |
| Zod v3 README — https://raw.githubusercontent.com/colinhacks/zod/v3/README.md | 200 | `parse`, `safeParse`, `infer`, `brand` |
| Drizzle, Transactions — https://orm.drizzle.team/docs/transactions | 200 | callback-scoped transactions |
| Drizzle, Type inference — https://orm.drizzle.team/docs/goodies | 200 | `$inferSelect` are persistence types |
| Drizzle, Relational queries — https://orm.drizzle.team/docs/rqb | 200 | nested result shapes |
| Drizzle discussion #3271, typing `tx` — https://github.com/drizzle-team/drizzle-orm/discussions/3271 | 200 | the inferred `Tx` alias |
| Drizzle issue #543, AsyncLocalStorage transactions — https://github.com/drizzle-team/drizzle-orm/issues/543 | 200 | not an official feature |
| Drizzle discussion #2777, implicit transaction context — https://github.com/drizzle-team/drizzle-orm/discussions/2777 | 200 | community plugins only |
| openai-node — https://github.com/openai/openai-node | 200 | two retries and a 10-minute timeout by default |
| Anthropic TypeScript SDK — https://platform.claude.com/docs/en/api/sdks/typescript | 200 | the same defaults |
| @octokit/plugin-retry — https://github.com/octokit/plugin-retry.js | 200 | Octokit retries |
| @octokit/plugin-throttling — https://github.com/octokit/plugin-throttling.js | 200 | rate-limit handling |
| simple-git — https://github.com/steveukx/git-js | 200 | timeout, abort, `GitError` |
| p-queue — https://github.com/sindresorhus/p-queue | 200 | concurrency, timeouts, draining |
| fastify-sse-v2 — https://github.com/mpetrunic/fastify-sse-v2 | 200 | SSE bypasses response schemas |
| testcontainers PostgreSQL — https://node.testcontainers.org/modules/postgresql/ | 200 | real Postgres in tests |

### Enforcement and testing

| Source | Status | Used for |
|---|---|---|
| dependency-cruiser, rules reference — https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md | 200 | `path`, `pathNot`, `$1`, type-only cycles |
| dependency-cruiser, CLI — https://github.com/sverweij/dependency-cruiser/blob/main/doc/cli.md | 200 | exit codes, `--ignore-known`, the baseline |
| dependency-cruiser, FAQ — https://github.com/sverweij/dependency-cruiser/blob/main/doc/faq.md | 200 | `tsPreCompilationDeps` |
| eslint-plugin-boundaries — https://github.com/javierbrea/eslint-plugin-boundaries | 200 (partial) | rejected: needs ESLint |
| eslint-plugin-import no-restricted-paths — https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-restricted-paths.md | 200 | rejected: no capture groups |
| ArchUnitTS — https://github.com/LukasNiessen/ArchUnitTS | 200 | the runner-up |
| Nx, Enforce module boundaries — https://nx.dev/docs/features/enforce-module-boundaries | 200 | rejected: needs an Nx workspace |
| Fowler, Mocks Aren't Stubs — https://martinfowler.com/articles/mocksArentStubs.html | 200 | classicist vs mockist |
| Fowler, TestDouble — https://martinfowler.com/bliki/TestDouble.html | 200 | fake vs mock |
| Fowler, UnitTest — https://martinfowler.com/bliki/UnitTest.html | 200 | sociable tests |
| Vocke, The Practical Test Pyramid — https://martinfowler.com/articles/practical-test-pyramid.html | 200 | real databases in DB tests |
| Kent C. Dodds, Write tests — https://kentcdodds.com/blog/write-tests | 200 | the testing trophy |
| Google Testing Blog, Increase test fidelity by avoiding mocks (2024) — https://testing.googleblog.com/2024/02/increase-test-fidelity-by-avoiding-mocks.html | 200 | real, then fake, then mock |
| Khorikov, When to Mock — https://enterprisecraftsmanship.com/posts/when-to-mock/ | 200 | mock only unmanaged dependencies |
| Cosmic Python, ch. 3 Abstractions — https://www.cosmicpython.com/book/chapter_03_abstractions.html | 200 | fakes over patching |
| Cosmic Python, ch. 6 Unit of Work — https://www.cosmicpython.com/book/chapter_06_uow.html | 200 | testing rollback for real |

### Could not be verified

| URL | Result |
|---|---|
| https://clearmeasure.com/services/onion-architecture/ | 403 |
| https://alistaircockburn.com/Articles/Hexagonal+Architecture | 404 — the canonical page above was used |
| https://dzone.com/articles/package-component-and | 403 — Simon Brown's own republication was used |
| https://www.npmjs.com/package/tsarch | 403 — npm metadata only |
| nodebestpractices "separate Express app and server" page | 404 — moved; Fastify's Testing guide covers the point |
| https://testing.googleblog.com/2013/06/testing-on-toilet-fake-your-way-to.html | body did not render — not cited |

## Changelog

**1.0.0 — 2026-09-25.** First version: ring table, placement table, three rules, three references,
and the dependency-cruiser gate with a 21-edge baseline. Later the same day, all 21 were fixed
(server phase 2 of the whole-project audit) and the baseline regenerated to `[]`; `only-container-imports-adapters`
gained an explicit `src/modules/repo-intel/` exemption in the same change, matching the one
`services-depend-on-ports` already had.
