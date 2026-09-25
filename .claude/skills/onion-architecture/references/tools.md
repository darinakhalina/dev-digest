# Tools in their rings

Where each backend tool of this server sits in the onion, and the rules that keep it there. Only
rules that change where code goes are here; API details belong to `fastify-best-practices`,
`drizzle-orm-patterns` and `zod`. Sources are in `../README.md`.

## Contents

- [Map](#map)
- [Fastify](#fastify)
- [Zod and fastify-type-provider-zod](#zod-and-fastify-type-provider-zod)
- [Drizzle and postgres](#drizzle-and-postgres)
- [LLM SDKs, Octokit, simple-git](#llm-sdks-octokit-simple-git)
- [Background jobs and SSE](#background-jobs-and-sse)
- [Adding a new external system](#adding-a-new-external-system)

## Map

| Tool | Ring | Lives in | Never imported by |
|---|---|---|---|
| `fastify`, `@fastify/*`, `fastify-sse-v2` | edge (driving) | `app.ts`, `modules/*/routes.ts`, `platform/sse.ts` | services, repositories, domain files |
| `zod` contracts | contracts | `src/vendor/shared` | — (types are allowed everywhere) |
| `drizzle-orm`, `postgres`, `db/schema` | edge (driven) | `modules/*/repository*.ts`, `src/db/`, `platform/jobs.ts` | routes, services at run time, domain files |
| `openai`, `@anthropic-ai/sdk` | edge (driven) | `adapters/llm/*` behind `LLMProvider` | anything outside `adapters/` |
| `octokit` | edge (driven) | `adapters/github/octokit.ts` behind `GitHubClient` | anything outside `adapters/` |
| `simple-git` | edge (driven) | `adapters/git/simple-git.ts` behind `GitClient` | anything outside `adapters/` |
| `p-queue` and the `jobs` table | edge (driven) | `platform/jobs.ts` | services import `JobRunner` only through the container |

## Fastify

The reference docs never say where business logic goes. The rules below come from Matteo Collina's
modular-monolith talk, nodebestpractices and practica, and the layering sources.

- A route handler adapts: it reads the already-parsed `req.params` / `req.body`, calls **one** service
  method with plain data, and returns its result. No query, no SDK, no business branching.
- Never pass `req`, `reply` or the Fastify instance into a service.
- Declare a `response` schema on every new route. Fastify then serialises through it and strips
  undeclared fields, so a column added later cannot leak to the client. No route in this server
  declares one yet, although `server/README.md` says the contracts drive "response serialization" —
  do not rely on that sentence. A response that fails its schema becomes a 500, so the schema must
  describe what the service actually returns.
- Errors reach the one root `setErrorHandler` in `app.ts`. Throw `AppError` subclasses; do not
  build error replies in handlers.
- Decorate the Fastify instance with nothing new. The container is the dependency mechanism; a
  second one (decorators, `@fastify/awilix`) splits wiring across two places.

## Zod and fastify-type-provider-zod

- Parse once, at the edge that receives the data, and hand the core a typed value ("parse, don't
  validate"). The core never re-parses what the edge already parsed.
- That applies to **every** entry point, not only routes:
  - job payloads — `JobHandler` receives `payload: unknown`; the handler parses it first
  - LLM structured output — the adapters already run `parseWithRepair`
  - GitHub and git data — the adapter returns contract types, not raw API objects
  - SSE query parameters
- `fastify-type-provider-zod` v4 is the last line for Zod 3. Upgrading Zod to v4 means provider v5
  or later — plan both together.
- Contract types may be used as service types (see `layers.md`). Zod *runtime* calls belong at the
  edge.

## Drizzle and postgres

- `db/schema`, `drizzle-orm` and row types stay in repositories and the module's mapping helpers.
- A repository method is named for what the use case needs (`latestReviewPerAgent(prIds)`), not for
  a table operation. One repository per module, not per table.
- Mapping row → contract type happens once per module, in `helpers.ts` (`toAgentVersionDto`), before
  the value leaves the service.
- Relational-query results (`db.query.x.findMany({ with })`) are nested ORM shapes. Map them inside
  the module like any other row.
- Transactions: see `layers.md` § *Transactions*. Drizzle has no official unit of work or implicit
  transaction; pass `tx` explicitly.

## LLM SDKs, Octokit, simple-git

- One adapter per SDK. It returns the port's types (`CompletionResult`, `StructuredResult<T>`,
  contract payloads), never an SDK response object.
- The adapter translates vendor errors — OpenAI and Anthropic `APIError` subclasses, Octokit
  `RequestError`, simple-git `GitError` — into `ExternalServiceError` or `ConfigError`. Nothing outside
  the adapter checks an SDK error type. This is Microsoft's anti-corruption layer: translate at the
  boundary, and keep business rules out of it.
- **Retries have one owner per call path.** The OpenAI and Anthropic SDKs retry twice by default,
  and the adapters wrap every call in `withRetry` (3 retries) as well — the clients are built without
  `maxRetries: 0`. A request that keeps failing with 5xx is therefore sent up to 3 × 4 = 12 times
  before the adapter gives up. When touching an adapter, pick one owner: `maxRetries: 0` on the
  client, or drop the wrapper. Octokit's retry plugin raises the same question.
- Timeouts belong to the adapter too (`withTimeout`). The SDK default of 10 minutes is too long for
  a request path.

## Background jobs and SSE

- A job handler is an entry point, like a route. It is registered by the module's service
  (`registerCloneJobHandler`), parses its payload, and calls the service.
- `platform/jobs.ts` (the runner and its `jobs` table) is infrastructure. It is not an inner ring,
  even though it sits in `platform/`.
- SSE is an output adapter. Services publish run events to the `RunBus`; the SSE route adapts that
  to HTTP. Fastify's response schemas do not apply to SSE streams, so build events from contract
  types.

## Adding a new external system

This is the move the server already makes well; follow the existing shape.

1. Port: an interface in `src/vendor/shared/adapters.ts`, named by what the application needs
   (`Notifier.notifyRunComplete`), with no vendor name in it. `vendor/shared` is vendored twice —
   if the client needs the type, edit both copies.
2. Adapter: `src/adapters/<kind>/<vendor>.ts`, implementing the port. Secrets come through
   `SecretsProvider`.
3. A mock or no-op in `src/adapters/mocks.ts`.
4. A lazy getter in `platform/container.ts` and a field on `ContainerOverrides`. Tests switch it off
   through the override — not through `NODE_ENV` checks in the container.
5. The service calls `container.<port>`. A side effect that must not fail the main flow (a
   notification after a run) is wrapped where it is called.
