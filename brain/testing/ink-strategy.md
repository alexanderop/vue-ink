# Ink's testing strategy

A reference distillation of how `repos/ink/` tests itself, so vue-ink can borrow
the parts that fit. Read alongside the actual files — every claim here points
at one.

## Two parallel test surfaces

Ink splits tests by **what kind of side-effect is under test**:

1. **Pure render → string.** Layout, styling, borders, text wrapping,
   reconciliation. No real terminal, no async, no subprocesses. Fast and
   deterministic — the bulk of the suite.
2. **Real subprocess + PTY.** Input handling, exit codes, raw mode, cursor,
   alternate-screen, animations. Anything that depends on a true TTY,
   bracketed paste, kitty protocol, or signal handling.

The split keeps the pure tests cheap and the integration tests honest — input
parsing tests never run against a fake `process.stdin`, and layout tests never
spin up a child process.

## The fake `stdout` (`test/helpers/create-stdout.ts`)

The hinge of the pure surface. An `EventEmitter` cast as `NodeJS.WriteStream`
with `columns`, `isTTY`, and a `sinon.spy()` replacing `write`. Two accessors:

- `.get()` — last frame written (most tests only care about the final state).
- `.getWrites()` — every frame ever written (use for reconciliation and
  throttling assertions, where the *sequence* matters).

Combined with `render(node, { stdout, debug: true })`, this is enough to
assert on real ANSI output without ever touching the terminal. **`debug: true`
is the magic switch** — it makes ink append each frame as a complete string
instead of emitting cursor-movement diffs, so `.get()` returns a readable
snapshot.

## The pure helpers (`test/helpers/render-to-string.ts`, `test-renderer.ts`)

Thin wrappers over the fake stdout pattern:

- `renderToString(node, { columns? })` → `string`. Sync, legacy mode.
- `renderToStringAsync(node, …)` → `Promise<string>`. Concurrent mode, wraps
  the mount in `act()` so React flushes deterministically.
- `renderAsync(node, …)` → `TestInstance` (full ink instance + `getOutput()` +
  `rerenderAsync()`). For tests that need to rerender and re-assert.
- `withAct(fn)` — escape hatch for migrating a sync test to concurrent mode
  one assertion at a time.

The lesson: **a tiny library of render helpers beats a generic test renderer**.
Each helper encodes one mode (sync vs concurrent, one-shot vs reusable), so
test bodies stay declarative.

## Comparison strategies

Ink rarely hard-codes expected ANSI in tests. Instead:

- **Compare against a known-good library.** Borders are asserted against
  `boxen(...)`. Colours against `chalk.green(...)`, `chalk.bgHex(...)`. If the
  oracle library breaks, ink breaks the same way — the test still has meaning.
- **Compare against an equivalent render.** `reconciler.tsx` renders two trees
  to two fake stdouts and asserts `lastCall.args[0]` matches. Lets you test
  "rerender from A to B produces the same output as a fresh render of B"
  without writing the expected string at all.
- **`stripAnsi` + textual equality** when you only care about content/layout.
- **Both at once.** `t.is(stripAnsi(output), 'Test')` *and* `t.not(output,
  'Test')` together prove the styling was applied without pinning to a
  specific escape sequence.

## The subprocess surface (`test/helpers/run.ts`, `term.ts`)

Both shell out to `node-pty` so the child process believes it has a real
terminal:

- **`run(fixture, props?)`** — one-shot. Spawns
  `node --import=tsx test/fixtures/<fixture>.tsx`, waits for exit, returns the
  accumulated output. Used for exit/lifecycle tests where the fixture drives
  itself to completion.
- **`term(fixture, args)`** — interactive. Returns `{ write, output,
  waitForExit }` so the test can drive keystrokes. Key trick: the fixture
  writes `__READY__` to stdout when its `useInput` handler is mounted, and
  `term` gates `.write()` calls on seeing that marker. Avoids the race where
  the test sends input before the renderer registers its handler.

Fixtures live in `test/fixtures/` as standalone scripts that import from
`../../src/index.js`. Each one accepts an arg via `process.argv[2]` to
multiplex many scenarios into one file (see `use-input.tsx` — 30+ key
scenarios behind one fixture).

## Time control

- **`@sinonjs/fake-timers`** for throttling, debouncing, animations, max-fps
  caps. `FakeTimers.install()` controls `setTimeout`, `setInterval`, *and*
  `Date.now()`, which matters because ink's throttle uses both. Always
  `clock.uninstall()` in a `finally`.
- **`mockTimerCalls()`** when you want to assert *how many times* setTimeout
  was called (cleanup correctness) without freezing them.

## ANSI hygiene

The PTY transport injects sequences that aren't part of the rendered output:
synchronized-update brackets (`[?2026h` / `[?2026l`), cursor
show/hide. Ink strips these in `render.tsx` (`isCursorOrSyncEscape`,
`isWriteBarrierChunk`) before asserting on `.getWrites()`. Lesson: when
asserting on a *sequence* of writes from a fake stdout, filter out the
transport-layer noise first or your counts will drift as ink adds new
escape-sequence features.

## Runner config

From `package.json`:

```jsonc
"ava": {
  "workerThreads": false,   // shared mutable global state (stdout patches, timers)
  "serial": true,           // tests mutate process.stdout, fake timers
  "files": ["test/**/*", "!test/helpers/**/*", "!test/fixtures/**/*"]
}
```

`"test": "npm run typecheck && npm run lint && FORCE_COLOR=true ava"` — the
`FORCE_COLOR=true` is load-bearing: without it `chalk` strips colour in CI and
every chalk-based oracle assertion fails. Typecheck and lint are gates, not
optional steps.

## Mapping to vue-ink

vue-ink uses Vitest + `createCaptureStream` (`packages/vue-ink/test/helpers.ts`)
to capture every write into `frames`. On top of it, `renderToString`,
`renderToStringRaw`, `renderReusable`, `flush`, and `createFakeStdin` hide
the `nextTick` / microtask dance and stdin-mock boilerplate so tests stay
declarative. The suite reaches 100% coverage across all four packages.

**Rule:** never re-implement these in a test file. If a new test needs a
variant, add it to `helpers.ts` rather than redefining `renderOnce` /
`flush` / `createFakeStdin` locally — past audits found 6+ files redefining
the same render helper and 5+ files redefining the same fake-stdin dance.

Patterns that already pay off:

- **`renderToString(component, { columns })`** for the common pure-render
  case. Strips ANSI and trims trailing newlines.
- **`renderToStringRaw(...)`** when assertions need the SGR escapes.
- **`renderReusable(...)`** for tests that rerender and re-assert.
- **`chalk`-as-oracle** for colour tests (see `colorize.test.ts`,
  `text.test.ts`) — `expect(out).toBe(chalk.green('hi'))` rather than pinning
  to a literal escape sequence.
- **Direct host-DOM tests** (`dom.test.ts`, `output.test.ts`) for unit-level
  coverage of helpers that aren't reachable through `<Box>`/`<Text>`.
- **Fake `EventEmitter` stdin** for ctrl+c / raw-mode / `useInput` paths
  (`input.test.ts`, `composables.test.ts`) — no PTY required for input parsing.
- **`/* v8 ignore */` markers** for the handful of defensive guards that are
  unreachable through the current renderer (e.g. `applyPaddingToText`'s
  yoga-bearing-child branch, the noop placeholder for forward-declared
  unmount). Each one has a one-line comment naming *why* it's unreachable.

Still worth importing as we grow:

- The **`__READY__` handshake** if/when we add real TTY input tests.
- The **two-renders-must-match** trick from `reconciler.tsx` for any
  reconciliation work — it sidesteps having to write expected ANSI by hand.
- Filter transport escapes if/when we wire up synchronized update mode.

## Related

- [[principles/prove-it-works]] — render-to-string is the cheapest proof we
  have; reach for it before any structural assertion.
- [[renderer/nested-text-must-be-virtual]] — already lists its guarding tests
  at the bottom; the pattern of "every non-obvious renderer invariant gets a
  named test file" comes from ink.
