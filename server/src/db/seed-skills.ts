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
];

export const SEED_AGENT_SKILLS: Record<string, string[]> = {
  'API Contract Reviewer': ['breaking-change', 'response-schema', 'semver-discipline'],
};
