# Screen-reader output path

When `render(component, { isScreenReaderEnabled: true })` (or
`INK_SCREEN_READER=true`), the renderer skips the visual pipeline and walks
the DOM directly to produce a flat string of text + ARIA announcements.

## Where it lives

- **Walker** — `renderNodeToScreenReaderOutput(node, opts)` in
  `packages/core/src/render-node-to-output.ts`. Joins row children with
  spaces, column children with newlines.
- **Metadata** — `internal_accessibility?: { label?, hidden?, role?, state? }`
  on `DOMElement` (`packages/core/src/dom.ts`). Components attach this in
  their setup; the walker reads it.
- **Switch** — `renderTree(...)` in `packages/renderer/src/render.ts` picks
  between `renderNodeToOutput` (visual) and `renderNodeToScreenReaderOutput`
  based on the `isScreenReaderEnabled` flag.
- **Components** — `Box` accepts `aria-label`, `aria-hidden`, `aria-role`,
  `aria-state`; `Text` accepts `aria-label`, `aria-hidden`. Both forward
  the metadata via `internal_accessibility` on the host node — they do
  *not* read `useIsScreenReaderEnabled()` themselves.

## Why metadata on the DOM, not conditionals in setup

Ink branches in `Box`/`Text` setup: if SR is enabled, render `aria-label`
text instead of children. That works because React re-renders on
context change. In vue-ink we put the data on the DOM node instead, and
the walk reads it at paint time. Two reasons:

1. The component subtree is identical regardless of SR mode; only the
   render path differs. Less re-rendering, smaller VDOM churn.
2. `@vue-ink/components` doesn't depend on `@vue-ink/renderer`, so it
   can't `useIsScreenReaderEnabled()` directly. Pushing the decision
   into the walker avoids a circular package dep.

## Style transforms are stripped

`squashTextNodesPlain` (local to `render-node-to-output.ts`) is a copy of
`squashTextNodes` minus the `internal_transform` call. Without it, chalk
ANSI escapes (bold, color, inverse) leak into the SR stream.

## Vue prop naming gotcha

Declared `'aria-label'` in a Vue component's `props` block — Vue
camelizes the key, so inside setup you read `props.ariaLabel`, not
`props['aria-label']`. Originally tripped this and every aria test
silently passed `undefined`. The fix is a cast: pull each via
`(props as Record<string, unknown>)['ariaLabel']`. Users still pass them
kebab-case (`<Box aria-label="…">`).

## Related

- `repos/ink/test/screen-reader.tsx` — reference tests we ported.
- `packages/vue-ink/test/behavior/ScreenReader.test.ts` — 25 cases
  covering aria-label/hidden/role/state, display:none, multi-line, lists.
- [[../porting/from-react-ink]] — aria-* row in the parity table.
