#!/usr/bin/env bash
# PreToolUse(Bash) — deny `pnpm add` for production deps without -D.
# Mitigates slopsquatting; devDeps and lockfile installs stay allowed.
set -euo pipefail

input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')

# Only match `pnpm add`. `pnpm install` (no args) is just the lockfile install
# and stays allowed.
if ! printf '%s' "$cmd" | grep -Eq '(^|[[:space:]])pnpm[[:space:]]+add([[:space:]]|$)'; then
  exit 0
fi

# Allow devDep installs.
if printf '%s' "$cmd" | grep -Eq -- '(^|[[:space:]])(-D|--save-dev|--dev)([[:space:]]|$)'; then
  exit 0
fi

jq -nc '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: "Blocked: production dependency installs require manual review (slopsquatting risk). Use `pnpm add -D` for devDeps, or run the install yourself in the terminal."
  }
}'
