#!/bin/bash
# PreCompact hook — fire brain extraction before automatic context compaction.

set -euo pipefail

# Skip if we're inside a child headless run (prevents recursion).
[ -z "${BRAIN_EXTRACT_CHILD:-}" ] || exit 0

input=$(cat)

transcript_path=$(printf '%s' "$input" \
    | python3 -c 'import json,sys; print(json.load(sys.stdin).get("transcript_path",""))' 2>/dev/null || true)

[ -n "$transcript_path" ] || exit 0

"$CLAUDE_PROJECT_DIR/.claude/hooks/_brain-extract.sh" "$transcript_path" "PreCompact"
