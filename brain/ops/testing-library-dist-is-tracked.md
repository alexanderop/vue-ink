---
name: testing-library-dist-is-tracked
description: `packages/testing-library/dist/` is the only `dist/` in git despite repo-wide `dist` gitignore; use `git add -u` to stage updates
metadata:
  type: project
---

`.gitignore` has `dist` at the root. Every package's `dist/` is ignored EXCEPT `packages/testing-library/dist/`, which was committed historically (likely with `git add -f`) and is now tracked.

Consequence for `/push`: `git add packages/testing-library/dist/` fails with

> The following paths are ignored by one of your .gitignore files: packages/testing-library/dist

Verify what's actually tracked, then update via `-u`:

```
git ls-files packages/testing-library/dist/   # confirms tracked files
git add -u packages/testing-library/dist/     # stages modifications only
```

**Why:** `git add <path>` honours `.gitignore` and refuses ignored paths. `git add -u <path>` restages already-tracked files and skips the ignore check, which is exactly what's needed when an ignored directory contains tracked files.

**How to apply:** Whenever `git status` shows modifications under `packages/testing-library/dist/` (e.g. after `pnpm build` or test runs that rebuild it), reach for `git add -u <path>` instead of trying `git add <path>` and then guessing at `-f`. Don't use `-f` — it would also stage files that should stay ignored.
