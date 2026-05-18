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
  metadata via `internal_accessibility` on the host node so the SR walker
  can read it without re-running setup. They **also** inject the renderer-
  provided `ACCESSIBILITY_CONTEXT_KEY` (shared between packages via
  `Symbol.for('vue-ink.accessibility')` so identity is stable without forcing
  components to depend on the renderer) to short-circuit two ink-parity
  behaviours in setup:
  - `<Text aria-label>` swaps the slot children for the label string when
    SR is on — mirrors ink (`repos/ink/src/components/Text.tsx:87-88`).
  - `<Box aria-hidden>` returns `null` when SR is on so the whole subtree
    skips reconciliation, Yoga layout, and child lifecycle hooks —
    mirrors ink (`repos/ink/src/components/Box.tsx:76-78`).

## Why metadata on the DOM _and_ a setup branch

We now do both:

- **Metadata on the DOM** — `internal_accessibility.{label, hidden, role,
state}` drives the SR walker (`renderNodeToScreenReaderOutput`). This
  keeps the visual VDOM stable and lets the walker pick up everything in
  one pass at paint time.
- **Setup branch in `<Text>` / `<Box>`** — required for ink semantic parity:
  - `aria-label` on Text replaces children, so children's `onMounted` (and
    Yoga measurement) don't run when SR is on.
  - `aria-hidden` on Box returns `null`, so the whole subtree is never
    reconciled.

Components can read the SR flag without depending on `@vue-ink/renderer` by
sharing `ACCESSIBILITY_CONTEXT_KEY` via Node's global symbol registry
(`Symbol.for('vue-ink.accessibility')`). Both packages declare an
`InjectionKey` with the same string; identity matches at runtime without
either side importing the other.

## Style transforms are stripped

`squashTextNodesPlain` (local to `render-node-to-output.ts`) is a copy of
`squashTextNodes` minus the `internal_transform` call. Without it, chalk
ANSI escapes (bold, color, inverse) leak into the SR stream.

## Vue prop naming gotcha

Vue camelizes both **declared** prop names and **incoming** props at
lookup time. So:

- Declare camelCase (`ariaLabel: { type: String, ... }`) — `props.ariaLabel`
  is typed and works without any cast.
- Users still pass either form (`<Box aria-label="…">` in templates,
  `h(Box, { 'aria-label': '…' })` or `{ ariaLabel }` in render
  functions); both resolve to the same camelCase declared prop.

Earlier versions of `Box.ts` / `Text.ts` used
`(props as Record<string, unknown>)['ariaLabel']` to dodge a perceived
kebab-vs-camel mismatch — that cast is no longer needed and was
removed. See `packages/components/src/Box.ts:62` and
`Text.ts:80` for the current pattern.

## Related

- `repos/ink/test/screen-reader.tsx` — reference tests we ported.
- `packages/vue-ink/test/behavior/ScreenReader.test.ts` — 25 cases
  covering aria-label/hidden/role/state, display:none, multi-line, lists.
- [[../porting/from-react-ink]] — aria-\* row in the parity table.
