# `removeChildNode` must not free yoga

`removeChildNode` in `packages/core/src/dom.ts` is **also called from
`insertBeforeNode`** to detach a node before re-inserting it during keyed
re-ordering (Vue's reconciler hits this path for `v-for` reorders, `Static`
remounts, etc.). If `removeChildNode` frees the yoga subtree, the
re-insert sees `yogaNode === undefined` and silently skips wiring layout
back up — one child disappears from rendering with no error.

The rule: **`removeChildNode` is pure detach. Yoga is freed only on real
removals** — the reconciler's `removeChild` / `removeChildFromContainer`
paths in the host renderer. The comment at `dom.ts:200-202` codifies this
("Call this only on real removals — never inside
appendChildNode/insertBeforeNode's helper detach call").

Ink uses the same split (`repos/ink/src/dom.ts`). The
`reorder children` test in the Reconciler suite is the regression guard.

## Related

- [[yoga-vs-dom-indices]] — the "removeChildNode is safe" note there only
  meant "doesn't need yoga-index translation"; the lifetime concern here
  is orthogonal and equally load-bearing.
