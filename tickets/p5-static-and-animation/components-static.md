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

## Review findings (2026-05-15)

Quality review confirmed `<Static>` is the **single highest-leverage missing feature** in vue-ink. Two additional pieces of context the original scope undersells:

- **The scaffolding is missing, not just the component.** Today vue-ink's renderer has no `skipStaticElements` flag, no `staticNode` field on the root, no `onStaticChange` / `onImmediateRender` hooks. The component's contract is small (~60 lines in `repos/ink/src/components/Static.tsx`), but the **renderer side** is ~30 lines across `repos/ink/src/reconciler.ts` (commit boundary), `repos/ink/src/output.ts` (separate static buffer), and `repos/ink/src/log-update.ts` (write-once-above semantics). Implementation must touch `packages/renderer/src/render.ts` (paint job + `fullStaticOutput` field) AND `packages/core/src/render-node-to-output.ts` (`skipStaticElements` flag), not just `@vue-ink/components`.
- **Strategic value is "half of ink's use cases".** Tap-style test reporters, Gatsby-style scrollback logs, any "log + spinner/progress bar" CLI shape. The brain-note workaround (`useStdout().write()`) collapses the moment layout reflow or terminal resize happens — there's no equivalent of ink's "erase main output, write staticOutput, re-emit main" sequence.

### Sequencing note
Closely tied to `tickets/p0-foundation/renderer-output-correctness.md` fix 4 (BSU/ESU gating) — both touch the paint-loop wrapping in `render.ts`. Land the correctness fix first so this ticket isn't fighting with a stale paint scaffold.
