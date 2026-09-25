---
name: onion-architecture
description: Use when deciding where backend code goes in server/ — adding or changing a route, service, repository, adapter, job handler or domain rule; placing a database query, a business rule or an external SDK call (LLM, GitHub, git); letting one module use another module's data; or making writes across repositories atomic. ALWAYS invoke before creating a file under server/src/ and before importing from another module's folder or from src/adapters/. Do not put a query in routes.ts or call an SDK from a service without it. NOT for Fastify API details (fastify-best-practices), Drizzle query syntax (drizzle-orm-patterns), table design (postgresql-table-design), Zod schema syntax (zod), or the client (frontend-ui-architecture).
metadata:
  version: "1.0.0"
---

# Onion architecture — server

Decides **which ring** backend code belongs to and **which way imports may point**. How to write
Fastify, Drizzle or Zod code is the neighbouring skills' job.

`server/AGENTS.md` is binding and this skill never overrides it. Before adding a query, rule, port
or mapper, search for an existing one — the second copy is how layers drift.

## The rule

**Imports point inward.** A file may depend on rings more central than itself, never on one further
out. Inside out:

| Ring | In this server |
|---|---|
| Contracts and ports | `src/vendor/shared` — contract types, adapter interfaces (`adapters.ts`) |
| Domain rules | `modules/<m>/domain.ts` · `status.ts` · `helpers.ts` · `constants.ts` — pure |
| Application | `modules/<m>/service.ts`, `run-executor.ts` — orchestrates through ports |
| Edge | `routes.ts`, job handlers, `repository*.ts`, `src/adapters/`, `src/db/`, `src/platform/` |

`platform/container.ts` is the composition root — the only file that imports concrete adapters.
The rest of `platform/` (jobs, SSE) is infrastructure, not an inner ring.

## Where each kind of code goes

| The code | Goes in |
|---|---|
| A database query | the `repository.ts` of the module that owns those tables — never `routes.ts`, never a function taking `db` elsewhere |
| A rule defining what a domain state **means** | a pure function in the owning module's `domain.ts`; its thresholds in that module's `constants.ts` |
| "When X happens, do Y then Z" | the module's `service.ts` |
| HTTP: parse, call, answer | `routes.ts` — Zod `params`/`body`/`response`, one service call |
| An external system (LLM, GitHub, git, Slack…) | a port in `vendor/shared/adapters.ts`, an adapter in `src/adapters/<kind>/`, a container getter plus a `ContainerOverrides` field |
| A job payload, LLM output, GitHub data | parsed with Zod at the edge that receives it, before any service sees it |

## Three rules

**1. A query is never parked at the edge.** It goes in the repository of the module that owns the
tables it reads — find it by searching the repositories for the table. A module whose routes need
data gets a `service.ts` over that repository, even for one read. If the query already exists inline
somewhere, move it into the repository and call it from both places — do not write a second copy.

**2. A domain rule is pure and has one owner.** It takes plain data and returns a value: no `db`, no
container, no fastify, no SDK. It lives in `domain.ts` of the module that owns the concept it
describes — not in the route or repository that first needs it, not in `_shared` because two modules
need it, and not in `reviewer-core`, which knows nothing about stored PR state. Other modules import
it from there; the caller loads the data and passes it in.

**3. A module's public surface is `types.ts` and `domain.ts`.** For anything that does I/O, the
owner declares a narrow interface in `modules/<owner>/types.ts` (the precedent is `RepoIntel` in
`modules/repo-intel/types.ts`), its service implements it, and the container exposes it with an
override for tests. Never import another module's `service`, `repository`, `helpers` or `constants`,
and never hand out its concrete class.

## The gate

`cd server && pnpm arch` checks these rings with dependency-cruiser. Existing debt is recorded in
`.dependency-cruiser-known-violations.json`; **any new violation fails**. Run it before calling a
backend change done. Fixed a recorded violation? Run `pnpm arch:baseline` in the same change so it
cannot return. Never regenerate the baseline to make a new violation pass.

## References — load the one the task needs

- Rings mapped to files, cross-module access, what counts as domain → [references/layers.md](references/layers.md)
- Fastify, Zod, Drizzle, the SDKs, jobs and SSE in their rings → [references/tools.md](references/tools.md)
- The gate's rules, the baseline, testing each ring → [references/enforcement-and-testing.md](references/enforcement-and-testing.md)

Sources, contested points and the changelog: [README.md](README.md).
