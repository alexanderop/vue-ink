# Test harness consolidation + PTY fixture set

## Why
Two coverage problems compound each other:

1. **Duplicated helpers**. `createFakeStdin` exists in both `packages/vue-ink/test/helpers.ts:133-151` and `packages/renderer/src/composables/_test/with-setup.ts:49-66` with subtly different shapes (one uses `vi.fn()` for `resume`/`pause`, the other plain `() => {}`). The porting doc explicitly warned about past 6+ copies; the new `with-setup.ts` is a 7th in spirit. The fake-key event-object literal is also reinvented in `useFocus/index.test.ts:23-47` and `useInput/index.test.ts:27-51`.
2. **No real-PTY coverage of the input surface**. We have one fixture (`packages/vue-ink/test/fixtures/composables-demo.ts`) and three ad-hoc `pty.spawn(...)` blocks across `composables-e2e.test.ts:11-45`, `counter.test.ts:11-40`, `vueink-launcher.test.ts:29-..`. Each reimplements timeout-polling without a `__READY__` handshake. Ink ships 52 fixtures driven by a single `term(fixture)` helper that gates writes on a `__READY__` marker.

Together: every interactive surface (`useInput`/`usePaste`/`useFocus`/`useApp.exit`) is tested only through fake `EventEmitter`s. The real stdin → parser → keypress → manager pipeline has zero end-to-end coverage. That's where every input regression in `tickets/p1-input/input-regression-fixes.md` will hide.

## Scope

### Part 1: Consolidate test helpers
- Make `packages/vue-ink/test/helpers.ts` the canonical location.
- Delete the duplicate `createFakeStdin` in `packages/renderer/src/composables/_test/with-setup.ts:49-66`; import from the canonical helper instead.
- Add a shared `fakeKey(partial: Partial<Key>): Key` builder that returns the full input-event shape with sensible defaults. Migrate `useFocus/index.test.ts:23-47` and `useInput/index.test.ts:27-51` to use it.
- Default `createCaptureStream`'s `isTTY` to `true` (`helpers.ts:27`) — today it's `false`, which silently disables interactive paths and is the wrong default for our tests.
- Add a `renderToString({ debug?: boolean })` shortcut that maps to `render(..., { debug: true })`. Removes the implicit 34ms throttle wait on every "pure render" test and makes `stdout.frames.at(-1)` a meaningful assertion instead of a race.

### Part 2: Build `term(fixture)` PTY helper
- Single helper in `packages/vue-ink/test/helpers.ts`, mirroring `repos/ink/test/helpers/term.ts:60-66`.
- Signature: `term(fixturePath, opts?) → { write(str), waitForOutput(regex, timeoutMs), kill(), expectExit(code) }`.
- Spawn the fixture under `node-pty` with a clean env, `__READY__` handshake gating any `.write()` call until the child emits the marker, and bracketed-output buffering so assertions see complete frames.
- Migrate the three existing PTY tests to use it: `composables-e2e.test.ts`, `counter.test.ts`, `vueink-launcher.test.ts`. Each loses its bespoke timeout-poll loop and gains the handshake.

### Part 3: Port the minimum-viable PTY fixture set
Each fixture lives under `packages/vue-ink/test/fixtures/`, prints `__READY__` after first mount, and drives one input path end-to-end:

1. `use-input-lowercase.ts` — `a`–`z` → assert handler receives each.
2. `use-input-ctrl-c.ts` — Ctrl-C → assert `useApp().exit()` fires and process exits 0.
3. `use-input-escape.ts` — bare Esc → assert handler receives escape within ≤ 25ms (regression test for `input-regression-fixes.md` fix 1).
4. `use-input-meta.ts` — Alt+letter, Shift+Tab → assert key shape.
5. `use-input-kitty.ts` — kitty CSI-u sequences → assert `kittyFlags` / `kittyModifiers` parsed.
6. `use-paste-bracketed.ts` — bracketed paste body → assert `usePaste` handler receives full string, no input handler fired.
7. `use-paste-fallback.ts` — same paste with no `usePaste` listener → assert `useInput` receives each char (regression test for fix 4).
8. `use-focus-tab-cycle.ts` — three focusables, Tab forward/back → assert `activeId` cycles.
9. `exit-with-error.ts` — `useApp().exit(new Error('x'))` → assert non-zero exit code and stderr contains stack.
10. `exit-on-finish.ts` — top-level component unmounts on its own → assert process exits 0 without `waitUntilExit` hanging.

## Acceptance criteria
- Exactly one `createFakeStdin` in the repo. `rg "function createFakeStdin"` returns 1 match.
- Exactly one `fakeKey` builder. All input-event literals in `_test/` files removed.
- All 10 fixtures pass under `vitest run`. Each test ≤ 200ms on a clean run.
- The three pre-existing PTY tests use the new `term()` helper; no inline `pty.spawn()` calls remain in the test tree.
- `renderToString` "pure" tests no longer await `flush()` for the throttle window.

## Non-goals
- 52 fixtures — pick the 10 above first. Backfill is a separate ticket once the harness pays off.
- Replacing Vitest. The runner story is fine; this ticket is about helpers and fixtures.
- Auto-recording terminal output for snapshot diffs — nice to have, separate.

## References
- Ink test infra: `repos/ink/test/helpers/term.ts`, `repos/ink/test/helpers/run.ts`, `repos/ink/test/fixtures/`.
- Affected vue-ink files: `packages/vue-ink/test/helpers.ts`, `packages/renderer/src/composables/_test/with-setup.ts`, `packages/vue-ink/test/{composables-e2e,counter,vueink-launcher}.test.ts`, `packages/vue-ink/test/fixtures/` (new fixtures).
- Brain notes: `brain/testing/ink-strategy.md`, `brain/porting/from-react-ink.md` (testing-port section, anti-pattern about duplicate helpers).
- Related: `tickets/p1-input/input-regression-fixes.md` — many of the fixtures above are the regression tests for that ticket.
