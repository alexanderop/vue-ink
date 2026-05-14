# `useBoxMetrics()` composable

## Why
Some layouts need to know the computed size/position of an element after layout (e.g. drawing a frame around dynamic text, scroll calculations). Reading Yoga values during render is unsafe; metrics must be published after the layout pass.

## Scope
- Depends on `renderer/measure-element.md`-style Yoga access.
- Add `addLayoutListener(root, cb): () => void` in `@vue-ink/core/dom.ts` so the renderer can notify after every layout commit.
- `useBoxMetrics(elRef): { width, height, left, top, hasMeasured }`. Re-read on every render of this component, on layout-listener fires, and on `stdout.resize`.
- Element ref: Vue template ref pointing to the DOM node returned by `<Box ref="...">`. Requires Box to forward a Yoga-bearing node — currently `ink-box`. Document the `templateRef → DOMElement` retrieval pattern.

## Acceptance criteria
- After mount, `hasMeasured` is `true` and metrics are non-zero (assuming visible).
- Resizing terminal updates metrics within one frame.
- Detaching the ref returns `{ width: 0, height: 0, left: 0, top: 0, hasMeasured: false }`.

## References
- Ink source: `repos/ink/src/hooks/use-box-metrics.ts`, `repos/ink/src/dom.ts` (`addLayoutListener`).
