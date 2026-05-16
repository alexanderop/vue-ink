# Input pipeline architecture

The input layer has three layers, ported from ink. Don't shortcut by going
back to `readline.emitKeypressEvents` — it mangles meta, multi-byte unicode,
and Shift+Tab.

## Layers

1. **`createInputParser`** (`packages/renderer/src/input-parser.ts`) —
   streaming byte → event splitter. Accepts arbitrary chunked stdin data and
   emits `string` events for opaque sequences (CSI/SS3/meta) or
   `{ paste: '...' }` events for bracketed paste. Holds partial sequences in
   `pending` across chunks (terminals will split CSI sequences on byte
   boundaries when the user types fast). Splits batched backspace bytes
   (0x7F/0x08) into individual events because a held-down backspace coalesces
   into one stdin chunk that `parseKeypress` would otherwise reject.

2. **`parseKeypress`** (`packages/renderer/src/parse-keypress.ts`) — pure
   sequence-string → `ParsedKey` decoder. Handles legacy CSI, SS3, meta-prefix,
   ctrl+letter, multi-byte unicode, and kitty CSI-u (including the special
   `\x1b[N;mods:eventType{letter|~}` form). Reads `Uint8Array` inputs with the
   high-bit-meta legacy encoding.

3. **`createInputManager`** (`packages/renderer/src/input.ts`) — listens on
   `stdin.on('data')`, feeds bytes to the parser, maps each
   `ParsedKey → (input, Key)` via the `toKey`/`computeInput` helpers, then
   emits `'input' (string, Key)` or `'paste' (string)` on its `EventEmitter`.
   Reference-counts both `setRawMode` and `setBracketedPasteMode` so
   concurrent `useInput`/`usePaste` callers don't fight over the TTY.

   **Must `stdin.unref()` on release.** Both the `setRawMode(false)` and
   `destroy()` paths call `(stdin as any).unref?.()`. Without this, node's
   event loop keeps the process alive forever after the renderer unmounts
   — `setRawMode(false)` only pauses stdin, it doesn't remove its
   ref-count. Mirrors ink's `App.tsx` teardown. Removing the unref breaks
   every subprocess test in `Exit.test.ts` (they hang past the timeout).

## Pending-escape timer

A bare `Esc` keypress vs. `Esc[...` is indistinguishable at the byte level
until the next byte arrives. The manager schedules a `setTimeout(100ms)` to
flush a pending lone `\x1b` if no continuation arrives. Tests use
`vi.useFakeTimers()` to drive this deterministically.

The flush is intentionally suppressed while the parser's pending buffer looks
like a paste-start prefix (`\x1b[200` or `\x1b[200~...`) — otherwise the timer
would chop a slow paste in half.

## Kitty keyboard

`render({ kittyKeyboard: { mode: 'enabled', flags: [...] } })` writes
`\x1b[>${bitmask}u` on mount and `\x1b[<u` on unmount. Non-kitty terminals
ignore the escape, so kitty-enabled apps still work everywhere. Auto-detection
(write `\x1b[?u`, wait 200ms for a response) is **not yet implemented** —
callers must opt in explicitly via `mode: 'enabled'`.

The kitty-enhanced legacy form (e.g. `\x1b[1;1:1A` for arrow-up press) is
parsed via the `kittySpecialKeyRe` branch — the parser tries CSI-u first,
then the special-key form, before falling through to legacy.

## When refactoring

- Don't merge the parser and manager. The parser is pure and reusable; the
  manager owns TTY side-effects (raw mode, paste-mode escapes, refcounts).
- Don't compute `Key` in the parser. The `(input: string, Key)` shape is the
  consumer contract — keeping it inside the manager means a hypothetical
  future TUI host can reuse `parseKeypress`/`createInputParser` for a
  different downstream shape (e.g. raw `ParsedKey`).
- Don't drop the backspace-splitting behaviour. We hit this in real tests —
  a held-down backspace is the trigger.

## Chunking contract

The parser is robust to arbitrary chunk boundaries for **escape sequences,
bracketed paste, and backspace bytes** — these stay atomic regardless of how
stdin slices the byte stream (held by `pending` across `push()` calls).

It is **not** robust for plain text: a chunk boundary inside ASCII text
legitimately produces two adjacent string events (`push('ab')` → `['ab']`;
`push('a'); push('b')` → `['a', 'b']`). `createInputManager` forwards each
plain-text event as a separate `(input, Key)` emission, which matches how
stdin actually delivers keystrokes — one chunk per keypress in interactive
mode.

Property tests at `packages/vue-ink/test/InputParserProperties.test.ts`
encode this: chunking invariance is asserted **after coalescing adjacent
plain-text events**. The round-trip property (events + flushed pending
reconstruct the input) holds universally.
