#!/usr/bin/env bash
# Deterministic checks for the root AGENTS.md "Do not touch" rules. No model, no tokens.
# Every rule here is a CRITICAL in the skill's closed catalog, and every one of them is
# decidable from git alone.
#
# stdout: one JSON object per finding (NDJSON), empty when clean.
# exit:   0 = clean, 1 = at least one finding, 2 = could not run.
#
# Deliberately NOT flagged: server/src/db/migrations/meta/*.json — the journal and the
# snapshots are rewritten by `pnpm db:generate` on every legitimate migration. Only *.sql
# is add-only. A naive "migrations/ changed" rule fires on every migration ever generated.
set -uo pipefail

BASE_REF="${PR_SELF_REVIEW_BASE:-origin/main}"
command -v jq >/dev/null 2>&1 || { echo "repo-rules: jq not found" >&2; exit 2; }
BASE="$(git merge-base "$BASE_REF" HEAD 2>/dev/null)" || { echo "repo-rules: no merge base with ${BASE_REF}" >&2; exit 2; }

found=0
emit() { # rule, file, issue, fix
  jq -nc --arg r "$1" --arg f "$2" --arg i "$3" --arg x "$4" \
    '{rule:$r, severity:"CRITICAL", file:$f, issue:$i, fix:$x, source:"repo-rules.sh"}'
  found=1
}

status="$(git diff --name-status -M "$BASE" 2>/dev/null)"
names="$(printf '%s\n' "$status" | awk -F'\t' 'NF>1{print $NF}')"
untracked="$(git ls-files --others --exclude-standard 2>/dev/null)"
all_changed="$(printf '%s\n%s\n' "$names" "$untracked" | awk 'NF')"

has() { printf '%s\n' "$all_changed" | grep -qE "$1"; }

# 1. The five CLAUDE.md symlinks must stay symlinks (mode 120000). A regular file there
#    silently overrides the AGENTS.md beside it, and the two then drift unnoticed.
for p in CLAUDE.md client/CLAUDE.md e2e/CLAUDE.md reviewer-core/CLAUDE.md server/CLAUDE.md; do
  mode="$(git ls-files -s -- "$p" 2>/dev/null | awk '{print $1}')"
  if [ -z "$mode" ]; then
    emit "symlink-missing" "$p" "instruction symlink is gone from the index" \
         "restore it: ln -sf AGENTS.md $p && git add $p"
  elif [ "$mode" != "120000" ]; then
    emit "symlink-broken" "$p" "mode $mode — became a regular file, so it now overrides AGENTS.md" \
         "apply the change to AGENTS.md, then: rm $p && ln -s AGENTS.md $p && git add $p"
  fi
done

# 2. Migrations are generated, never edited: any modify/rename/delete of a .sql is a violation.
while IFS=$'\t' read -r st a b; do
  case "$st" in
    A|'') continue ;;
  esac
  case "$a" in
    server/src/db/migrations/*.sql) ;;
    *) continue ;;
  esac
  emit "migration-edited" "$a" \
       "migration .sql was ${st%%[0-9]*}-changed${b:+ → $b}; migrations are generated and append-only" \
       "revert this file and regenerate with: cd server && pnpm db:generate"
done <<< "$status"

# 3. Schema touched but no new migration — drizzle-kit was not run.
if has '^server/src/db/schema/' ; then
  new_migration="$(printf '%s\n' "$status" | awk -F'\t' '$1=="A" && $2 ~ /^server\/src\/db\/migrations\/.*\.sql$/')"
  new_untracked="$(printf '%s\n' "$untracked" | grep -E '^server/src/db/migrations/.*\.sql$' || true)"
  if [ -z "$new_migration" ] && [ -z "$new_untracked" ]; then
    emit "schema-without-migration" "server/src/db/schema/" \
         "schema changed but no new migration .sql was added" \
         "cd server && pnpm db:generate, then commit the generated migration"
  fi
fi

# 4. Lockfiles change only through the package manager. A hand-edited lockfile passes
#    locally and fails CI, which installs with --frozen-lockfile.
while IFS= read -r lock; do
  [ -n "$lock" ] || continue
  dir="$(dirname "$lock")"
  manifest="${dir%/.}/package.json"; manifest="${manifest#./}"
  if ! printf '%s\n' "$all_changed" | grep -qxF "$manifest"; then
    emit "lockfile-without-manifest" "$lock" \
         "lockfile changed but $manifest did not — CI installs with --frozen-lockfile and will fail there, not here" \
         "revert it and let the package manager rewrite it, or include the matching package.json change"
  fi
done <<< "$(printf '%s\n' "$all_changed" | grep -E '(^|/)(pnpm-lock\.yaml|package-lock\.json)$' || true)"

# 5. .claude/INSIGHTS.md must keep its name: engineering-insights loads it by path, and a
#    path that does not resolve stops the skill loading at all, in every session.
while IFS=$'\t' read -r st a b; do
  [ "${st:0:1}" = "D" ] || [ "${st:0:1}" = "R" ] || continue
  [ "$a" = ".claude/INSIGHTS.md" ] || continue
  emit "insights-moved" "$a" "harness INSIGHTS file was ${st:0:1}-changed${b:+ → $b}" \
       "restore the path — engineering-insights loads it by name"
done <<< "$status"

# 6. The two vendored @devdigest/shared copies must stay in step. Touching one without the
#    other is contract drift between client and server.
while IFS= read -r c; do
  [ -n "$c" ] || continue
  rel="${c#client/src/vendor/shared/}"; rel="${rel#server/src/vendor/shared/}"
  case "$c" in
    client/src/vendor/shared/*) other="server/src/vendor/shared/$rel" ;;
    server/src/vendor/shared/*) other="client/src/vendor/shared/$rel" ;;
    *) continue ;;
  esac
  [ -f "$other" ] || continue
  printf '%s\n' "$all_changed" | grep -qxF "$other" && continue
  if ! git diff --no-index --quiet -- "$c" "$other" 2>/dev/null; then
    emit "contract-drift" "$c" \
         "this vendored contract changed but $other did not, and the two now differ" \
         "mirror the change into $other — the copies are not synced automatically"
  fi
done <<< "$(printf '%s\n' "$all_changed" | grep -E '^(client|server)/src/vendor/shared/.*\.ts$' || true)"

exit $found
