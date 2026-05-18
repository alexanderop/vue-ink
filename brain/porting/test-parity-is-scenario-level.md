---
name: test-parity-is-scenario-level
description: File-level test mapping (every ink file has a vue-ink counterpart) does not mean test parity — individual test(...) scenarios inside each file must be counted
metadata:
  type: project
---

# Test parity is scenario-level, not file-level

[[test-port-status]] tracks ink test files against vue-ink counterparts and
historically declared "full parity" when every row had a ✅. That metric
lies: a vue-ink test file with the same name can cover a fraction of the
`test(...)` blocks the ink file contains.

**Why:** A 2026-05-18 audit found ~80–100 missing scenarios across 9
files even though the tracker said "full parity reached 2026-05-16".
Biggest offenders: `use-animation.tsx` (45 ink scenarios vs ~5 covered),
`render.tsx` (61 vs ~30), `kitty-keyboard.tsx` (68 vs ~25),
`render-to-string.tsx` (32 vs 8). Most gaps are non-React behavioural
guards — clearTerminal family, raw-mode disable on unmount,
`isPrintable` matrix, padding/margin through `renderToString` — not
React-Concurrent-Mode dupes that should be dropped.

**How to apply:** When the user asks "do we have all the tests" or
"are we at parity", do not answer from the file-level table. Count
`test(...)` blocks in `repos/ink/test/<file>.tsx` and in the
vue-ink counterpart(s), and diff the scenario list. The tracker
points you at the right pair of files; the actual `test(` count
tells you the gap.

Cheap check:

```sh
rg -c "^test\(" repos/ink/test/use-animation.tsx
rg -c "^test\(" packages/vue-ink/test/behavior/AnimationBehavior.test.ts
```

Related: [[tracker-drift]] — same proxy-vs-source pattern at the API
layer. [[../principles/prove-it-works]] — count the real artifact, not
the table that summarises it.
