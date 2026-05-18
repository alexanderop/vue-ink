---
name: pack-listing-check-is-shallow
description: CI publish-dry-run only proves dist/ and .d.ts files appear in the pack listing — it does not prove consumers can resolve them
metadata:
  type: project
---

`.github/workflows/ci.yml`'s `publish-dry-run` job greps `npm pack --dry-run --json` output for at least one `dist/` entry and at least one `.d.ts$` entry per publishable package. That catches missing builds, broken `files` arrays, and `.npmignore` drift.

It does NOT catch:

- Wrong `exports` map (subpath unresolvable, wrong `types` condition order)
- ESM/CJS dual-package hazards
- `.d.ts` resolution failures across `moduleResolution: bundler | node16 | nodenext`
- Mismatched `main`/`module`/`types` vs. `exports`

`publint` + `@arethetypeswrong/cli` cover that gap and are the obvious next layer if a "types don't resolve in consumer X" bug ever shows up.

**How to apply:** when investigating a packaging/.d.ts/exports bug, don't assume the green CI proves the package is consumable — only that files were emitted. Reach for `publint` / `attw --pack` locally to actually validate resolution.
