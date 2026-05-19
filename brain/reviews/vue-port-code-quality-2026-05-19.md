---
name: vue-port-code-quality-2026-05-19
description: Open findings from the 2026-05-19 multi-agent code-quality review of the vue-ink port — High items shipped, Medium items still live
metadata:
  type: project
---

# Vue Port Code Quality Review — 2026-05-19 (Open Items)

High-severity items from the 2026-05-19 review shipped (mount-time dead-instance guard, `exitReject` settlement, `@vue/runtime-core` promoted to `dependencies`, `vueink` CLI bin wired). Remaining open items:

## Medium (still live as of 2026-05-19)

- **`packages/components/src/Static.ts`** — `<Static>` drops multi-root slot output.
  - `props.items.map(...)` returns `slotResult?.[0] ?? h('ink-text')`. Sibling/fragment slot results are silently truncated.
  - Fix: render full slot arrays per item; add sibling-`Text` regression.

- **`packages/renderer/src/composables/useCursor/index.ts`** — cleanup can erase a newer cursor claim.
  - Uses a single `claimed` boolean; cleanup unconditionally writes `undefined` if it ever claimed.
  - Risk: component A can hide component B's later cursor when A unmounts.
  - Fix: owner token / LIFO registry per `[[../principles/single-flight-mutable-bridges]]`; add two-consumer out-of-order unmount test.

- **`packages/core/src/output.ts`** — nested overflow clips do not intersect.
  - `Output.get()` applies only `clips.at(-1)`. Inner hidden-overflow region offset outside a hidden parent paints past ancestor boundary.
  - Fix: compute active clip intersection; extend nested overflow tests with an offset child.

- **`packages/renderer/src/render.ts`** — `waitUntilExit()` can resolve before terminal writes flush.
  - `unmount()` writes final frame / cleanup escapes and resolves immediately. Caller writes after awaiting exit may race queued terminal bytes.
  - Fix: settle behind the same empty-write barrier as `waitUntilRenderFlush()`; add slow-writable regression.

- **`packages/renderer/src/input.ts`** — raw-mode and bracketed-paste disables are not idempotent.
  - Disabling from zero still calls `setRawMode(false)` / writes `\x1b[?2004l`.
  - Fix: return early when count is already zero; add zero-disable tests. See `[[../principles/make-operations-idempotent]]`.

- **Playground e2e is outside root `pnpm test`** — root runs `pnpm -r test`; playground exposes only `test:e2e`. Browser import rewriting + runtime shims aren't in the advertised all-package command.
  - Fix: add explicit root/CI aggregate for playground e2e.

## Principles implicated

- `[[../principles/prove-it-works]]` — slow-writable + sibling-fragment smokes are needed because workspace tests passed.
- `[[../principles/make-operations-idempotent]]` — input cleanup should converge after duplicate detach.
- `[[../principles/mirror-upstream-conventions]]` — preserve ink parity for static rendering unless intentionally different.
- `[[../principles/single-flight-mutable-bridges]]` — `useCursor` is the canonical "needs an owner token" case.
