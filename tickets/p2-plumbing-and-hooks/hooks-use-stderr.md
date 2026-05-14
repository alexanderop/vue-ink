# `useStderr()` composable

## Why
Same pattern as `useStdout` but for stderr. Required so apps can surface errors without breaking the frame.

## Scope
- Depends on `renderer/stderr-option.md` (stderr stream wired into `render()`).
- Provide `STDERR_CONTEXT_KEY` from `render.ts`.
- Return type: `{ stderr: NodeJS.WriteStream; write: (data: string) => void }`.
- Same "erase frame → write → repaint" choreography as `useStdout`, but on the stderr stream.

## Acceptance criteria
- `useStderr().write('boom')` emits to stderr, never stdout.
- Frame on stdout is not corrupted by stderr writes interleaved within the same tick.

## References
- Ink source: `repos/ink/src/hooks/use-stderr.ts`, `repos/ink/src/components/StderrContext.ts`.
