---
name: roadmap-drift
description: ROADMAP.md checkboxes lag the codebase — verify each item against current state before scoping work
metadata:
  type: project
---

# `ROADMAP.md` drifts — verify items before scoping work from it

`ROADMAP.md` is a snapshot of what was missing when it was written, not a
contract. Checkbox items often stay `❌` long after the work has shipped,
because nobody flips them on merge.

**Why:** A 2026-05-18 pass through the 0.3 + 0.4 buckets found nearly
everything already done but un-checked-off:

- "README light on examples/migration" → README already has porting +
  devtools sections; `packages/docs/` is a full VitePress site with 7
  guide pages + 5 API pages.
- "TSDoc on public surface" → already in place for 13 composables, 6
  components, `render`, `renderToString`, `measureElement`. Real gaps
  were tiny: type-level blocks on `RenderOptions` / `RenderMetrics` /
  `Instance` and `//`-to-`/** */` conversion on `kittyFlags` /
  `kittyModifiers`.
- "Audit `CoverageStragglers`/`FinalCoverage` for dead-branch tests" →
  32/32 are real regression guards; each comment documents a failure
  mode.
- "Close remaining test-port gaps" → [[../porting/test-port-status]]
  line 175 reads "Full parity reached 2026-05-16."
- "Benchmark suite vs ink" → already merged in PR #15,
  `packages/vue-ink/bench/ink-comparison/`.

**How to apply:** When the user points at a `ROADMAP.md` item and says
"do that," run a verification pass *first* — read the referenced
files / docs / brain notes / PRs and confirm the gap is real. Then
present the actual remaining work, not the roadmap's framing. Update
`ROADMAP.md` (flip the checkbox + one-line evidence pointer) as part of
the same change so the next session doesn't repeat the dance.

## Related

- [[../porting/tracker-drift]] — same dynamic for parity trackers
- [[../principles/prove-it-works]] — the roadmap is a proxy; the code is
  the source of truth
