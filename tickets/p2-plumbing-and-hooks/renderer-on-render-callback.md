# `onRender` callback render option

## Why
Tests and instrumentation want a hook that fires every time a frame commits, with metrics (frame number, duration, line count). Allows snapshotting without spying on stdout.

## Scope
- Add `onRender?: (metrics: RenderMetrics) => void` to `RenderOptions`.
- Define `RenderMetrics = { frame: number; durationMs: number; lineCount: number; output: string }`.
- Call after each successful frame write (inside `doRender`), before the next event-loop tick.
- Wrap in try/catch and emit failures via stderr so user callbacks can't crash the renderer.

## Acceptance criteria
- `onRender` fires once per frame, in order.
- Receives accurate frame index and line count.
- A throwing callback prints to stderr but doesn't unmount.

## References
- Ink source: `repos/ink/src/ink.tsx` (`onRender` invocation).
