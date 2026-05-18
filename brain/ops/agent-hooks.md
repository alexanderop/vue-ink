---
name: agent-hooks
description: PreToolUse hooks in .claude/settings.json will reject certain Edit/Bash actions — know the rules so you don't waste a turn discovering them
metadata:
  type: reference
---

# `.claude/` hooks block certain agent actions

`.claude/settings.json` wires PreToolUse hooks that will hard-deny actions an agent might otherwise attempt. The hook scripts live in `.claude/hooks/` and return their own reason strings, but knowing the rules up front saves a round-trip.

## Edit / Write — `block-critical-files.sh`

Denied for any `file_path` matching:

- `repos/**` — vendored read-only reference (already noted in CLAUDE.md). Read freely, never edit.

The monorepo-wiring blocks (`pnpm-workspace.yaml`, root `package.json`) were removed on 2026-05-18 because they were getting in the way of legitimate root-level tooling work (adding devDeps for knip/publint/attw/size-limit, expanding `allowBuilds`). Edit those files normally now — but think twice before touching them: they affect every workspace package.

## Bash — `block-deps.sh`

Gated by `if: "Bash(pnpm add *)"` in settings. Denies `pnpm add <pkg>` without `-D` / `--save-dev` / `--dev`. Rationale in-script: slopsquatting risk on production deps. `pnpm install` (lockfile install, no args) is unaffected.

**How to apply:** if you genuinely need a runtime dep, ask the user to install it in their own terminal — don't try to bypass. For devDeps just use `-D`.

## PostToolUse — formatter is automatic

`PostToolUse(Edit|Write)` pipes the edited file to `pnpm exec oxfmt`. You do not need to format manually after writes — oxfmt is the project's formatter (no prettier, no eslint --fix in this role). It silently warns "no config found" on each run; that's harmless.

**Watch for diff bloat.** The hook reformats _only_ the file you touched, so the rest of the repo still uses the original tabs + single-quote style. Edit a file with non-trivial pre-existing style drift (e.g. `packages/renderer/src/render.ts`) and the resulting diff balloons with quote / indentation churn that drowns the real change. Use `git diff -w` to confirm the substantive delta is small, and split a separate `style(scope): apply oxfmt to <file>` commit so reviewers can scan the behavioral change in isolation.

## Related

- [[../principles/encode-lessons-in-structure]] — the hooks are the enforcement; this note is a heads-up so you don't bounce off them
