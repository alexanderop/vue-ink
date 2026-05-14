# Render throttle (`maxFps`) + animation scheduler

## Why
Without throttling, an animating component running at 60 fps blocks the main loop and saturates terminals over SSH. Ink defaults to 30 fps and coalesces all renders within that window. Also lets `useAnimation` skip mid-window ticks cleanly.

## Scope
- Add `maxFps?: number` (default 30) to `RenderOptions`.
- Replace the immediate `doRender()` path with a throttle: schedule the next render at `lastRenderTime + 1000/maxFps`, dropping intermediate calls.
- Compute `renderThrottleMs = 1000 / maxFps`, publish via `ANIMATION_CONTEXT_KEY` (see `hooks/use-animation.md`).
- `maxFps: Infinity` disables throttling (test branch).

## Acceptance criteria
- With `maxFps: 30`, a tight `setInterval(setState, 1)` produces ≤ 31 frames per second (verifiable in test by spying writes).
- Last frame is never lost (a render scheduled inside the window still fires on the trailing edge).
- `maxFps: 0` is rejected with a clear error.

## References
- Ink source: `repos/ink/src/ink.tsx` (frame scheduler), `repos/ink/src/components/AnimationContext.ts`.
