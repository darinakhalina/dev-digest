# Next.js App Router organisation

How to organise an App Router app, and which of that applies to this client. What the file
conventions *are* — `page`, `layout`, `_folder`, `(group)`, `[param]` — is `next-best-practices`;
this file is about using them to place code. Sources are in `../README.md`.

## Contents

- [What applies to this client](#what-applies-to-this-client)
- [Next.js takes no position on structure](#nextjs-takes-no-position-on-structure)
- [Colocation, private folders, route groups](#colocation-private-folders-route-groups)
- [The client boundary is an architectural decision](#the-client-boundary-is-an-architectural-decision)
- [Providers](#providers)
- [Environment boundaries](#environment-boundaries)
- [If the client ever talks to data directly](#if-the-client-ever-talks-to-data-directly)
- [Version notes](#version-notes)

## What applies to this client

This client is **Next.js 15** (`next ^15.1.3`), not 16. It has no Server Actions, no Route Handlers
and no `server-only` modules: all data comes from the separate Fastify API through
`src/lib/api.ts`, reached only through the TanStack Query hooks in `src/lib/hooks/`. Five of its seven
pages are Client Components.

So most of Next.js's server-side architecture — the Data Access Layer, Server Actions, DTOs — does not
apply here. Do not introduce any of them while placing code: that changes how the client gets data,
which is a decision for a spec, not a side effect of adding a file. The parts that do apply are
colocation, route groups and the client boundary.

## Next.js takes no position on structure

The docs: "Next.js is **unopinionated** about how you organize and colocate your project files." They
document three strategies and ask only that you pick one and stay consistent:

1. keep project files outside `app/`, which stays routing-only;
2. keep them in top-level folders inside `app/`;
3. keep shared code at the top and split the rest by feature or route.

Folder names such as `components` and `lib` "have no special framework significance". This client
uses the third strategy: shared code in `src/components/` and `src/lib/`, route code colocated in
`_components/`.

Next.js also takes no position on dependency direction beyond one rule it enforces itself — the
client module graph never imports the server graph. The one-way rule in `structure-and-boundaries.md`
comes from Bulletproof React, FSD and Robin Wieruch, not from Next.js.

## Colocation, private folders, route groups

- **Colocation is safe.** A folder under `app/` is routable only once it holds a `page` or `route`
  file, so components and helpers can sit beside the page that uses them.
- **Private folders** (`_components/`) are not required for that, but mark a folder as an
  implementation detail and avoid clashes with future file conventions. This client uses
  `_components/` for every route-private component.
- **Route groups** (`(name)/`) organise routes and share layouts without changing the URL. Two
  pitfalls: navigating between different **root** layouts is a full page reload, and two groups that
  resolve to the same path are a build error.

## The client boundary is an architectural decision

`'use client'` does not mark one component; it opens a door. Everything the file imports, and every
component it renders directly, joins the client bundle. So where the directive sits decides how much
of the tree is client code.

- Put it on the **interactive leaf**, not on the page. The docs: add it to "specific interactive
  components instead of marking large parts of your UI as Client Components".
- Server-rendered UI goes inside client UI as `children` or another prop, never by importing it.
  Props that cross must be serializable, and functions cannot cross.
- Compound components written as static properties (`Menu.Item`) break across the boundary; export
  the pieces by name instead.

**In this client** five pages start with `'use client'` and hold their data wiring, which is also why
the thin-pages rule in `client/AGENTS.md` is not met by them today. A new interactive piece goes in a
`_components/` component marked `'use client'`, not into the page.

## Providers

Context providers are Client Components that wrap `{children}`. Render them "as deep as possible in
the tree" — around the part that needs them, not the whole document. This client renders its
`Providers` from `src/lib/providers.tsx` around `{children}` in the root layout; a provider only one
subtree needs belongs on that subtree instead.

## Environment boundaries

- `import 'server-only'` at the top of a module makes importing it from a Client Component a
  **build-time** error. `client-only` is the mirror, for code that touches `window`.
- Only environment variables prefixed `NEXT_PUBLIC_` reach the browser. This client's API base is
  `NEXT_PUBLIC_API_BASE`.

## If the client ever talks to data directly

Recorded so the decision is made knowingly, not so it is made now. For new projects that read data in
Next.js itself, the docs recommend a **Data Access Layer**: server-only, performing authorisation
checks, returning minimal Data Transfer Objects, and the only place that reads `process.env` or
imports database packages. Server Actions are then thin — validate, call the DAL, return — and every
one is treated as a public entry point with its own auth check. Route Handlers are for callers outside
the UI, such as webhooks.

In this client, `src/lib/api.ts` plus `src/lib/hooks/` already plays the role of that layer: one
place every request goes through.

## Version notes

Advice written for other versions is wrong here in specific ways:

- **Next.js 15 (this client):** `params`, `searchParams`, `cookies()` and `headers()` are async, with
  temporary sync access. `fetch` and `GET` Route Handlers are no longer cached by default — older
  posts saying otherwise are out of date.
- **Next.js 16 only — not this client:** sync access to those APIs is removed; `middleware.ts` is
  renamed `proxy.ts`; parallel-route slots require `default.js`; `next lint` is removed.
- React renamed "Server Actions" to "Server Functions" in 2024; Next.js keeps "Server Action" for the
  form case.
