# Debug-mode `useStdout/useStderr.write()` must be a single combined write

In `debug: true`, ink's `writeToStdout(data)` emits **one** `stdout.write(data + fullStaticOutput + lastOutput)` call (`repos/ink/src/ink.tsx:676-678`), and `writeToStderr(data)` emits `stderr.write(data)` plus **one** `stdout.write(fullStaticOutput + lastOutput)` replay (`:705-708`). The test surface inspects each captured write, so splitting "user data" from "frame replay" into two `target.write()` calls breaks parity — assertions like `frames.some(w => w.includes("from stdout hook\nHello"))` look for a single frame containing both.

vue-ink's `writeAboveFrame` originally did the non-debug erase-write-repaint trio for every mode, producing two captured frames in debug. Fixed in `packages/renderer/src/render.ts` by branching on `debug` early and emitting the same combined writes ink does.

**Vue-specific twist.** In ink, by the time `writeToStdout` runs from a post-state-update hook, React has already committed the new tree and `this.lastOutput` reflects it. In vue-ink, a `watch(..., { flush: 'post' })` callback can fire _before_ the renderer's own post-flush paint, so the cached `lastOutput` is still the pre-update frame. The debug branch of `writeAboveFrame` therefore calls `renderTree(rootNode, …)` on-demand to read the just-patched host DOM instead of trusting the cached frame. The cache update (`lastOutput = text`) inside `doRender`'s debug branch is still useful for callers that arrive _after_ the paint.

**Related double-paint.** Catching this fix surfaced a separate duplicate-frame bug: `render()` was calling `renderImmediate()` immediately after `app.mount(rootNode)`, but Vue's mount already drains the post-flush queue (which contains the render job scheduled by host-element insertions). Result: two identical initial frames. Guarded by a `hasCommitted` flag — the explicit paint now only fires when no host mutations triggered a paint during mount.

## How to apply

- Any change to debug-mode write choreography must keep the **single combined write** invariant. If you add new escape/diff logic to `writeAboveFrame`, branch on `debug` first.
- When porting React-Concurrent debug tests, expect "by the time the hook runs, the tree is already committed" semantics. In vue-ink, achieve that by re-reading via `renderTree` at write-time, not by relying on `lastOutput`.
- Don't add another explicit paint to `render()` near `app.mount`. The mount-time `scheduleRender` path is the one source of truth; the `hasCommitted` fallback handles the rare empty-tree case.

Related: [[../porting/from-react-ink]] for the broader scheduling gotchas; [[../testing/ink-strategy]] for why the cursor.tsx scenarios are the canonical guard.
