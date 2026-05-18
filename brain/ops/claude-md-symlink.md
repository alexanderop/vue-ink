---
name: claude-md-symlink
description: CLAUDE.md is a symlink to AGENTS.md — Edit refuses to write through it, always target AGENTS.md
metadata:
  type: reference
---

# `CLAUDE.md` is a symlink to `AGENTS.md`

The repo keeps a single source of truth in `AGENTS.md`; `CLAUDE.md` is a symlink pointing at it so both agent CLIs find the same file.

```
$ readlink CLAUDE.md
AGENTS.md
```

The Edit/Write tool **refuses to write through symlinks** and returns:

> Refusing to write through symlink: /…/CLAUDE.md. Resolve the symlink and pass the real target path explicitly.

## How to apply

- When updating agent instructions, always target `AGENTS.md` directly. Reading `CLAUDE.md` is fine — only writes are blocked.
- Don't try to "fix" the symlink by editing `CLAUDE.md` after a `rm` — the symlink is intentional. Re-point or recreate it only if the user asks.

## Related

- [[agent-hooks]] — other harness/project rules that silently deny agent actions
