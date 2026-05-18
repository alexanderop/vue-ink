# `patchConsole` is a LIFO stack of subscribers

`packages/renderer/src/render.ts` ref-counts a **process-wide**
`consoleSubscribers: ConsoleSubscriber[]` (an ordered stack, not a Set).
Each `render()` call with `patchConsole: true` (the default) pushes one
subscriber; the global `console.*` patch is installed on first push and
uninstalled when the stack drains.

## Routing rule (the fix)

Only the **top** of the stack — `consoleSubscribers.at(-1)` — receives a
patched console call. When that renderer unmounts, the previous
subscriber becomes active. This mirrors ink's `patch-console` package,
which uses a single module-level `originalMethods` slot: each new
`patchConsole()` overwrites the previous wrapper, and restore unwinds
back to it.

The earlier implementation iterated a `Set<ConsoleSubscriber>` and
dispatched to every subscriber, so two concurrent renders against
different stdouts both saw every `console.log` — meaning sibling test
suites' captured frames could contain output from each other's
`console.log`s.

## Why LIFO and not stream-identity matching

An alternative considered was: dispatch only to subscribers whose target
stdout `===` `process.stdout` (and likewise for stderr). That matches
the *literal* Node semantics (`console.log` writes to `process.stdout`),
but it breaks the common test pattern of using a capture stream as the
renderer's stdout and asserting that `console.log` output landed in the
captured frame. LIFO keeps that pattern working: the single active
renderer in a test is always the top of the stack.

## Behavioural guarantees

- Single renderer (the production case): the patch routes to it. ✓
- Test with capture stream: still works — the test's renderer is the
  only entry on the stack. ✓
- Parallel/leaky test setups: a newly-mounted renderer hides earlier
  ones, so subsequent `console.log` calls don't bleed into an older
  test's captured stream. ✓
- Multiple concurrent renderers on *different* stdouts: only the newest
  intercepts. This matches ink. If two renderers both want to surface
  console output above their frames, the user pattern is `patchConsole:
  false` on whichever shouldn't be the sink.

## Related

- [[../porting/from-react-ink]] — `RenderOptions.patchConsole` table row
  used to say "ref-counted across concurrent renders" — accurate for
  install/uninstall, and now also for routing under LIFO semantics.
- [[../porting/tracker-drift]] — the historic "narrower method set"
  drift; closed 2026-05-18 (vue-ink's `CONSOLE_METHODS` is now a
  superset of ink's `patch-console`).
