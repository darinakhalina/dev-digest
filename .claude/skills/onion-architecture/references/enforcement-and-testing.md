# Enforcement and testing

How the rings are checked by a machine, and how each ring is tested. Sources are in `../README.md`.

## Contents

- [Why a gate](#why-a-gate)
- [Running it](#running-it)
- [The rules](#the-rules)
- [The baseline](#the-baseline)
- [Debt recorded in the baseline](#debt-recorded-in-the-baseline)
- [Testing each ring](#testing-each-ring)

## Why a gate

Cockburn notes that business logic leaks into a new layer because nothing mechanically detects the
violation; Simon Brown and Noback say the same. TypeScript has no package-private visibility, and
`tsc` with `moduleResolution: "Bundler"` checks nothing about direction. dependency-cruiser was
already a dependency of `server/` (the indexer uses it), runs without a lint step, and exits non-zero
on violations.

## Running it

```sh
cd server
pnpm arch             # the gate: exits 1 on any violation not in the baseline
pnpm arch:baseline    # rewrite the baseline — only after FIXING recorded violations
```

For the full list, including recorded debt:

```sh
node_modules/.bin/depcruise --config .dependency-cruiser.cjs --output-type err-long src
```

`pnpm arch` cruises `src/` only. Tests import concrete adapters on purpose, and that is allowed.

## The rules

All in `server/.dependency-cruiser.cjs`, all `error`:

| Rule | Forbids |
|---|---|
| `no-circular` | runtime import cycles (type-only cycles are ignored — services typing the `Container` create them) |
| `contracts-are-innermost` | `src/vendor/**` importing anything from the app |
| `pure-domain` | `domain`/`status`/`helpers`/`constants.ts` importing db, drizzle, adapters, the container, fastify, SDKs or Node I/O |
| `core-knows-no-http` | services, repositories and domain files importing fastify |
| `service-not-routes` | a service importing `routes.ts` |
| `repository-not-upward` | a repository importing its service or routes |
| `routes-no-db` | `routes.ts` importing `db/` or drizzle |
| `routes-not-repository` | `routes.ts` importing a repository |
| `service-via-repository` | a service importing `db/client`, `db/schema` or drizzle at run time |
| `no-cross-module-imports` | a module importing another module's files other than its `types.ts` and `domain.ts`; `_shared` is exempt |
| `adapters-know-no-modules` | `src/adapters/**` importing `src/modules/**` |
| `adapters-not-container` | an adapter importing the container |
| `only-container-imports-adapters` | anything but `platform/container.ts` importing a concrete adapter |

The config needs `tsConfig` to resolve the `@devdigest/shared` alias, and is CommonJS because
`server/package.json` is `"type": "module"`.

## The baseline

`.dependency-cruiser-known-violations.json` lists every violation that existed when the gate was
added. `pnpm arch` ignores exactly those edges and fails on any other. This is the ratchet:

- A new violation fails immediately, in every rule, including rules the old code breaks.
- Fixing a recorded violation: regenerate the baseline **in the same change**, so the fixed edge
  cannot silently return.
- Never regenerate the baseline to make a new violation pass. If a rule is wrong, change the rule and
  say why in the same change.
- Adding a rule: run it first with `--output-type err`, fix or record what it finds, regenerate the
  baseline.

## Debt recorded in the baseline

The baseline holds 21 edges. They are known and grouped here so nobody treats them as precedent:

| Group | Edges | The fix, when someone touches it |
|---|---|---|
| `pulls`, `settings`, `workspace`, `polling` query from `routes.ts` | 8 | a `repository.ts` and `service.ts` per module |
| `repo-intel` and `reviews/diff-loader` import from `adapters/` | 8 | most targets (`codeindex/extract`, `git/diff-parser`, `astgrep`, `tokenizer`) are pure parsers kept in `adapters/`, not port implementations — move them out of `adapters/` rather than exempting them |
| `adapters/astgrep` and `adapters/depgraph` import `repo-intel/constants` | 2 | move the shared constants inward |
| `repos/service` imports `repo-intel/constants` | 1 | the same move |
| `repos/helpers` imports `db/schema` | 1 | take the row type from `db/rows.ts` |
| `reviews/run-executor` imports `db/schema` | 1 | through the reviews repository |

## Testing each ring

The sources agree on direction and disagree on how much to mock. The position taken here follows
Khorikov, Fowler, Google's testing blog and Cosmic Python: use real collaborators where you own them,
fakes for your own ports, mocks only for systems you do not control.

| Ring | Test | Doubles |
|---|---|---|
| Domain rules | plain unit test, inputs to output | none — if one is needed, the function is not pure |
| Service | unit test of the public method | fakes for ports via `ContainerOverrides`; `vi.fn` only where the call itself is the behaviour ("posted one comment") |
| Repository | `*.it.test.ts` against real Postgres (testcontainers) | none — the database is a managed dependency; do not mock it |
| Route | `buildApp` + `app.inject()`: status, envelope, 422 | `ContainerOverrides` for LLM, GitHub, git |
| Adapter | its own test against the port contract | a fake of the SDK is acceptable here |
| Architecture | `pnpm arch` | — |

- Test a rule once, at the lowest ring that holds it. Route tests cover mapping, not business rules.
- A multi-repository transaction is tested for real: force the second write to fail in an
  `.it.test.ts` and assert the first write is absent. A fake with a `committed` flag proves only that
  the service asked to commit.
- A test that has to patch a module import (`vi.mock` of a file) instead of using an override is a
  sign the dependency bypassed the container.
