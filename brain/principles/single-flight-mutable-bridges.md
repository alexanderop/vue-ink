# Single-Flight Mutable Bridges

When a long-lived module needs a mutable handle to a transient context (current render, active terminal, active subscriber), structure it as an explicit single-flight bridge: one writer at a time, stale writers must not clear a newer writer's context, and registration order must respect attach-before-emit.

**Why:** This pattern is **not** covered by `[[serialize-shared-state-mutations]]`. That principle's prescriptions are "lock or eliminate sharing." Here the sharing is essential (you need a global handle that any importer can read), and locking is impossible (the writer is the playground runner / the active renderer / the consumer's `setup`). The right answer is a structural ordering contract.

**Pattern:**

1. **LIFO or owner-token semantics.** When a new writer takes over, the previous writer is shadowed, not replaced. On unmount/cleanup, the cleanup must verify _it_ is still the active writer before clearing. A stale writer's cleanup must no-op, never reset another writer's state.
2. **Attach before emit, drain deferred.** If you're bridging an event stream, register the listener _before_ the producer can fire. If buffered input must replay, defer the drain with `queueMicrotask` so the consumer's `setup()` finishes wiring first.
3. **Coalesce stale runs.** Async producers must check their identity (run-token, generation counter) before mutating shared context. A late callback from a superseded run must drop on the floor, not overwrite the live one.

**Worked examples:**

- [[../apps/playground-dual-execution]] — `runtime-context.ts` is "a mutable bridge"; serialized execution queue + stale-run coalescing.
- [[../renderer/console-patch]] — LIFO subscriber stack; new mount shadows old, unmount unwinds in reverse.
- [[../composables/vueuse-patterns]] (Ordering trap) + [[../renderer/kitty-detection]] — `pendingInput` drain happens after `emitter.on()`, never synchronously during the call that flips listening on.
- [[../reviews/vue-port-code-quality-2026-05-19]] (`useCursor`) — open instance of this pattern; current `claimed` boolean is the wrong shape, needs owner-token.

**The test:** "If two of these run concurrently, can a late callback from A clear B's state?" If yes, the bridge is not single-flight.
