# Renderer output-pipeline silent correctness bugs

## Why
Four independent silent-correctness bugs in `packages/core/src/render-node-to-output.ts`, `packages/core/src/dom.ts`, and `packages/renderer/src/render.ts` cause subtle layout/leak/output-pollution issues that no test currently catches. None of these are missing features — they're regressions against ink's behaviour that any non-trivial app will eventually hit. Each fix is small (≤ 5 lines) and independent of the others.

## Scope

Four fixes, each one keystroke away. Land as one PR or split — they're orthogonal.

### Fix 1: `applyPaddingToText` is missing
- Ink offsets a text node's content by its first child's computed left/top so padding/margin on a wrapping `<Box>` that contains only text lays out correctly.
- vue-ink omits the call entirely in `packages/core/src/render-node-to-output.ts` (around the text-node branch).
- Port the helper from `repos/ink/src/render-node-to-output.ts:18-28`; call it in the same spot ink does (around `:152`).

### Fix 2: `overflow: hidden` clips the border itself
- Today the clip rect is `x` … `x + getComputedWidth()` (`packages/core/src/render-node-to-output.ts:55-66`).
- Border cells render outside that rect → content drawn over the border can leak through, and the border can be eaten by the clip.
- Mirror ink's use of `getComputedBorder(EDGE_*)` (`repos/ink/src/render-node-to-output.ts:171-194`) so the clip rect includes the border width on all four sides.

### Fix 3: `freeYogaSubtree` leaks measure-function closures
- ink's `cleanupYogaNode` calls `unsetMeasureFunc()` *then* `freeRecursive()` (`repos/ink/src/reconciler.ts:81-84`).
- vue-ink's `freeYogaSubtree` (`packages/core/src/dom.ts:139-144`) only calls `freeRecursive`.
- yoga-layout's WASM bindings hold the JS measure-function closure until you unset it; across many `<Text>` mount/unmount cycles this is a slow heap leak.
- Add `unsetMeasureFunc()` walk before `freeRecursive()`.

### Fix 4: BSU/ESU synchronized-output sequences written unconditionally
- `doRender` always wraps the frame with `${BSU}${erase}${text}\n${ESU}` (`packages/renderer/src/render.ts:395`).
- ink gates this through a `shouldSynchronize(stdout, interactive)` helper (`repos/ink/src/write-synchronized.ts:7-16`, called from `repos/ink/src/ink.tsx:993-995`).
- Today non-TTY / CI captured output is polluted with raw `\x1b[?2026h` / `\x1b[?2026l`. Tests work around this with an inline `stripBSU` regex (`packages/vue-ink/test/render-throttle.test.ts:6`).
- Port `shouldSynchronize` (or inline `interactive && isTTY`) and use it to gate the wrapping in `doRender`. Delete the `stripBSU` test workaround afterwards.

## Acceptance criteria

- A `<Box padding={2}><Text>{'a\nb'}</Text></Box>` renders `a` at column 2 row 2, not column 2 row 1 (covers fix 1).
- A `<Box width={5} borderStyle="single" overflow="hidden"><Text>{'x'.repeat(20)}</Text></Box>` renders a complete 1-cell-wide border on left & right with truncated content between (covers fix 2).
- Mounting + unmounting a `<Text>` 1000 times leaves yoga's instance count stable. Add a sanity assertion in a renderer test (covers fix 3).
- `render(<App/>, { stdout: nonTtyCapture })` produces output containing no `\x1b[?2026h` / `\x1b[?2026l` bytes; the existing `stripBSU` test helper becomes a no-op and can be removed (covers fix 4).
- Each fix has a regression test mirroring the relevant `repos/ink/test/*` file.

## References
- Ink source — fix 1: `repos/ink/src/render-node-to-output.ts:18-28,152`.
- Ink source — fix 2: `repos/ink/src/render-node-to-output.ts:171-194`.
- Ink source — fix 3: `repos/ink/src/reconciler.ts:81-84`.
- Ink source — fix 4: `repos/ink/src/write-synchronized.ts:7-16`, `repos/ink/src/ink.tsx:993-995`.
- Affected vue-ink files: `packages/core/src/render-node-to-output.ts`, `packages/core/src/dom.ts`, `packages/renderer/src/render.ts`, `packages/vue-ink/test/render-throttle.test.ts` (cleanup).
- Brain note: `brain/renderer/output-hot-path.md`.
