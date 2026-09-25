# Layers

Each ring of the onion mapped onto this server's files, with what may import what. Sources are in
`../README.md`.

## Contents

- [Where the idea comes from](#where-the-idea-comes-from)
- [The rings in this server](#the-rings-in-this-server)
- [What counts as a domain rule](#what-counts-as-a-domain-rule)
- [Crossing from one module to another](#crossing-from-one-module-to-another)
- [Row types, DTOs and mapping](#row-types-dtos-and-mapping)
- [Transactions](#transactions)
- [Errors](#errors)
- [Where this server departs from the textbook](#where-this-server-departs-from-the-textbook)

## Where the idea comes from

Jeffrey Palermo (2008) puts the domain at the centre and lets all coupling point toward it. The
core declares the interfaces it needs, infrastructure implements them at the edge, and the
database is an external detail rather than the centre. Alistair Cockburn's hexagonal architecture
states the same thing as ports and adapters, with the goal that the application runs the same
whether it is driven by users, tests or scripts. Robert C. Martin's Clean Architecture names it the
Dependency Rule: source dependencies point only inward, and what crosses a boundary is plain data,
not database rows or framework objects.

Two consequences that are often got wrong:

- **Layering is relaxed, not strict.** Palermo's third part says any outer layer may call any inner
  one, not only the next ring in. A route may call a pure domain rule directly; it does not need a
  pass-through service method for that. Graça warns that strict layering degrades into proxy
  methods ("lasagna").
- **Two edge files do not talk to each other freely.** Seemann and Simon Brown both forbid a
  controller reaching data access directly, even though both sit in the outer ring. Here: a route
  never imports a repository — the gate's `routes-not-repository`.

Palermo limits the pattern to long-lived, complex applications, and Fowler, Bogard and DHH warn
against layers added for their own sake. That is why this skill forces the direction of imports but
not an interface for every class — see the last section.

## The rings in this server

| Ring | Files | May import | Must not import |
|---|---|---|---|
| Contracts and ports | `src/vendor/shared/**` | other shared files, zod | anything in `src/` outside `vendor/` |
| Domain rules | `modules/<m>/{domain,status,helpers,constants}.ts` | contracts, `platform/errors` | `db/`, `adapters/`, `platform/container`, fastify, drizzle, SDKs, `fs`, `child_process`, `http` |
| Application | `modules/<m>/service.ts`, `run-executor.ts` | contracts, own module files, `platform/*` except concrete adapters, `reviewer-core` | fastify, `routes.ts`, `db/schema` and drizzle at run time, `src/adapters/**`, another module's files |
| Edge — driving | `modules/<m>/routes.ts`, job handlers registered by a service | own `service`, `_shared`, contracts | `db/`, drizzle, `src/adapters/**` |
| Edge — driven | `modules/<m>/repository*.ts`, `src/adapters/**`, `src/db/**`, `platform/{jobs,sse}.ts` | the driver or SDK it wraps, `db/schema`, contracts | `service.ts`, `routes.ts`, `platform/container.ts`; adapters also never import `modules/` |
| Composition root | `platform/container.ts` | everything — its job is to bind ports to adapters | — |

`reviewer-core` is a separate package: the pure review engine, shared with CI. It is the centre
for "diff → prompt → grounded findings → score". It is not where server domain rules go — it has no
database and no notion of stored PR state. Its own rules are in `reviewer-core/AGENTS.md`.

## What counts as a domain rule

The test: *would a second caller that needed this answer have to repeat the same logic to get it
right?* If yes, it is a domain rule. Examples already in the code: `deriveReviewStatus` and
`rollupSeverities` in `pulls/status.ts`, `isConfigChange` in `agents/helpers.ts`.

- It is a pure function of plain data. The caller — a service — loads the data through a repository
  and passes it in.
- It lives in the module that **owns the concept**, not in the module that first calls it. "Is this
  PR ready to merge" is about a PR, so it belongs with `pulls`, even if a reviews screen shows it.
- It goes in the owner's `domain.ts`, which other modules may import — it is half of the module's
  public surface, with `types.ts`. Older rule files (`pulls/status.ts`) are private to their module;
  a rule another module needs moves to `domain.ts`. Its numbers — a score threshold — go in the
  module's `constants.ts`, named.
- `_shared/` is for request plumbing (context, common schemas), not for domain rules two modules
  happen to need. Putting a rule there because the gate allows it hides who owns it.
- A rule that needs I/O to decide is not pure yet. Split it: the service fetches, the rule decides.

Seemann's "functional architecture is ports and adapters" is the reason to push logic here: a pure
function is tested with plain inputs and needs no test doubles at all.

## Crossing from one module to another

The owner exposes a capability; the consumer depends on an interface, not on the owner's classes.

1. The owner declares the interface in `modules/<owner>/types.ts`, shaped by what consumers need
   (`hasClone(repoId): Promise<boolean>`), not by the owner's tables.
2. The owner's service implements it.
3. `platform/container.ts` constructs it in a lazy getter and adds a field to `ContainerOverrides`.
4. The consumer calls `container.<owner>.<method>()` and imports only the type from `types.ts`.

`RepoIntel` (`modules/repo-intel/types.ts`, `container.repoIntel`) is the working example.
`container.agentsRepo` and `container.reviewRepo` hand out concrete repositories — they predate this
skill; do not add more of that kind.

The gate enforces step 4: an import of another module's file other than `types.ts` or `domain.ts`
fails `no-cross-module-imports`.

**Which module owns a query.** The one whose repository already reads those tables — search the
`repository*.ts` files for the table name. `reviews`, `findings`, `pull_requests` and `agent_runs`
are read by `modules/reviews/repository/`. When the endpoint belongs elsewhere, that module's service
calls the owner through its `types.ts` interface.

## Row types, DTOs and mapping

- Drizzle row types (`db/rows.ts`, `$inferSelect`) are persistence types. They stay inside the
  module: repository returns them, the module's `helpers.ts` maps them (`toAgentVersionDto`), and
  the service returns contract types.
- Nothing outside the module — a route, another module, an SSE event — receives a row.
- The contract types in `@devdigest/shared` double as API DTOs and service types. That is allowed;
  introduce a separate domain type only when the API shape and the domain shape actually diverge.

## Transactions

- No code in this server opened a transaction before this skill was written; the first one sets the
  pattern.
- All the writes land in tables of **one** repository → that repository exposes one method for the
  whole operation (`insertWithSkills`) and wraps it in `this.db.transaction`, even when it is built
  from several of its own methods. The service calls it once.
- Writes through **two or more repositories** → the service owns the boundary: it calls
  `container.db.transaction(async (tx) => …)` and passes `tx` to each repository method.
- Repository methods that can join a transaction take an optional last argument typed `Db | Tx`,
  where `Tx = Parameters<Parameters<Db['transaction']>[0]>[0]`. Drizzle's own `PgTransaction`
  generics change between versions; the inferred alias does not.
- The service still imports nothing from drizzle — it calls a method on the `Db` it was given.
- Implicit transactions through AsyncLocalStorage are community plugins, not a Drizzle feature. Do
  not introduce one without a decision.

## Errors

- The core throws `AppError` subclasses from `platform/errors.ts` (`NotFoundError`,
  `ValidationError`, `ExternalServiceError`, `ConfigError`). The one `setErrorHandler` in `app.ts`
  turns them into the `{ error: { code, message, details } }` envelope.
- A service never imports fastify, never touches `reply`, and never branches on HTTP status.
- `AppError` carrying `statusCode` is an HTTP detail in the core. It is a known, accepted leak; do not
  add new status-dependent logic on top of it.
- Adapters translate vendor errors (OpenAI `APIError`, Octokit `RequestError`, `GitError`) into those
  classes at the boundary. The core never checks `instanceof` against an SDK type.

## Where this server departs from the textbook

Stated so that nobody "fixes" them by accident — or mistakes them for permission.

| Departure | Why it stays | What not to do |
|---|---|---|
| Services receive the whole `Container` | it is the `ContainerOverrides` test seam every test uses; Seemann calls a service locator an anti-pattern, and changing it is a refactor of its own | pass the container further than the service's constructor |
| A module's service uses its own concrete repository | repositories are tested against real Postgres; an interface per repository would be ceremony Palermo reserves for complex apps | expose that repository to other modules |
| `AppError` has a `statusCode` | Fastify's error handler reads it, and the envelope depends on it | put status logic in services |
| Contract Zod types are service types | one definition, no drift | call Zod at run time inside a service on data that was already parsed |
