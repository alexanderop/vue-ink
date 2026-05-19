---
name: no-plusplus-lint
description: oxlint via `vp lint` enforces no-plusplus; use `x += 1`, not `x++` or `++x`
metadata:
  type: feedback
---

The repo's lint pipeline (`pnpm lint` → `vp lint`, also run by the lefthook
pre-commit hook) enforces `eslint(no-plusplus)`. There is no local
`.oxlintrc`/`eslint.config.*` to grep — the rules come from `vite-plus`'s
defaults, so the convention is invisible from the repo root.

**Rule:** never use `++x`, `x++`, `--x`, or `x--`. Write `x += 1` / `x -= 1`.

**Why:** the pre-commit hook will reject the commit and you'll spend a round
trip fixing it. Hit this in `apps/playground/src/playground/TerminalPreview.vue`
writing `const runId = ++latestRunId` — had to split it into
`latestRunId += 1; const runId = latestRunId;`.

**How to apply:** when you reach for an increment counter (run IDs, indices,
loop bookkeeping), reach for `+= 1` from the start. No `++` / `--` survives
the lint pass anywhere under `packages/` or `apps/`.
