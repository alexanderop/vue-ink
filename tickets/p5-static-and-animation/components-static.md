# `<Static>` component

## Why
`<Static>` writes items above the live frame and never rewrites them. Tap, Gatsby, and most "log + spinner" UIs depend on it. Without it, a long-running tool can't print scrollback-safe history.

## Scope
- Add `Static` to `@vue-ink/components`.
- Props: `items: T[]`, `style?: Styles`, default-slot `(item, index)` render function.
- Emits an `ink-box` with `internal_static: true` and `position: 'absolute'`, `flexDirection: 'column'`.
- Tracks the count of already-flushed items; new items are appended on next render. Older items are sliced off the slot output.
- Renderer must split output: static frames are written once with a trailing `\n`, then the live frame is drawn underneath. See Ink's `log-update.ts` + `output.ts`.
- Requires `styles/position.md` (position: absolute) and a renderer split-output change.

## Acceptance criteria
- Appending to `items` between renders writes the new rows once and does not erase them on the next live-frame paint.
- Items that have already been printed are not re-rendered (no flicker).
- Resizing the terminal does not duplicate past static rows.
- Test mirrors `repos/ink/test/static.tsx`.

## References
- Ink source: `repos/ink/src/components/Static.tsx`
- Ink renderer: `repos/ink/src/render-node-to-output.ts` (`internal_static` branch)
- Brain note: `brain/renderer/yoga-vs-dom-indices.md`
