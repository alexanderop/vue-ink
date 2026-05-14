# `waitUntilRenderFlush()` on Instance + `useApp()`

## Why
After a `rerender(...)` or a state mutation, consumers (CLI scripts, tests) need to know when the next frame is actually flushed to stdout. Promise resolves post-write.

## Scope
- Track a `pendingFlush` promise inside `render.ts`. Resolve it after `writeStream.write(...)` callback fires; otherwise after `process.nextTick`.
- Expose:
  - `instance.waitUntilRenderFlush(): Promise<void>`
  - `useApp().waitUntilRenderFlush(): Promise<void>` (via AppContext).
- Re-create the promise after each frame so consecutive calls wait for *the next* frame, not the last.

## Acceptance criteria
- After `rerender(newCmp)`, `await waitUntilRenderFlush()` resolves only after the frame is flushed (verifiable by spying on `writeStream.write`).
- Calling without any pending change resolves immediately on the next microtask.

## References
- Ink source: `repos/ink/src/ink.tsx` (`waitUntilRenderFlush`), `repos/ink/src/render.ts`.
