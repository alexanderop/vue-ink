# Nested `ink-text` must become `ink-virtual-text`

Yoga refuses to attach children to a node with a measure function. `ink-text`
has one (it measures wrapped string width), so a nested `ink-text` inside
another `ink-text` aborts the WASM heap with `Cannot add child: Nodes with
measure functions cannot have children`.

Ink dodges this in its React reconciler (`repos/ink/src/reconciler.ts` ~ line
195) by tracking `hostContext.isInsideText` and rewriting nested `ink-text`
to `ink-virtual-text` at `createInstance` time. `ink-virtual-text` has no yoga
node ([[yoga-vs-dom-indices]]) and is squashed into the parent's text run.

Vue's runtime `createRenderer` API does not give `createElement` access to
the parent host element — so we cannot make that decision in the renderer.
The fix is at the **component** layer:

- `<Text>` `provide()`s `INSIDE_TEXT_KEY` (in `packages/components/src/text-context.ts`).
- `<Text>`, `<Newline>`, `<Transform>` each `inject(INSIDE_TEXT_KEY, false)`
  and pick the host element name accordingly:
  `h(isNested ? 'ink-virtual-text' : 'ink-text', …)`.

Every component that could emit `ink-text` must participate. Anything new
that does so (e.g. future ANSI-coloured fragments) needs to follow the same
pattern, or the WASM heap will abort on first mount.

## Tests

- `packages/vue-ink/test/Newline.test.ts` — Newline inside Text
- `packages/vue-ink/test/Transform.test.ts` — nested Transforms compose
