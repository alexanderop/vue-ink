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
