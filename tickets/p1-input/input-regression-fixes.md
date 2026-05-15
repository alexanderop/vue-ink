# Input pipeline regressions

## Why
Five small but user-visible regressions against ink in the input/focus path. Each is 1–5 lines of code; together they close most of the "behaves differently than the React version" surprises a porting user will hit. All confined to `packages/renderer/src/input.ts` and `packages/renderer/src/focus-context.ts`.

## Scope

### Fix 1: Drop escape-flush timeout from 100ms to 20ms
- Today: `input.ts:58` waits 100ms before flushing a bare `Esc`.
- ink uses 20ms (`repos/ink/src/components/App.tsx:101`).
- 100ms is human-perceptible latency on every Escape press; also collapses two deliberate `Esc`-then-`Esc` taps into one `meta+Esc` event.
- Fix: change the constant in `input.ts`. Retune the test that pins `vi.advanceTimersByTime(100)`.
- Bonus: the brain note `brain/renderer/input-pipeline.md` claims ink uses ~100ms — wrong, fix the note in the same PR.

### Fix 2: `stdin.setEncoding('utf8')` on raw-mode enable
- ink calls `stdin.setEncoding('utf8')` inside its `handleSetRawMode` (`repos/ink/src/components/App.tsx:329`).
- vue-ink never does — we read `Buffer` chunks and `chunk.toString('utf8')` per chunk (`input.ts:158`).
- A multi-byte UTF-8 character split across two Buffer chunks (rare but possible with slow terminals / large pastes) decodes as mojibake. With `setEncoding`, Node's `StringDecoder` buffers partial code points across chunks for us.
- Fix: call `stdin.setEncoding('utf8')` inside the `setRawMode(true)` path in `input.ts`.

### Fix 3: `stdin.ref()` / `unref()` around raw-mode reference count
- ink toggles `stdin.ref()` and `stdin.unref()` on raw-mode enable/disable (`repos/ink/src/components/App.tsx:222,339`).
- vue-ink doesn't. Without `unref()`, a process with raw-mode still active won't exit naturally even when nothing is listening — same root cause as the `waitUntilExit` hang trap documented in `brain/porting/from-react-ink.md:288-301`.
- Fix: call `stdin.ref()` when refcount transitions 0→1 and `stdin.unref()` when it transitions 1→0 in `input.ts:setRawMode`.

### Fix 4: Paste → input fallback when no paste listener exists
- ink (`repos/ink/src/components/App.tsx:288-294`): if `paste` has no listeners, emit the body as `input` so `useInput` handlers see it.
- vue-ink (`input.ts:164`) always emits on `'paste'` only. An app with `useInput` but no `usePaste` silently drops pastes — or, if paste mode wasn't enabled, the raw `\x1b[200~…\x1b[201~` bytes leak through.
- Fix: in the paste branch of `onData`, check `emitter.listenerCount('paste') === 0` and re-emit each char as an `input` event in that case.

### Fix 5: Bare Escape clears focus
- ink: pressing Escape with focus enabled blurs the focused element (`repos/ink/src/components/App.tsx:250-253`: `if (input === escape && isFocusEnabled) setActiveFocusId(undefined)`).
- vue-ink's `focus-context.ts:95-100` only handles Tab and Shift-Tab. Escape is a no-op.
- Fix: add the Escape branch to the input handler in `focus-context.ts`. Clears `activeId` only when `isFocusEnabled` is true.

## Acceptance criteria
- Bare `Esc` keystroke flushes within ≤ 25ms in tests; two `Esc` taps within 30ms emit two separate `escape` events (covers fix 1).
- A `useInput` handler observes a single coherent codepoint for a multi-byte UTF-8 char split across two `data` events (covers fix 2).
- A render that mounts only `<Box />` (no input/focus/paste hooks) exits the process under `setTimeout(0)` — no `unmount()` required (covers fix 3, complements the brain note's `waitUntilExit` trap).
- An app with `useInput` and no `usePaste` receives the pasted text as `input` events (covers fix 4). Mirror `repos/ink/test/use-input.tsx` paste cases.
- With a focused element, sending `\x1b` clears `activeId` and `isFocused` flips to false (covers fix 5).

## Non-goals
- Deferred `setRawMode(false)` via `queueMicrotask` (avoids component-swap flicker). Worthwhile but out of scope here — file separately.
- Kitty keyboard auto-detect — separate ticket `tickets/p1-input/input-kitty-keyboard.md`.

## References
- Ink source: `repos/ink/src/components/App.tsx:101,222,250-253,288-294,329,339`.
- Affected vue-ink files: `packages/renderer/src/input.ts`, `packages/renderer/src/focus-context.ts`.
- Brain notes: `brain/renderer/input-pipeline.md` (update 100ms→20ms), `brain/porting/from-react-ink.md:288-301` (waitUntilExit trap is solved by fix 3).
