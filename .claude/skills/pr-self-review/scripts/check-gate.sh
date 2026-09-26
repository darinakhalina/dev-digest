#!/usr/bin/env bash
# PreToolUse hook (see .claude/settings.json). Denies `git push` / `gh pr create` /
# `gh pr merge` unless a fresh pr-self-review PASS is on record for the CURRENT diff.
# It never runs the review itself: a review takes minutes, and a hook that times out
# fails OPEN, which would turn the gate into a no-op exactly when it matters.
#
# Scope, stated plainly: this only sees tool calls Claude makes. A command typed in the
# terminal, a `!` prefix, `--no-verify`, and the GitHub merge button all bypass it. Real
# enforcement is the required status check in CI — see gate.md §6.
#
# Decisions (exit 0 + JSON permissionDecision; exit 2 is the deprecated blunt path):
#   not a push/PR command ................. allow
#   PR_SELF_REVIEW_OVERRIDE set ........... allow, reason echoed to stderr
#   no state file ......................... deny
#   verdict BLOCKED ....................... deny
#   diff moved since the review ........... deny
#   state unreadable / jq missing ......... deny  (we cannot verify → we do not pretend)
#   PASS and hash matches ................. allow
set -uo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
STATE="$ROOT/.pr-self-review.json"

allow() { exit 0; }
deny() { # reason
  jq -nc --arg r "$1" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}' 2>/dev/null \
    || { echo "$1" >&2; exit 2; }
  exit 0
}

input="$(cat)"

if ! command -v jq >/dev/null 2>&1; then
  # No jq means we cannot read the state at all. Unlike the usual fail-open advice, say so:
  # a gate that silently disappears is worse than one that is briefly in the way.
  echo "pr-self-review: jq not found on PATH, cannot verify the gate" >&2
  exit 2
fi

cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // ""' 2>/dev/null || echo "")"

# Match the command being RUN, not the string appearing anywhere in it. A substring test
# denies `printf '...git push...'`, which pushes nothing — and a gate that cries wolf is one
# people learn to override. Split on shell separators, drop leading VAR=value assignments,
# then read the first real word of each segment.
is_push_command() {
  local seg first matches=0
  local segments
  segments="$(printf '%s' "$1" | awk '{gsub(/&&|\|\||[;|]|\n/, "\n"); print}')"
  set -f
  while IFS= read -r seg; do
    seg="${seg#"${seg%%[![:space:]]*}"}"
    while case "$seg" in [A-Za-z_]*=*) [ "${seg%%=*}" = "${seg%%[![:alnum:]_]*}" ] ;; *) false ;; esac; do
      case "$seg" in *[[:space:]]*) seg="${seg#*[[:space:]]}"; seg="${seg#"${seg%%[![:space:]]*}"}" ;; *) seg="" ; break ;; esac
    done
    # shellcheck disable=SC2086
    set -- $seg
    [ $# -gt 0 ] || continue
    case "$1" in
      git)
        shift
        while [ $# -gt 0 ]; do
          case "$1" in
            -C|-c) shift 2 || break ;;
            -*) shift ;;
            *) break ;;
          esac
        done
        [ "${1:-}" = "push" ] && matches=1
        ;;
      gh)
        [ "${2:-}" = "pr" ] || continue
        case "${3:-}" in create|merge) matches=1 ;; esac
        ;;
    esac
  done <<< "$segments"
  set +f
  [ "$matches" = 1 ]
}

is_push_command "$cmd" || allow

if [ -n "${PR_SELF_REVIEW_OVERRIDE:-}" ]; then
  echo "pr-self-review: overridden — reason: ${PR_SELF_REVIEW_OVERRIDE}" >&2
  allow
fi

[ -f "$STATE" ] || deny "No pr-self-review on record for this branch. Run /pr-self-review before pushing, or set PR_SELF_REVIEW_OVERRIDE=\"reason\" for a genuine hotfix."

verdict="$(jq -r '.verdict // "ERR"' "$STATE" 2>/dev/null || echo ERR)"
saved="$(jq -r '.diffHash // "ERR"' "$STATE" 2>/dev/null || echo ERR)"

if [ "$verdict" = "ERR" ] || [ "$saved" = "ERR" ]; then
  deny "pr-self-review state file is unreadable ($STATE). Re-run /pr-self-review; the gate will not guess."
fi

if [ "$verdict" = "BLOCKED" ]; then
  n="$(jq -r '.criticalCount // "?"' "$STATE" 2>/dev/null || echo "?")"
  deny "pr-self-review BLOCKED this diff ($n critical). Fix them and re-run /pr-self-review, or set PR_SELF_REVIEW_OVERRIDE=\"reason\"."
fi

current="$("$DIR/diff-hash.sh" 2>/dev/null || echo ERR)"
[ "$current" = "ERR" ] && deny "pr-self-review cannot hash the current diff, so it cannot confirm the last PASS still applies. Re-run /pr-self-review."

if [ "$saved" != "$current" ]; then
  deny "Your changes moved since the last pr-self-review, so that PASS is stale. Re-run /pr-self-review so the gate reflects what you are about to push."
fi

allow
