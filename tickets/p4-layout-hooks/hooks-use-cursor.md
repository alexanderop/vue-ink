# `useCursor()` composable

## Why
Input components (IME composition, text input cursor) need to show the terminal cursor at a specific position inside the rendered frame. Without `useCursor`, vue-ink hides the cursor for the entire app lifetime.

## Scope
- Depends on a cursor-position pipeline in the renderer (see `renderer/synchronized-output.md` and Ink's `log-update.ts`).
- Provide `CURSOR_CONTEXT_KEY` from `render.ts` with `setCursorPosition(pos: { x: number; y: number } | undefined)`.
- During the commit phase (post-flush callback before `doRender`), publish the current position to the log-update writer so the cursor escape is emitted *after* the final frame line.
- Cleanup must reset to `undefined` on unmount.

## Acceptance criteria
- A component that calls `setCursorPosition({ x: 5, y: 2 })` causes the terminal cursor to appear at that coordinate when the next frame writes.
- Calling with `undefined` hides the cursor again.
- Unmounting a cursor-publisher restores the cursor-hidden state.

## References
- Ink source: `repos/ink/src/hooks/use-cursor.ts`, `repos/ink/src/log-update.ts`, `repos/ink/src/cursor-helpers.ts`.
