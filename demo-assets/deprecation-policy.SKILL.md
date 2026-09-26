# deprecation-policy

Something that is going away should say so before it goes. A consumer who learns
of a removal from a stack trace had no chance to act; a consumer who was warned
one release earlier had every chance.

Flag a removal that arrives with no deprecation behind it. Report at WARNING when
the thing removed was published but little used, and at CRITICAL when a caller in
this repository still reaches it.

## Bad — deleted in one step

```ts
export function getCustomerTotals(id: string) { … }
```

deleted outright, with callers left to discover it.

## Good — announced, then removed

```ts
/** @deprecated since 3.2 — use getCustomerBalance(). Removed in 4.0. */
export function getCustomerTotals(id: string) {
  logger.warn('getCustomerTotals is deprecated; use getCustomerBalance');
  return getCustomerBalance(id);
}
```

Three things make this good and all three are needed: the replacement is named,
the removal has a version attached, and the old path still works until then.

A deprecation with no stated end is not a plan, it is a permanent second way of
doing things — say so when you see one.

## Do NOT flag

- Removing something that was never published: a private helper, an unregistered
  route, a symbol nothing exports.
- Removing something already marked deprecated in an earlier release, when the
  version it named has arrived.
- A deprecation notice added without a removal — that is the correct first step,
  not a finding.
- Internal refactors where this diff updates every caller it has.
