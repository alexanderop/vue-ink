# `waitUntilExit()` registers a `beforeExit` handler

A non-interactive example (no `useApp`, no `useInput`) renders, then
`await instance.waitUntilExit()` would hang forever — stdin is paused,
signal handlers and the stdout `resize` listener don't ref the event
loop, so Node sees an empty loop with a pending top-level await and
emits "Detected unsettled top-level await" before exiting.

Fix mirrors ink (`repos/ink/src/ink.tsx:874-884`): the first call to
`waitUntilExit()` registers `process.once('beforeExit', onBeforeExit)`,
where `onBeforeExit` triggers `unmount()`. `unmount()` clears the
registration via `process.off('beforeExit', onBeforeExit)`.

Lives at `packages/renderer/src/render.ts` — search for
`beforeExitRegistered`. Interactive renders are unaffected because
raw-mode stdin already refs the loop.

## Why a flag, not always-on

If we registered the handler unconditionally at render time, every
non-interactive example would hold the loop open even when nothing ever
called `waitUntilExit()`. Gating on first call keeps the
fire-and-forget path lean.

## Related

- [[../porting/from-react-ink]] — the `waitUntilExit` row in the lifecycle gotchas table.
