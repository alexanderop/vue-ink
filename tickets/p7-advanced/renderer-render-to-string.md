# `renderToString()` API

## Why
For tests, snapshot fixtures, and one-shot non-interactive renders (CLI flags like `--help`). Currently consumers have to spin up the full `render()` machinery.

## Scope
- Export `renderToString(component, options?): { output: string; height: number }` from `@vue-ink/renderer` and `@vue-ink/vue-ink`.
- Options: `{ width?: number }` (default 80).
- Implementation: build a temp root node, mount with `@vue/runtime-core`, flush synchronously, run Yoga layout at `width`, call `renderNodeToOutput`, return the string. Tear down Yoga + Vue app.
- No stdin/stdout side effects.

## Acceptance criteria
- `renderToString(<App/>).output` matches the first frame `render(<App/>)` would produce.
- Setting `width` overrides terminal width.
- Calling repeatedly is safe (no leaked Yoga nodes — assert via `yoga.getInstanceCount()` or process-level sanity test).

## References
- Ink source: `repos/ink/src/render-to-string.ts`.

## Review findings (2026-05-15)

Quality review against ink surfaced two reasons to **promote this out of p7 once `tickets/p0-foundation/release-build-artifacts.md` lands**:

- **`renderToString` already exists** — but only in `packages/vue-ink/test/helpers.ts:57`. Ink ships it as part of the public API (`repos/ink/src/index.ts:3-4`). Porters reaching for it find nothing in the import surface, then either rebuild it from scratch or import from `vue-ink/test/helpers` (a private path). This is a documentation/exports gap as much as a feature gap.
- **`renderToString` always sets `interactive: true`** in the current test-helper version → every "pure render" test eats a 34ms throttle window before `stdout.frames.at(-1)` is meaningful. Mismatched assertions are one throttle-window away from flake.

### Additional scope (on top of the original)
- Move `renderToString` into a real source module (e.g. `packages/renderer/src/render-to-string.ts`) mirroring `repos/ink/src/render-to-string.ts`. Re-export from `@vue-ink/renderer` and `vue-ink`.
- Add `debug?: boolean` option (maps internally to `render(..., { debug: true })`) so consumers get deterministic, throttle-free output for snapshots and assertions.
- While here, re-export the other names porters need from the public API:
  - `Stop` (return type of `useInput`/`usePaste`) — currently only in `packages/renderer/src/composables/_internal/use-emitter-listener.ts:19`.
  - `RenderMetrics`, `cleanup` (alias for `unmount`, see below).
  - `DOMElement` and a `measureElement(el)` helper — library authors building reusable Vue terminal components (tables, layout primitives) can't measure children without these. Ink exports both (`repos/ink/src/index.ts:38-39`).
- Re-add a `cleanup()` alias on `Instance` (or document the removal in the porting guide). The current rename to `unmount()` only gives porting users a runtime `is not a function` with no type help.

Sequencing: this depends on `tickets/p0-foundation/release-build-artifacts.md` shipping first — without `dist/` and real `exports`, "promote to public API" doesn't have a meaningful surface to land on.
