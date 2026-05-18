# Roadmap to 1.0

What's left between vue-ink today (`0.0.1`, "early/experimental") and a
library someone can pick up off npm without surprises. Grouped by
release tier; items inside a tier are unordered unless noted.

The granular parity tickets in `tickets/p0-foundation` … `p7-advanced/`
captured the *original* ink-parity push and are mostly done — see
`brain/porting/api-tracker.md` for the row-by-row state. This document
picks up where those leave off: the polish, correctness gaps, and
ecosystem work needed to actually ship `1.0`.

## 0.1 — correctness gaps (fix before any wider release)

Bugs the 2026-05-17 quality review found. Each has a brain note;
each is a small targeted fix, not a refactor.

- [x] **Kitty `auto` detection stdin race.** Cleanup now hands stripped
      user bytes to `inputManager.bufferInput()` (replayed on first
      `startListening()` via microtask, so the emitter listener is in
      place) instead of `stdin.unshift()`. See
      [[brain/renderer/kitty-detection]] · `render.ts:927-944` ·
      `input.ts:178-198`.
- [x] **`isCiEnv()` treats `CI='false'` as in-CI.** Now parses the env
      value against `'0' | 'false' | ''` instead of `Boolean(...)`;
      `BUILD_NUMBER` / `RUN_ID` are presence-only checks. Regression
      tests in `RenderInteractive.test.ts`. See
      [[brain/renderer/ci-detection]] · `render.ts:116-131`.
- [x] **`consoleSubscribers` fans out to every active renderer.**
      Subscribers now form a LIFO stack; only the top (most-recently
      mounted renderer) receives patched console calls — mirrors ink's
      `patch-console`. Regression tests in `PatchConsole.test.ts`. See
      [[brain/renderer/console-patch]] · `render.ts:214-279`.
- [x] **`renderTime` vs `durationMs` in `onRender` payload.** Renamed
      `durationMs` → `renderTime` to match ink's `RenderMetrics`
      (`repos/ink/src/ink.tsx:207-212`); types, tests, and porting
      docs aligned. Payload is now `{ frame, renderTime, lineCount,
      output }`. See `render.ts:103-112,776-787`.
- [x] **`waitUntilRenderFlush()` barrier matches ink's.** Awaits the
      actual `stdout.write` callback for drain semantics, and
      synchronously flushes a pending trailing-edge paint instead of
      waiting for the throttle timer — mirrors ink's
      `settleThrottle(throttledOnRender).flush()` + write-callback
      barrier (`repos/ink/src/ink.tsx:919-928`). Regression test in
      `WaitUntilRenderFlush.test.ts` (slow Writable, drain assertion).
      See `render.ts:1016-1052`.

## 0.2 — release engineering

The shape of the package on disk, not the code inside.

- [ ] **Build artifacts.** Verify every workspace package ships real
      `dist/` + `.d.ts` + `exports` map. `tickets/p0-foundation/release-build-artifacts.md`
      is the spec; confirm it's done and ship a `npm pack` dry-run as
      a CI gate.
- [ ] **Module/runtime support matrix.** Document min Node (currently
      `>=22`), ESM-only vs dual-build decision, and which Vue
      versions (`^3.5`?) are supported. Pin them in `engines` /
      `peerDependencies` and CI test the matrix.
- [ ] **Semver commitment.** Pick changesets or semantic-release; wire
      release-please-style changelog generation. `0.1` cuts off the
      "anything can change" era — get this in before that release.
- [ ] **Publish provenance.** `npm publish --provenance` from GitHub
      Actions; document the release process in `CONTRIBUTING.md`.
- [ ] **License attribution sweep.** Already partially done
      (commit `fc77ad01f`). Audit `LICENSE` files in every package
      and any vendored fragments (yoga wasm, ANSI helpers).

## 0.3 — docs and DX

README is currently ~150 lines and lists APIs without examples or
migration guidance. Real adoption needs more.

- [ ] **Docs site or expanded README.** At minimum: full component
      reference, composable reference, recipes (forms, scrollable
      lists, log + spinner, paste handling), and a "porting from ink"
      section that points at `brain/porting/from-react-ink.md`.
- [ ] **More examples in `examples/`.** Today there's `counter`.
      Add at least: focus form, scrollable list with `<Static>`,
      animated spinner, paste-aware input, full TUI (file picker or
      task list).
- [ ] **Migration guide for ink users.** A standalone doc that
      surfaces the three composable shape changes (Stop return,
      `MaybeRefOrGetter`, ref returns) with side-by-side ink/vue-ink
      snippets. The brain note has the content; promote it to a
      user-facing doc.
- [ ] **Devtools onboarding.** README mentions devtools nowhere.
      Document the `DEV=true` flag, the `@vue/devtools` peer dep, and
      the inspector setup.
- [ ] **TS doc comments on the public surface.** `render()`,
      `RenderOptions`, every composable, every component prop set.
      LSP hover is the first place a Vue dev will look.

## 0.4 — test confidence

The suite is large (~112 spec files) but has known smells.

- [ ] **Audit `CoverageStragglers.test.ts` / `FinalCoverage.test.ts`.**
      Coverage-chasing tests usually exercise dead branches. Decide
      per-test: assert a real failure mode or delete.
- [ ] **PTY fixture coverage gaps.** `brain/porting/test-port-status.md`
      lists the file-by-file ink → vue-ink test map. Close any
      remaining "ported with gaps" rows.
- [ ] **Benchmark suite vs ink.** A handful of representative scenes
      (FlatList of 1000 rows, log + spinner, focus cycle) timed
      against an equivalent ink app. Catches perf regressions and
      gives a real claim for the README.
- [ ] **A CI matrix that actually runs the PTY tests.** node-pty
      flakes on some CI runners; pin the matrix and the runner.

## 0.5 — ecosystem polish

Stretch goals; can land post-1.0 without breaking anything.

- [ ] **Nuxt module / starter.** Most Vue devs reach for Nuxt first.
      A `@vue-ink/nuxt` that wires devtools and provides a
      `npx nuxi init --template terminal` story is high-leverage.
- [ ] **Signal handling composable.** `useSignal('SIGINT', handler)`
      so user code can intercept before auto-unmount. Currently
      flagged as "not ported" in `brain/porting/from-react-ink.md`.
- [ ] **Recipes for common CLI patterns.** Wizards, fzf-style
      pickers, log tailers, progress bars. Each as a `examples/`
      entry with a README pointer.
- [ ] **Issue / PR templates + `CONTRIBUTING.md`.** Bug report
      reproductions for terminal apps need stdin/PTY context — the
      template should ask for it explicitly.
- [ ] **Vue community visibility.** Submit to `awesome-vue`, write a
      launch blog post that explains the renderer (lean on
      `brain/renderer/how-it-works.md`).

## Sequencing

Ship 0.1 first — correctness gaps are the only items that *can't*
land after release without a breaking-change story. Then 0.2 (release
engineering) and 0.3 (docs) in parallel; 0.4 (tests) gates the actual
`1.0` cut. 0.5 is post-1.0.

A reasonable cut: 0.1 within a week, 0.2 + 0.3 over a fortnight, 0.4
before tagging `1.0`. The whole thing is a few weeks of focused work,
not a quarter.

## Related

- `tickets/README.md` — original ink-parity ticket tiers (mostly done).
- `brain/porting/api-tracker.md` — row-by-row parity state.
- `brain/porting/tracker-drift.md` — what the tracker quietly got wrong.
- `brain/porting/inlined-deps-lose-edge-cases.md` — pattern behind
  several 0.1 correctness gaps.
