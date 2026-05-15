# Screen reader mode (context + env detection)

## Why
Foundation for all aria-* behaviour and `useIsScreenReaderEnabled`. The flag is set once at `render()` time and propagated via context so components can branch on it.

## Scope
- Add `isScreenReaderEnabled?: boolean` to `RenderOptions`.
- Default: `process.env.INK_SCREEN_READER === 'true'`.
- Provide `ACCESSIBILITY_CONTEXT_KEY` from `render.ts` with `{ isScreenReaderEnabled: Ref<boolean> }`.
- Document env var contract for SR users.

## Acceptance criteria
- `render(<App/>, { isScreenReaderEnabled: true })` flips the context.
- `INK_SCREEN_READER=true` env var enables it without explicit option.
- A consumer using `useIsScreenReaderEnabled()` reflects the value.

## References
- Ink source: `repos/ink/src/components/AccessibilityContext.ts`, `repos/ink/src/render.ts`, `repos/ink/readme.md` (Screen Reader Support).

## Review findings (2026-05-15)

Quality review surfaced a hidden second deliverable: **the flag and context are useless without a screen-reader render pass.**

- Today `useIsScreenReaderEnabled()` works and `INK_SCREEN_READER=true` flips a flag — but `packages/core/src/render-node-to-output.ts` only has the visual pass. The flag has nowhere to dispatch.
- Ink solves this with a second renderer function: `renderNodeToScreenReaderOutput(node) → string` (`repos/ink/src/render-node-to-output.ts:79-94`) that walks the same yoga tree but emits `(busy) role: text` semantic output. The `Ink` instance dispatches between them at paint time (`repos/ink/src/ink.tsx:540-542`: `render(rootNode, isScreenReaderEnabled)`).

### Additional scope (on top of the original)
- Port the second render function into `packages/core/src/render-node-to-output.ts` (or a sibling `render-node-to-screen-reader-output.ts`). Consumes `internal_accessibility` from the host nodes (provided by `tickets/p6-accessibility/accessibility-aria-props.md`).
- Wire the dispatch into `packages/renderer/src/render.ts`'s `doRender` — when `isScreenReaderEnabled` is true, replace the visual stringify pass with the SR pass.
- Suppress border/colour ANSI in SR output entirely.

### Sequencing
Without this scope, the SR env var is dead code. Either expand this ticket to include the second render pass, or pair-land it with `tickets/p6-accessibility/accessibility-aria-props.md` as a single "screen reader + aria" release theme.
