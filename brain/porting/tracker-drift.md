# Parity trackers drift — verify against `repos/ink/` first

[[api-tracker]] and [[test-port-status]] are snapshots, not contracts.
Even when the header reads "Verified <today>", individual rows can be
wrong. Treat them as a starting index, not as ground truth.

**Why:** A 2026-05-16 audit on a "verified 2026-05-16" tracker still
found six real gaps the tracker missed or mislabelled:

- `Instance.cleanup()` listed as "alias removed; call `unmount()`" — but
  ink still ships `cleanup()` publicly (`repos/ink/src/render.ts:188`,
  `230-231`). Porter code calling `.cleanup()` throws.
- `BoxMetrics` type alias not re-exported from `@vue-ink/vue-ink`
  (`packages/vue-ink/src/index.ts:36-37`); ink exports it from
  `index.ts:35`.
- `onRender` payload silently renamed `renderTime` → `durationMs`
  (`packages/renderer/src/render.ts:103-108`). Tracker shows ✅.
- `render()` second call applies the tree via `rerender`
  (`render.ts:264-270`); ink documents warn-and-drop
  (`repos/ink/src/render.ts:265-273`). Tracker shows ✅.
- `waitUntilRenderFlush()` only awaits `process.nextTick`
  (`render.ts:933-935`); ink awaits the actual `stdout.write` callback
  (`ink.tsx:922-928`). Different barrier guarantees. Tracker shows ✅.
- `patchConsole` hand-patches six methods (`render.ts:152-153`); ink
  uses the `patch-console` library which covers every `console.*`.
  Tracker shows ✅.

**How to apply:** When the user asks "is X implemented" or "what's
missing", do not answer from the tracker alone. Open `repos/ink/`
(pinned squash of `master`) and the matching `packages/*/src/` file and
diff the public surface yourself — types, option fields, payload
fields, return shapes, second-call semantics. The tracker tells you
*where* to look; `repos/ink/` tells you what's *actually* there.

Related: [[../principles/prove-it-works]] — check the source, not a
proxy. The tracker is a proxy.
