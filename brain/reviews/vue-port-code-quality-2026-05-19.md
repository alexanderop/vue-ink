# Vue Port Code Quality Review 2026-05-19

## Verification

- `pnpm typecheck` passed.
- `pnpm lint` passed.
- `pnpm test` passed: `packages/testing-library` 8 tests, `packages/vue-ink` 1098 tests.
- Review used 4 subagents: core/output, renderer lifecycle/input, components/composables, package boundaries.

## High

- `packages/renderer/src/render.ts`: mount-time render errors can register a dead instance.
  - `errorHandler` calls `unmount()` during `app.mount()`, then execution can continue to listener registration and `instances.set(...)`.
  - Risk: next `render()` for the same stdout returns a torn-down instance and drops the new tree.
  - Fix: after `app.mount(rootNode)`, bail if `unmounted`; add `RenderError.test.ts` coverage for setup throw then same-stdout render.

- `packages/renderer/src/render.ts`: render errors resolve `waitUntilExit()` instead of rejecting.
  - `errorHandler` writes stderr and calls `unmount()`, but never calls `exitReject`; `unmount()` resolves with `exitResult`.
  - Risk: callers cannot detect render failure; drifts from Ink error settlement.
  - Fix: reject before unmounting or pass the error through unmount; test post-mount render throw rejects.

- `packages/renderer/package.json`: published renderer imports undeclared runtime dependency.
  - `packages/renderer/src/renderer.ts` imports `@vue/runtime-core`, but it is only in `devDependencies`.
  - Risk: strict published installs can fail with `ERR_MODULE_NOT_FOUND`.
  - Fix: move `@vue/runtime-core` to `dependencies`, or import from a declared public dependency; add packed-package import smoke test.

- `packages/vue-ink/package.json`: `vueink` CLI is not shipped as an executable.
  - `packages/vue-ink/bin/vueink.ts` exists, but `files` excludes `bin`, no `bin` manifest field exists, and build only includes `src`.
  - Risk: package promise says CLI ships, tarball does not provide it.
  - Fix: build/copy `dist/bin/vueink.js`, add `bin`, include it in `files`, and test packed executable; or remove the package promise.

## Medium

- `packages/components/src/Static.ts`: `<Static>` drops multi-root slot output.
  - `props.items.map(...)` returns only `slotResult?.[0]`.
  - Risk: valid Vue slot fragments/sibling nodes silently lose content.
  - Fix: render full slot arrays per item; add sibling-`Text` regression.

- `packages/renderer/src/composables/useCursor/index.ts`: cleanup can erase a newer cursor claim.
  - Each consumer writes directly to shared cursor state; cleanup clears unconditionally if it ever claimed.
  - Risk: component A can hide component B's later cursor when A unmounts.
  - Fix: owner token or stack/registry semantics; add two-consumer out-of-order unmount test.

- `packages/core/src/output.ts`: nested overflow clips do not intersect.
  - `Output.get()` applies only `clips.at(-1)`.
  - Risk: inner hidden-overflow region offset outside a hidden parent can paint past ancestor boundary.
  - Fix: compute active clip intersection; extend nested overflow tests with an offset child.

- `packages/renderer/src/render.ts`: `waitUntilExit()` can resolve before terminal writes flush.
  - `unmount()` writes final frame / cleanup escapes and resolves immediately.
  - Risk: caller writes after awaiting exit while final terminal bytes are still queued.
  - Fix: settle behind the same empty-write barrier used by `waitUntilRenderFlush()`; add slow-writable regression.

- `packages/renderer/src/input.ts`: raw-mode and bracketed-paste disables are not idempotent.
  - Disabling from zero still calls underlying `setRawMode(false)` / writes `\x1b[?2004l`.
  - Risk: duplicate cleanup is observable and can interfere with shared stream ownership.
  - Fix: return early when count is already zero, or track enabled booleans; add zero-disable tests.

- Root/package scripts: playground e2e smoke is outside root `pnpm test`.
  - Root `pnpm test` runs `pnpm -r test`; playground exposes only `test:e2e`.
  - Risk: browser import rewriting and runtime shims are not covered by advertised all-package test command.
  - Fix: add explicit root/CI aggregate for playground e2e, separate from fast unit tests if needed.

## Principles Implicated

- [[principles/prove-it-works]]: packed-package and slow-writable smoke tests are needed because workspace tests passed.
- [[principles/make-operations-idempotent]]: terminal mode cleanup should converge after duplicate detach/destroy.
- [[principles/mirror-upstream-conventions]]: error settlement and static rendering should preserve Ink parity unless intentionally different.
- [[principles/vendor-source-beats-documentation]]: verify CLI/package promises from packed tarball, not docs or workspace behavior.
