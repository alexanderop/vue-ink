# `useAnimation()` composable

## Why
Spinners, progress bars, and timed transitions need a shared animation tick. Each component running its own `setInterval` causes redundant renders and drift. Ink consolidates all subscribers into one timer plus a render-throttle window.

## Scope
- Depends on `renderer/render-throttle.md` (the `renderThrottleMs` value comes from the same place).
- Add `ANIMATION_CONTEXT_KEY` provided by `render.ts`: `{ subscribe(tickCb, intervalMs): { startTime, unsubscribe }, renderThrottleMs }`.
- Implementation: a single `setInterval` keyed by greatest-common-divisor of subscriber intervals (or simply the minimum). Each tick walks subscribers and fires those due.
- `useAnimation({ interval = 100, isActive = true }) → { frame, time, delta, reset }`.
- Reset on `isActive: false → true`, interval change, or explicit `reset()`.
- Skip ticks that fall inside the active render-throttle window; coalesce on the next allowed render.

## Acceptance criteria
- Multiple `useAnimation` consumers share one timer (verifiable via `setInterval`/`clearInterval` spy in tests).
- `frame` increments at the configured interval ±5%.
- Disabling and re-enabling resets values to zero.
- Reset function restarts timing without rebuilding the subscription.

## References
- Ink source: `repos/ink/src/hooks/use-animation.ts`, `repos/ink/src/components/AnimationContext.ts`, `repos/ink/src/ink.tsx` (animation scheduler).
