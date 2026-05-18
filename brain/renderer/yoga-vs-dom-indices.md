# Yoga child indices ≠ DOM child indices

The DOM tree (`childNodes` in `packages/core/src/dom.ts`) and the Yoga layout tree are **not 1:1**. Yoga only tracks children that have a `yogaNode`. DOM-only nodes — `#text`, `ink-virtual-text`, `ink-comment` — occupy slots in `childNodes` but **not** in Yoga.

So a DOM index `i` is not necessarily the right index to pass to `yogaParent.insertChild(childYoga, i)`. The yoga index is the count of yoga-bearing siblings strictly before position `i`.

There is a helper `toYogaIndex(childNodes, domIndex)` in `core/dom.ts` that does this translation. Use it (or matching logic) anywhere you mutate the yoga tree based on a DOM position.

## How this manifested

Vue's `v-for` compiles to a Fragment with a comment-node anchor. When mounting the fragment, Vue called `insert(child, parent, anchor)` where `anchor` was the comment. The DOM index of the comment included its own slot, but the yoga tree had no slot for the comment. `yoga.insertChild(yogaNode, domIndex)` then over-shot the yoga child count and corrupted the WASM heap → `RuntimeError: memory access out of bounds`.

Any `v-for` (or any time Vue mounts a Fragment with comment anchors, including conditional rendering and slots) was affected.

## Tests

`packages/vue-ink/test/Box.test.ts` — "handles Fragment children (v-for) without crashing yoga" — guards the regression.

## Related

- `appendChildNode` is safe because it uses `yogaNode.getChildCount()` as the target index — always correct for append-to-end.
- `removeChildNode` skips the index translation by passing the yoga node itself to `removeChild`. **But** it must not free the yoga subtree — see [[keyed-move-yoga-lifetime]]. Lifetime and index are independent concerns; both have to be right.
- Only insert-at-anchor needed translation.
