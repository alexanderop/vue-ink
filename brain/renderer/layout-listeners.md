# Layout listeners

Composables that need post-layout values (e.g. `useBoxMetrics`) can't read
Yoga during render — the layout pass hasn't run yet. We solve this the same
way ink does: the renderer fires a callback list after each commit.

## Where it lives

- **Storage** — `internal_layoutListeners?: Set<LayoutListener>` on the root
  `ink-root` node (`packages/core/src/dom.ts`).
- **API** — `addLayoutListener(rootNode, fn): () => void` and
  `emitLayoutListeners(rootNode): void` in the same file. `addLayoutListener`
  is a no-op (with a no-op disposer) for any non-root input, so consumers
  don't have to guard.
- **Emit site** — `doRender` in `packages/renderer/src/render.ts`, right
  after `renderTree(...)` returns and before the write. Yoga has already
  recomputed by that point; listeners can call `yogaNode.getComputedLayout()`
  with confidence.

## The resize trap

Resize handling used to be gated on `interactive && !debug`. That broke
`useBoxMetrics` under `@vue-ink/testing-library` (which renders with
`debug: true`): firing `stdout.emit('resize')` did nothing because no
listener was attached, so Yoga never re-laid-out and the composable saw
stale values.

The fix: the renderer attaches its `resize` listener **unconditionally**
(matches ink). Non-TTY streams never emit `resize` on their own, so it's
dormant in CI and prod-non-interactive. Tests get to drive it via the fake
stdout. The unmount path detaches unconditionally too.

If you add a regression test for resize behaviour, snapshot the listener
count **after** mount — `render()` itself attaches one. Use
`toBe(0)` post-unmount to catch leaks.

## Why useBoxMetrics keeps its own stdout listener

Both the renderer's resize handler and the composable's resize handler end
up calling the composable's `updateMetrics`, so on a real resize the work
happens twice. The composable keeps its own listener anyway because unit
tests (`withSetup` + fake stdout, no renderer) need a path to update metrics
without a paint. `writeIfChanged` makes the duplicate call idempotent.

## Related

- [[how-it-works]] — Yoga is the layout authority; this note explains how to
  observe its output without racing against it.
- `repos/ink/src/dom.ts` (`addLayoutListener` / `emitLayoutListeners`) — the
  reference implementation we mirror.
