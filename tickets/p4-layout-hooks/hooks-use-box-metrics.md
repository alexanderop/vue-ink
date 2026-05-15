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

## Review findings (2026-05-15)

Quality review confirmed `useBoxMetrics` is the **higher-priority of the two layout-hook gaps** (the other being `useCursor`). Reasoning:

- **`useBoxMetrics` blocks a wide class of apps**: responsive tables, virtualized lists keyed on row height, anchored popovers, autosize text inputs. Anything that needs measure-then-render.
- **`useCursor` blocks one class of apps**: IME / inline editing affordances for non-ASCII input (Asian input, emoji search). Important but narrower.
- Implementation order should be: `useBoxMetrics` first; defer `useCursor` until someone files a real IME issue.

### Output shape (refinement on original scope)
Mirror VueUse idioms instead of returning a deep-reactive object — see `brain/composables/vueuse-patterns.md`:

```ts
useBoxMetrics(elRef): {
  width: ShallowRef<number>;
  height: ShallowRef<number>;
  left: ShallowRef<number>;
  top: ShallowRef<number>;
  hasMeasured: ShallowRef<boolean>;
}
```

Five `ShallowRef`s instead of one `Ref<{...}>`. Destructuring auto-unwraps in templates; per-dim watchers only fire when their dimension actually changes. Matches `useWindowSize`'s shape.
