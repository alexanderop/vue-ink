# `useStdout()` composable

## Why
Needed by `useWindowSize`, downstream "write outside the frame" patterns, and consumers who want to log to the same stream Ink renders to. Trivial pre-req for several other tickets.

## Scope
- Add to `@vue-ink/renderer/composables.ts`.
- Provide a stdout context (`STDOUT_CONTEXT_KEY`) from `render.ts` containing `{ stdout, write(data) }`.
- `write(data)` should print *above* the live frame (erase live frame → write data → repaint). Implementation parity with Ink's `useStdout().write`.
- Return type: `{ stdout: NodeJS.WriteStream; write: (data: string) => void }`.

## Acceptance criteria
- `useStdout().write('hello\n')` prints `hello` once on its own line; the live frame is preserved beneath.
- Multiple `write()` calls in one tick all appear above the frame in order.
- `useStdout()` outside `render()` throws a friendly error.

## References
- Ink source: `repos/ink/src/hooks/use-stdout.ts`, `repos/ink/src/components/StdoutContext.ts`, `repos/ink/src/ink.tsx` (`writeToStdout` implementation).
