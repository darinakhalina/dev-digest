#!/usr/bin/env bash
# Stable hash of every open change vs the base branch: committed-not-merged + staged +
# unstaged + untracked contents. Used BOTH by the review (to stamp .pr-self-review.json)
# and by the PreToolUse hook (to detect that the tree moved since the last PASS), so the
# two can never disagree about what "the current diff" means.
#
# Prints the hash on stdout. Exits non-zero only if it cannot determine a base.
set -euo pipefail

BASE_REF="${PR_SELF_REVIEW_BASE:-origin/main}"

if ! BASE="$(git merge-base "$BASE_REF" HEAD 2>/dev/null)"; then
  echo "diff-hash: cannot find a merge base with ${BASE_REF}" >&2
  exit 1
fi

{
  git diff "$BASE"
  # Untracked files count: a new file must invalidate a stale PASS. Name AND content,
  # so a rename or an edit both move the hash.
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    printf '\n--- untracked: %s ---\n' "$f"
    cat -- "$f" 2>/dev/null || true
  done < <(git ls-files --others --exclude-standard | LC_ALL=C sort)
} | shasum -a 256 | awk '{print $1}'
