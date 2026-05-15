# `<Static>` dedup happens in the renderer, not the component

vue-ink's `<Static>` re-renders **all** items on every paint. The DOM tree
always reflects the full item list. The renderer compares the serialized
static output with the last paint and emits only the new suffix above the
live frame.

## Why not slice in the component (like ink does)

ink's React `Static` slices `items.slice(index)` and bumps `index` via
`useLayoutEffect`. Ink's flush model gives `useLayoutEffect` a guaranteed
spot between commit and paint. Vue 3's scheduler does not:

- `flush: 'post'` watchers, `onMounted`, `onUpdated`, `nextTick().then`,
  `setTimeout(0)`, `queueMicrotask` — none of them give a "after paint, before
  the next render" hook in Vue's flush.
- Setting an `index` ref to advance the cursor would trigger a second render
  inside the same flush microtask. The second render clears the children
  *before* the renderer's `queuePostFlushCb` paint job walks the tree, so the
  brand-new items vanish before ever hitting the stream.

The investigation in p5-static-and-animation (see `tickets/p5…/components-static.md`)
walked through `flush: 'post'`, `nextTick`-deferred microtasks, `setTimeout(0)`,
and `Promise.resolve().then` — all of them produced the same race in the
"items grow from `[]` to `[x]`" case.

## What we do instead

- `<Static>` is a thin wrapper around `<ink-box internal_static …>` that
  always emits every item. No internal `index` ref, no `watch`, no
  `onMounted`/`onUpdated`.
- `render()` keeps `lastStaticOutput`. On each `doRender`:
  ```ts
  const staticOutput = renderStaticSubtrees(rootNode, terminalWidth);
  const newStatic = staticOutput.startsWith(lastStaticOutput)
      ? staticOutput.slice(lastStaticOutput.length)
      : staticOutput;
  lastStaticOutput = staticOutput;
  ```
- Only `newStatic` is written above the live frame. Repeated paints with the
  same items produce `newStatic === ''` and emit nothing extra.

## Invariants worth not breaking

- Items are **append-only**. Mutating earlier items in place (or replacing
  the array with a reordered copy) breaks the prefix-match, so the renderer
  falls back to emitting the entire current static output. That's correct
  but verbose — call it out in the component docstring if anyone tries to
  use `<Static>` for live-editable lists.
- The static walk renders each `internal_static` subtree to its **own** Yoga
  layout pass (`renderSingleStatic`). The subtrees use `position: 'absolute'`
  so they don't take space in the parent flex layout; calling
  `calculateLayout` on the subtree directly is what gives them real
  dimensions.
- The renderer's `hasStaticContent` walk runs every paint to decide whether
  to engage `skipStaticElements: true`. Cheap (counts to first hit) but it
  *does* descend through the live tree — don't move it inside a hot loop.

## Related

- [[yoga-vs-dom-indices]] — the same DOM/Yoga index split rule applies inside
  `renderStaticSubtrees`; we trust the existing `appendChildNode` discipline.
- [[output-hot-path]] — Static's per-paint full re-render means it benefits
  directly from the `Output.get()` optimizations.
- `packages/vue-ink/test/static.test.ts` — pins the "items rendered once
  even across live-frame repaints" guarantee.
