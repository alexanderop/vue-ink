---
name: agent-skill-paths
description: Claude Code reads project-level skills from .claude/skills/, not .agents/skills/ — files under .agents/ are inert unless symlinked
metadata:
  type: reference
---

# Project skills live under `.claude/skills/`

This repo has skill SKILL.md files in two places:

- `.agents/skills/{brain,reflect,meditate,plan,review,ruminate}/SKILL.md` — convention from the brainmaxxing upstream (`poteto/brainmaxxing`), pre-`.claude/skills/` existed. **Inert** from Claude Code's perspective.
- `.claude/skills/{brain,reflect,meditate,plan,review,ruminate}/SKILL.md` — what the Claude Code harness actually enumerates at session start.

At the **user** level (`~/.claude/skills/`) the convention is the same — many of those entries are symlinks back into `~/.agents/skills/` to bridge content. The vue-ink project does not symlink; the two trees were duplicates after the install.

## How to apply

- When asked to "install a skill" or "add a skill", write under `.claude/skills/<name>/SKILL.md`. Don't be misled by an existing `.agents/skills/<name>/` — that's leftover content from before `.claude/skills/` was added, not the active source.
- Newly added skills don't appear in this session's available-skills list. The harness enumerates skills at startup; the user needs to reopen Claude Code to see them.
- If you later prune `.agents/skills/`, double-check nothing outside this repo symlinks into it.

## Related

- [[agent-hooks]] — `.claude/settings.json` wiring (hooks, formatters); same directory the harness reads
