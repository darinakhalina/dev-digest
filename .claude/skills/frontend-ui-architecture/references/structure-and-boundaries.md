# Structure and boundaries

Where folders go, when code moves between them, and which way imports may point. Sources for every
claim are in `../README.md`.

## Contents

- [Scale the structure to the project](#scale-the-structure-to-the-project)
- [Colocate first, promote on a compatible second consumer](#colocate-first-promote-on-a-compatible-second-consumer)
- [Dependency direction](#dependency-direction)
- [Enforcing it](#enforcing-it)
- [Barrel files](#barrel-files)
- [Naming](#naming)
- [Nesting and aliases](#nesting-and-aliases)

## Scale the structure to the project

There is no single correct structure. React, Next.js, Josh Comeau, Robin Wieruch and Dan Abramov all
say so. Pick one, apply it consistently, and change it when the current one starts to hurt — not
before.

The common progression (Wieruch): one file → several files → a folder per component → folders by
type of code → folders by feature → features grouped into domains. Fowler names what triggers the
move: top-level folders by layer are fine while small; once a layer grows too big, the top level
becomes domain modules that are layered inside.

Feature-Sliced Design is the far end of that line. Its own docs say to adopt it only when the current
architecture is causing trouble.

**In this client:** routes under `src/app/` are the features. Route-private code is colocated in
`_components/`, shared code sits in `src/components/`, `src/lib/` and `@devdigest/ui`. Bulletproof
React's own Next.js example uses the same shape — route-local composition in `_components/`, with
reusable code outside the router. There is no `src/features/` folder, and adding one is a structural
decision for the team, not something to introduce while placing a file.

## Colocate first, promote on a compatible second consumer

> "Place code as close to where it's relevant as possible." — Kent C. Dodds

Tests, styles, constants, helpers and sub-components start next to the code they serve. Code moves to
a shared location when a second consumer appears — Wieruch, Comeau and FSD all use that trigger — and
can move back down when it loses one.

The trigger is a second **consumer**, not a second import. Before promoting, confirm the new place
can use the thing unchanged:

- **Data.** Does the new place have the data the component needs? A list row that holds a preview
  summary cannot feed a component that expects a full record.
- **Contract.** Does the new place's spec allow the behaviour? A card with Accept/Reject buttons
  cannot go on a surface whose spec forbids state-changing controls.
- **Props.** Would the new place need different props? Then it needs a variant, and the shared
  version would grow flags for both.

When any of these fails, write what the second place needs — often a smaller component — rather than
moving the first one and bending it.

## Dependency direction

Bulletproof React, FSD and Wieruch agree: code flows one way, from shared into features into the app,
and shared code never imports feature code.

```
page.tsx → its _components/ → src/components/, src/lib/, @devdigest/ui, src/vendor/shared
```

- A route does not import another route's `_components/`. A **parent** route's `_components/` counts
  as another route's: it is private to that route even though the folder is above you.
- `src/components/` and `src/lib/` do not import from `src/app/`.
- Features that need each other are composed at the level above them — the page passes one into the
  other as `children` or a prop — rather than importing each other (Bulletproof, FSD strategy C).

Needing an import that points the wrong way is a signal that something is in the wrong place. Move
it; do not add the import.

## Enforcing it

Every source that states the direction also enforces it with a tool, because a convention nobody
checks erodes. The shapes, from each tool's documentation:

- **eslint `import/no-restricted-paths`** (Bulletproof) — one zone per feature, e.g.
  `{ target: './src/features/auth', from: './src/features', except: ['./auth'] }`. No capture
  syntax, so each new feature needs a new zone by hand.
- **dependency-cruiser** — one rule covers every folder through a back-reference:
  `from: { path: "^src/features/([^/]+)/" }`, `to: { path: "^src/features/", pathNot: "^src/features/$1/" }`.
  The server package already depends on dependency-cruiser.
- **eslint-plugin-boundaries** v7 — element types with captured names; its v7 syntax differs from
  most blog examples.
- **Nx `enforce-module-boundaries`** and FSD's **Steiger** linter, for monorepos and FSD projects.
- **`import/no-cycle`** — set to `error` in Bulletproof, recommended by TkDodo.

The client enforces none of this today.

## Barrel files

This is genuinely contested, and the disagreement is worth knowing precisely.

- **For:** FSD requires every slice to have an `index` public API, and its linter checks nothing
  imports around it. Comeau measured the cost in his own apps as negligible.
- **Against:** Bulletproof says to import files directly (Vite tree-shaking). Vite's performance guide
  says to avoid barrels. TkDodo: they invite circular imports and give no privacy unless a lint rule
  enforces it. Atlassian measured 75% fewer build minutes after removing them from the Jira frontend.
- **What both sides do in practice:** one `index.ts` per component folder, and never
  `export *` over a whole folder. Bulletproof's real code keeps exactly that in `components/ui/`.

**In this client:** every component folder has an `index.ts` that re-exports its component — 46 of
them. Keep that pattern for new folders. Do not add a barrel over a folder of components or over
`src/lib/`. The client's `vendor/shared` barrel already caused one incident: it re-exports `.js`
specifiers that resolve to `.ts` files, which broke value imports until `next.config.mjs` taught the
bundler `resolve.extensionAlias`.

## Naming

Sources disagree on casing — Bulletproof, Wieruch and the Next.js Learn course use kebab-case;
Comeau, the React and FSD examples use PascalCase files. Every source agrees the choice matters less
than applying one consistently.

**In this client** the choice is made and recorded in `client/AGENTS.md`: route-private components in
`_components/<PascalName>/`, shared ones in `src/components/<kebab-name>/` around a PascalCase file.
Keep the two apart — the folder name then says whether a component is private or shared. Hooks are
`useThing.ts`. Sibling files are named plainly: `constants.ts`, `helpers.ts`, `styles.ts`,
`index.ts`.

## Nesting and aliases

- **Nesting:** the old React FAQ suggests at most three or four nested folders and calls it "only a
  recommendation"; Wieruch says two levels of component folders, as a rule of thumb. No source makes
  it a hard rule.
- **Aliases:** use `@/` across module boundaries — Bulletproof, Next.js, Wieruch, Comeau and FSD all
  endorse it. FSD and Nx add: relative imports inside a module, aliases across. A path with five
  `../` in it breaks silently on the next move, and in this client a broken import passes `tsc` and
  fails only at `pnpm build`.
