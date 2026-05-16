#!/bin/bash
# Stop hook — debounced brain extraction.
# Each Stop bumps a stamp file. After IDLE_SECS of no new Stops, fire.
# If a newer Stop arrives during the wait, this scheduler exits silently and
# the latest scheduler wins.

set -euo pipefail

# Skip if we're inside a child headless run (prevents recursion).
[ -z "${BRAIN_EXTRACT_CHILD:-}" ] || exit 0

input=$(cat)

transcript_path=$(printf '%s' "$input" \
    | python3 -c 'import json,sys; print(json.load(sys.stdin).get("transcript_path",""))' 2>/dev/null || true)

[ -n "$transcript_path" ] || exit 0
[ -f "$transcript_path" ] || exit 0

STAMP_FILE="$CLAUDE_PROJECT_DIR/.claude/.brain-extract-stamp"
IDLE_SECS=60

STAMP="$(date +%s).$$.${RANDOM}"
echo "$STAMP" > "$STAMP_FILE"

(
    sleep "$IDLE_SECS"
    current=$(cat "$STAMP_FILE" 2>/dev/null || echo "")
    [ "$current" = "$STAMP" ] || exit 0
    "$CLAUDE_PROJECT_DIR/.claude/hooks/_brain-extract.sh" "$transcript_path" "Stop+${IDLE_SECS}s"
) </dev/null >/dev/null 2>&1 &

exit 0
