# Serialize Shared-State Mutations

When concurrent actors share mutable state, enforce serialization structurally — lockfiles, sequential phases, exclusive ownership. Instructions and conventions are insufficient for concurrency safety.

**Why:** Concurrent writes to shared state produce race conditions that are intermittent, hard to reproduce, and expensive to debug. Telling agents or goroutines to "take turns" does not work.

**Pattern:**

1. **Identify shared mutable state** (files both read and write, branches both push to, APIs both define and consume)
2. **If shared state exists, serialize access** (lockfiles, sequential phases, or exclusive ownership)
3. **If serialization is impractical, eliminate the sharing** (give each actor its own copy: worktrees, separate files, isolated state directories)

**Boundary with `[[make-operations-idempotent]]`:** idempotency handles repeated execution of a _single_ actor; serialization handles concurrent execution of _multiple_ actors. A system can need both.

**Worked examples:**

- [[../renderer/no-module-state-in-render]] — module-scope counters mutate across sequential renderers in one Node process
- [[../ops/lefthook-stage-fixed-trap]] — `stage_fixed` makes the user and the hook concurrent writers of the index
- [[../principles/single-flight-mutable-bridges]] — adjacent pattern for the case where sharing is essential and locking is impossible
