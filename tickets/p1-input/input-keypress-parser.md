# Full keypress parser

## Why
The current input layer relies on Node's bare `readline.emitKeypressEvents`, which is incomplete: it mishandles meta/alt sequences, multi-byte unicode, certain function keys, and produces inconsistent `ctrl`/`shift` flags. Ink ships a hand-rolled parser (`parse-keypress.ts`) that handles all of this plus the kitty protocol. Required for reliable `useInput`, `usePaste`, and `useFocus`.

## Scope
- Port `repos/ink/src/parse-keypress.ts` and `repos/ink/src/input-parser.ts` to `packages/renderer/src/parse-keypress.ts`.
- Replace `createInputManager`'s readline-based listener with a raw `stdin.on('data', buf)` listener that feeds bytes to the parser and emits one `'input'` event per parsed keypress.
- Update `Key` interface to include `super`, `hyper`, `capsLock`, `numLock`, `eventType` (optional for non-kitty).
- Detect bracketed-paste prologue/epilogue (`\x1b[200~` / `\x1b[201~`) and accumulate paste content; emit on the `'paste'` event when complete.

## Acceptance criteria
- Pressing `Esc` then `f` registers as `meta: true, name: 'f'` (Alt+F), not two separate keys.
- Pressing `Shift+Tab` registers as `tab: true, shift: true`.
- Multi-byte unicode (emoji) arrives as a single key event.
- Tests parallel to `repos/ink/test/use-input.tsx`.

## References
- Ink source: `repos/ink/src/parse-keypress.ts`, `input-parser.ts`, `ansi-tokenizer.ts`.
