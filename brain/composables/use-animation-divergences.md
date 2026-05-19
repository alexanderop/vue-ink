---
name: use-animation-divergences
description: Known behavior divergences between vue-ink's useAnimation and ink's — Date.now() is not monotonic, and pausing zeros frame/time/delta instead of holding the last value.
metadata:
  type: project
---

# `useAnimation` — known divergences from ink

Two source-level divergences from `repos/ink/src/use-animation.tsx` that
tests must adapt to (don't "fix" the test to match ink — fix the source
or document the divergence).

## 1. `Date.now()` is not guarded against going backwards

`packages/renderer/src/animation-scheduler.ts` uses raw `Date.now()` for
`currentTime` and `startTime`. `useAnimation` does
`Math.floor((currentTime - startTime) / interval.value)` for `frame` and
`(currentTime - startTime)` for `time`. If wall-clock jumps backwards
(NTP adjustment, manual clock change, OS suspend/resume), **`frame.value`
becomes negative**.

Ink's scheduler clamps to monotonic time. Vue-ink does not.

**How to apply:** if you port `wall clock changes do not move animations
backwards` from ink, expect it to fail. Either fix the scheduler to use
`performance.now()` (or clamp `currentTime >= lastSeenTime`), or skip
the scenario with a comment naming this note.

## 2. Pausing zeroes `frame`/`time`/`delta` synchronously

`packages/renderer/src/composables/useAnimation/index.ts:115-117` —
the `watch([isActive, interval])` callback calls `resetState()` when
`isActive` flips to false, immediately setting `frame.value = 0`,
`time.value = 0`, `delta.value = 0`.

Ink keeps `frame` at the last paused value until the next start.

**Why the divergence:** vue-ink's `watch` runs `flush: 'sync'`, and the
contract chosen here treats `isActive=false` as "reset" rather than
"freeze". Changing it would break existing consumers that rely on the
reset behavior.

**How to apply:** when porting ink's `pausing animation` test, assert
`frame === 0` after pause, not `frame === pausedFrame`. The shared
guarantee both sides honor is "no further ticks fire while paused" —
assert that instead.

## Related

- [[../porting/from-react-ink]] — composable shape changes table
- [[../testing/ink-strategy]] — `@vue-ink/testing-library` hardcodes
  `maxFps: Infinity`, so throttled-maxFps animation tests can't run
  through the public surface; drive the renderer directly if needed.
