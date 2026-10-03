export interface SeedSkill {
  name: string;
  description: string;
  type: 'rubric' | 'convention' | 'security' | 'custom';
  source: 'manual' | 'imported_url' | 'extracted' | 'community';
  enabled: boolean;
  body: string;
}

export const SEED_SKILLS: SeedSkill[] = [
  {
    name: 'breaking-change',
    description:
      'Flag a change that removes or alters a published contract an existing caller still depends on.',
    type: 'custom',
    source: 'manual',
    enabled: true,
    body: `# Breaking change to a published contract

A contract is published once something outside this change can depend on it: an
exported symbol, an HTTP route, a response field, an event payload, a CLI flag,
a database column another service reads. Removing one, renaming one, or making
one stricter breaks every caller that has not been updated in the same change.

Report at CRITICAL, and name the caller that breaks. "This is breaking" without
a victim is noise; "this is breaking, and X on line N still calls it" is a bug
report.

## Bad — the parameter became required, silently

\`\`\`ts
export function createInvoice(customerId: string, currency: string) { … }
\`\`\`

The previous signature was \`(customerId: string, currency?: string)\`. Every
existing one-argument call now fails to compile, or, in untyped callers, passes
\`undefined\` into code that no longer guards it.

## Good — the new requirement is additive

\`\`\`ts
export function createInvoice(
  customerId: string,
  currency: string = DEFAULT_CURRENCY,
) { … }
\`\`\`

Existing callers keep working, new callers can be explicit, and the default is
stated once where the function is defined.

## Do NOT flag

- A symbol that is not exported, or a route that is not registered.
- A brand-new route, field, or flag — nothing can depend on it yet.
- A change that loosens a contract: an argument that becomes optional, a field
  that becomes nullable on the REQUEST side, a narrower accepted type widened.
- Callers this same diff updates. Check before reporting.`,
  },
  {
    name: 'response-schema',
    description:
      'Flag changes to the shape of a response that a consumer already reads — removed, renamed, retyped or newly optional fields.',
    type: 'custom',
    source: 'manual',
    enabled: true,
    body: `# Response shape

A consumer reads a response by its shape. Changing that shape breaks the
consumer at run time, in production, usually far from this diff. Watch for a
field removed, a field renamed, a type changed, a value that could not be null
becoming nullable, and an array that becomes an object or the reverse.

Direction decides severity. Taking something away, or making it less certain,
is CRITICAL. Adding an optional field is not a finding at all.

## Bad — renamed on the way out

\`\`\`ts
return { customer_id: row.customerId, total_cents: row.totalCents };
\`\`\`

changed to

\`\`\`ts
return { customerId: row.customerId, total: row.totalCents };
\`\`\`

Two renames in one line. Every reader of \`customer_id\` and \`total_cents\` now
gets \`undefined\`, and \`undefined\` in arithmetic produces \`NaN\` rather than an
error, so the failure surfaces as a wrong number rather than a crash.

## Good — added alongside, removed later

\`\`\`ts
return {
  customer_id: row.customerId,
  customerId: row.customerId,
  total_cents: row.totalCents,
};
\`\`\`

Both shapes are served while consumers migrate; the old keys come out in a
separate, announced change.

## Do NOT flag

- A field ADDED to a response, optional or not.
- A change to a request shape that only loosens it.
- Internal types no serializer reaches.
- A shape this diff changes in the producer AND in every consumer it has.`,
  },
  {
    name: 'semver-discipline',
    description:
      'Flag a breaking change that ships without the version bump its consumers rely on to notice it.',
    type: 'custom',
    source: 'manual',
    enabled: true,
    body: `# Versioning discipline

A version is the only signal a consumer gets before they upgrade. A breaking
change under a patch or minor bump is worse than a breaking change under a major
one, because it arrives unannounced in a range they already accepted.

Report at WARNING, and only when BOTH are visible in this diff: a breaking
change, and a version that did not move to match it. If the diff does not touch
a version at all, say that the bump is missing rather than guessing a number.

## Bad

A removed export in the same diff as:

\`\`\`json
{ "version": "2.4.1" }
\`\`\`

changed to

\`\`\`json
{ "version": "2.4.2" }
\`\`\`

Consumers on \`^2.4.0\` receive the removal automatically.

## Good

\`\`\`json
{ "version": "3.0.0" }
\`\`\`

The range stops matching, the upgrade becomes a decision, and the changelog has
somewhere to hang.

## Do NOT flag

- An additive change under a minor bump. That is correct.
- A fix under a patch bump. Also correct.
- A missing bump when nothing in the diff is breaking.
- Version files this diff does not touch — you cannot see what CI will do.`,
  },
  {
    name: 'test-coverage-nudge',
    description:
      'Flag a branch, error path or exported function this diff introduces that no test in the same diff reaches.',
    type: 'custom',
    source: 'manual',
    enabled: true,
    body: `# Untested paths introduced by this change

A branch nobody exercises is a branch nobody has run. Report it only when the
diff itself introduces the path AND the diff itself contains no test that
reaches it.

Report at WARNING. Raise to CRITICAL when the untested path decides money,
authentication, authorisation, data deletion, or a security outcome.

## Flag

- A new \`if\` / \`else\` / \`switch\` arm whose alternate path no test covers.
- A new exported function with no test case referencing it.
- A reachable error path — \`catch\`, \`throw\`, early \`return\`, rejected promise —
  that no test triggers.
- A new HTTP route with no test that calls it.

## Name the missing case, or say nothing

A finding must state the input or state that would reach the path:
"\`formatBytes(-1)\` reaches the guard at bytes.ts:12; no test passes a negative".
"Add a test" without naming the case is not a finding.

## Do NOT flag

- Coverage of code this diff does not touch.
- Generated files, migrations, type-only changes.
- A missing end-to-end test when a unit test already reaches the branch.
- A path that is unreachable from any public entry point.`,
  },
  {
    name: 'mock-overreach',
    description:
      'Flag a test whose mocking removes the very behaviour the test claims to verify.',
    type: 'custom',
    source: 'manual',
    enabled: true,
    body: `# Mocking that hides what the test claims to check

A mock is a tool for determinism, not a way to make a test pass. The question
for every mock: if the real collaborator started returning something wrong,
would this test notice?

Report at WARNING.

## Flag

- Assertions that only confirm a mock was called — \`expect(fn).toHaveBeenCalled()\`
  — when the value it returns is what the code under test actually uses.
- A mock of the module under test itself, or of a pure helper it owns.
- A stub whose fixture is shaped so the assertion cannot fail regardless of the
  production code.
- A mocked repository in a test whose stated subject is a query or a transaction.

## Do NOT flag

- A mock of a genuinely external system: the network, the clock, a paid API, a
  third-party SDK.
- A mock used to force an error path that is otherwise hard to produce.
- Test doubles in a unit test whose subject is clearly the orchestration, not the
  collaborator.
- The number of mocks. Count is not the problem; what they conceal is.`,
  },
  {
    name: 'flaky-test-patterns',
    description:
      'Flag a test that can fail without the production code changing — time, randomness, ordering or sleeps.',
    type: 'custom',
    source: 'manual',
    enabled: true,
    body: `# Tests that fail for reasons other than a bug

A test that fails intermittently teaches the team to re-run CI instead of
reading it. Report the pattern, not the symptom — the diff cannot show you a
flake, only the shape that produces one.

Report at WARNING.

## Flag

- A dependence on wall-clock time: \`Date.now()\`, \`new Date()\` without a fixed
  clock, an assertion on elapsed milliseconds.
- Randomness without a seed: \`Math.random()\`, \`crypto.randomUUID()\` in an
  assertion rather than as an opaque identifier.
- A \`sleep\` / \`setTimeout\` used to wait for something, where a condition could
  be awaited instead.
- Shared mutable state between tests: a module-level singleton written in one
  test and read in another, a database row left behind.
- An assertion on the ORDER of an unordered result — object keys, a query with
  no \`ORDER BY\`, \`Promise.all\` results treated as sequential.

## Do NOT flag

- A fixed, frozen clock. That is the fix, not the problem.
- A random value used only as an opaque id that nothing asserts on.
- A timeout that bounds a test, rather than one that waits for a result.`,
  },
];

export const SEED_AGENT_SKILLS: Record<string, string[]> = {
  'API Contract Reviewer': ['breaking-change', 'response-schema', 'semver-discipline'],
  'Test Quality Reviewer': ['test-coverage-nudge', 'mock-overreach', 'flaky-test-patterns'],
};
