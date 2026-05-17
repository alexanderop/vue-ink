# `patchConsole` fans out to every active renderer

`packages/renderer/src/render.ts:214-269` ref-counts a **process-wide**
`consoleSubscribers: Set<ConsoleSubscriber>`. Each `render()` call with
`patchConsole: true` (the default) appends one subscriber; the global
`console.*` patch is installed on first subscribe and uninstalled when
the set drains.

That ref-counting is correct for install/uninstall. The fan-out is not
target-aware: every patched `console.log` walks the full Set and writes
the formatted text to **every** subscriber's `writeStdout`. With one
active render this is fine. With two concurrent renders against
different stdouts (a test suite running renders in parallel, or an app
that mounts a second root), each `console.log` is written above
**both** frames.

## When this bites

- Vitest suites that run multiple `render()` calls without
  `patchConsole: false` and assert against captured frames — the
  asserting frame contains output from sibling tests' `console.log`s.
- An app that spawns a sub-render for a separate stdout (rare, but
  possible via the testing-library reusable-render helpers).

## How to avoid the surprise today

- In tests that don't need the console patch, pass `patchConsole:
  false`. Most of `packages/vue-ink/test/` already does this.
- In tests that need it, run them serially (`describe.sequential` or
  `--no-file-parallelism`).

## The proper fix

Group `consoleSubscribers` by `stdout` (or stash the subscriber's
target stream identity inside the entry). On dispatch, route to the
subscriber whose `writeStdout` is bound to the current call's
originating render — except `console.log` has no notion of "current
render", so the routing has to be by *stream* not by *caller*. The
practical shape:

```ts
// install: store the patched stream on the subscriber
consoleSubscribers.add({ stdout: targetStdout, stderr: targetStderr, write… });

// dispatch: only write to subscribers whose target stream matches the
// one we'd otherwise write to directly. For console.log that's the
// process.stdout-equivalent the subscriber owns.
```

This matches ink's behaviour: `repos/ink/src/render.ts` uses the
`patch-console` library, which writes to the `process.stdout` that
`patchConsole` was called against at patch time. Two ink renderers
against different stdouts end up writing each console call to only
their own frame because each render's `patch-console` instance closes
over its own stream.

## Related

- [[../porting/from-react-ink]] — the `RenderOptions.patchConsole`
  table row says "ref-counted across concurrent renders" which is
  accurate for install/uninstall, not for routing.
- [[../porting/tracker-drift]] — `patchConsole` already flagged as
  drifting from ink (hand-patches six methods vs ink's full coverage).
