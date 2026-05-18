---
name: layout-drift-from-ink
description: vue-ink's test folder structure has drifted from ink's one-flat-folder/one-file-per-concept convention — duplicate files per concept, historical behavior/ subfolder, *EdgeCases companions with no upstream
metadata:
  type: project
---

# Test layout drift from ink

Ink's convention is **one flat folder, one file per concept, kebab-case**. No
bucketing, no `*EdgeCases` companions, no `behavior/` vs `unit/` split:
`borders.tsx` sits next to `render.tsx` sits next to `hooks-use-input.tsx`.
`helpers/` and `fixtures/` are the only subfolders.

vue-ink has drifted from that. Concrete drift, audited 2026-05-18:

- **Duplicate files per concept.** Ink's `borders.tsx` → vue-ink has
  `Border.test.ts` + `BorderEdgeCases.test.ts` + `BoxBorderEdgeCases.test.ts` +
  `behavior/Borders.test.ts`. Ink's `render.tsx` → vue-ink has 8 `Render*.ts`
  files. Same pattern for `Static`, `Transform`, `Newline`, `Styles`.
- **`*EdgeCases.test.ts` companions** (`BorderEdgeCases`,
  `BoxBorderEdgeCases`, `BoxPositionEdgeCases`, `NewlineEdgeCases`,
  `StaticEdgeCases`, `TransformEdgeCases`, `SquashStylesEdge`) have no ink
  counterpart. Ink keeps edge cases inside the one concept file.
- **`packages/vue-ink/test/behavior/`** is **not** an architectural pure-vs-behavior
  split. It exists because the ink test suite was ported in waves, and the
  later wave landed in a subfolder. The split isn't load-bearing.
- **Grab-bag names.** `CoverageStragglers.test.ts` / `FinalCoverage.test.ts`
  bundle unrelated guards under a coverage-flavored name. Each scenario
  actually owns a specific failure mode (see top-of-file comments per
  `[[../porting/test-port-status]]`).
- **`helpers.ts` at top level** instead of `helpers/` — fine for one file,
  blocks growth.

`PascalCase.test.ts` naming is intentional (auto-memory `feedback_test_file_naming.md`) —
do not flip to kebab-case to match ink there.

**How to apply:** when adding a new test, look for an existing file covering
the same ink concept and extend it (with a nested `describe`) rather than
spawning a sibling like `FooEdgeCases.test.ts`. When consolidating, the
target shape is ink's: one file per concept, edge cases in a `describe('edge
cases')` at the bottom of the parent.

## Related

- [[../principles/mirror-upstream-conventions]] — the principle this drift violates
- [[../porting/test-port-status]] — file-by-file map showing the duplications
- [[ink-strategy]] — how ink tests itself, what vue-ink borrowed
- [[hoist-pure-helpers]] — related anti-pattern: re-inventing helpers per file
