#!/usr/bin/env bash
# PreToolUse(Edit|Write) — deny edits to vendored deps and monorepo wiring.
# Pattern adapted from Pixelmojo "Claude Code Hooks" guide for vue-ink.
set -euo pipefail

input=$(cat)
path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')

[ -z "$path" ] && exit 0

# Strip project-dir prefix when present so checks work for both absolute and
# already-relative paths.
rel="${path#${CLAUDE_PROJECT_DIR:-}/}"

deny() {
  jq -nc --arg r "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $r
    }
  }'
  exit 0
}

case "$rel" in
  repos/*|*/repos/*)
    deny "Blocked: repos/** is vendored read-only reference material (see CLAUDE.md). Do not edit."
    ;;
  pnpm-workspace.yaml)
    deny "Blocked: pnpm-workspace.yaml is monorepo wiring. Edit by hand if intentional, then re-run."
    ;;
  package.json)
    deny "Blocked: root package.json is monorepo wiring. Edit a package's own package.json, or do this by hand."
    ;;
esac
