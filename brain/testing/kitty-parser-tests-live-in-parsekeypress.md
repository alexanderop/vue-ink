---
name: kitty-parser-tests-live-in-parsekeypress
description: Kitty CSI-u parser scenarios belong in ParseKeypress.test.ts (Key-object parsing), not InputParser.test.ts (chunk-boundary handling).
metadata:
  type: project
---

# Kitty parser scenarios go in `ParseKeypress.test.ts`

Two test files look similar by name but cover different units. Picking
the wrong one when porting kitty scenarios from `repos/ink/test/kitty-keyboard.tsx`
wastes a round-trip.

| File                    | Unit under test     | Imports                          | Concept                                                                                                           |
| ----------------------- | ------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `InputParser.test.ts`   | `createInputParser` | `renderer/src/input-parser.ts`   | Splitting a raw stdin byte stream into discrete `InputEvent`s across chunk boundaries                             |
| `ParseKeypress.test.ts` | `parseKeypress`     | `renderer/src/parse-keypress.ts` | Turning one `InputEvent` into a `ParsedKey` object (kitty CSI-u, legacy escapes, modifiers, `isPrintable` matrix) |

Kitty protocol parsing is **per-event Key-object parsing**, so it lives
in `ParseKeypress.test.ts`. As of 2026-05-19 the file holds 7 `describe`
blocks for kitty (modifiers, event types, special chars/unicode,
arrow/special keys, invalid input, legacy fallback, `isPrintable`
matrix, text on return/space).

`InputParser.test.ts` only mentions kitty once — and that's the
boundary case where a CSI-u sequence is split across two chunks.

## How to apply

When porting a kitty scenario from `repos/ink/test/kitty-keyboard.tsx`:

- **Parser-level** (calls `parseKeypress(buffer)` directly with a single
  sequence, asserts on the returned `ParsedKey`): append to
  `ParseKeypress.test.ts`.
- **Chunk-boundary** (splits a sequence across two `push()` calls,
  asserts on the emitted `InputEvent[]`): append to `InputParser.test.ts`.
- **Render integration** (`test.serial(...)` with a real subprocess and
  `useInput`): use a PTY fixture under `packages/vue-ink/test/fixtures/`,
  not either parser test file.

## Related

- [[file-per-concept]] — the broader rule about appending to existing
  files rather than spawning siblings.
- [[../renderer/input-pipeline]] — the three-layer parser → keypress →
  manager pipeline these tests cover.
