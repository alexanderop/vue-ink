# `stderr` render option

## Why
`useStderr()`, `patchConsole`, and error overview all need a configurable stderr stream (tests inject buffers, some setups want stderr → stdout).

## Scope
- Add `stderr?: NodeJS.WriteStream` to `RenderOptions` (default `process.stderr`).
- Provide `STDERR_CONTEXT_KEY` with `{ stderr, write }`.
- Plumb through to consumers.

## Acceptance criteria
- Passing a custom stderr stream causes all `useStderr().write` and patched `console.error` calls to land in it.
- Test asserts no stderr writes leak to stdout.

## References
- Ink source: `repos/ink/src/render.ts`, `repos/ink/src/ink.tsx`.
