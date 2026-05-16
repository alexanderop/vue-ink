#!/bin/bash
# Helper (not hooked directly). Spawns headless Claude in the background to
# extract durable learnings from a transcript into brain/.
# Usage: _brain-extract.sh <transcript_path> <trigger_label>

set -euo pipefail

transcript_path="${1:?transcript_path required}"
trigger="${2:-unknown}"

[ -f "$transcript_path" ] || exit 0

BRAIN_DIR="$CLAUDE_PROJECT_DIR/brain"
LOG="$CLAUDE_PROJECT_DIR/.claude/brain-extract.log"
[ -d "$BRAIN_DIR" ] || exit 0

read -r -d '' prompt <<EOF || true
You are reviewing a Claude Code conversation transcript to extract durable
learnings into the brain/ knowledge vault.

Transcript (JSONL): $transcript_path
Brain vault: $BRAIN_DIR

First read $BRAIN_DIR/index.md and any existing files relevant to the
conversation topic. Then read the transcript.

Extract only NEW, durable learnings worth saving across sessions. If nothing
surprising or non-obvious happened, write nothing and exit.

SAVE:
- User corrections about how to work in this codebase (include the WHY)
- Non-obvious codebase invariants discovered during the session
- Architectural rationale worth remembering next session
- Mistakes the agent made that future sessions should avoid

DO NOT SAVE:
- The specific task that was worked on (ephemeral)
- Anything recoverable from git, file state, or CLAUDE.md
- Anything already covered by existing brain/ notes — prefer updating over duplicating
- General programming knowledge

For each learning, write one markdown file under
\$BRAIN_DIR/<category>/<kebab-slug>.md. Match the terse style of existing
files. brain/index.md regenerates automatically — do not edit it.

If nothing qualifies, write nothing.
EOF

(
    printf '\n--- %s trigger=%s ---\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$trigger" >> "$LOG"
    BRAIN_EXTRACT_CHILD=1 claude -p "$prompt" --permission-mode bypassPermissions >> "$LOG" 2>&1
) </dev/null >/dev/null 2>&1 &

exit 0
