# One test file per ink concept

Vue-ink's `packages/vue-ink/test/` mirrors `repos/ink/test/` 1:1 — flat folder,
one file per concept, no categorical subfolders. When a new scenario surfaces
for an existing concept, **append a `describe` block to the concept file**.
Don't spawn a sibling.

Anti-patterns that previously drifted in and got removed (2026-05-18):

- **`*EdgeCases.test.ts` siblings.** `BorderEdgeCases`, `BoxBorderEdgeCases`,
  `NewlineEdgeCases`, `StaticEdgeCases`, `TransformEdgeCases`,
  `BoxPositionEdgeCases`, `SquashStylesEdge` — all folded into their parents.
  Edge cases are scenarios of the same concept, not a separate concept.
- **`behavior/` subfolder.** Was an artifact of porting in waves, not a
  load-bearing split. Dissolved; each file merged with or replaced its
  top-level counterpart. The `frame()` helper that behavior-style tests used
  now lives in `helpers.ts`.
- **`Render*` shotgun split.** Ink has one `render.tsx`; vue-ink had grown
  `RenderMisc`, `RenderInstances`, `RenderInteractive`, `RenderOnRender`,
  `RenderThrottle`. Collapsed back into one `Render.test.ts`.
- **Grab-bag coverage files.** `CoverageStragglers.test.ts` and
  `FinalCoverage.test.ts` accumulated unrelated guards under one roof. Each
  `describe` was rehomed to the topical concept file (`Dom`, `Styles`,
  `Render`, `Input`, `Background`, `RenderNodeToOutput`).

**How to apply:** before creating a new `*.test.ts`, check whether the
scenario belongs to an existing ink concept (`repos/ink/test/*.tsx`). If yes,
append. New file only when ink itself has a separate file — or when the unit
is vue-ink-internal with no ink analogue (`Output`, `RenderNodeToOutput`,
`Dom`, `WaitUntilRenderFlush`, etc.).

Naming follows existing memory: `PascalCase.test.ts` for components/renderer
units, `useFoo.test.ts` for composables. Kebab-case (ink's style) is _not_
used in vue-ink; the file-per-concept rule still applies regardless of case.

## Related

- [[../principles/mirror-upstream-conventions]]
- [[../porting/test-port-status]] — may be stale after the 2026-05-18 cleanup
- [[ink-strategy]]
