# Kitty `auto` detection runs before the input pipeline mounts

`packages/renderer/src/render.ts:902-955` enables the kitty keyboard
protocol in `auto` mode by writing `\x1b[?u` and watching `stdin` for a
response inside a 200ms window. The response listener registers on
`stdin` **before** `app.mount()` and **before**
`inputManager.startListening()`. That ordering is correct for catching a
synchronous response.

## The startup-window race (fixed)

1. User presses keys during the 200ms detection window.
2. Their bytes land in `responseBuffer` alongside (or instead of) the
   kitty response.
3. On either timeout or successful response, `cleanup()` strips just the
   protocol response bytes and hands the remaining user bytes back to
   the input pipeline via `inputManager.bufferInput(remaining)` — NOT
   `stdin.unshift()`. The earlier `unshift` strategy silently dropped
   the bytes when no `data` listener was attached yet (no `useInput` /
   `usePaste` / `useFocus`, or a slow `async setup()` boundary).
4. `inputManager` queues the bytes in `pendingInput` and replays them
   through `onData` the first time `startListening()` runs (i.e. when
   the first `useInput`/etc. raises `setRawMode(true)`).
5. The replay is scheduled via `queueMicrotask` so it lands AFTER
   `useEmitterListener.onAttach()` has finished and `emitter.on(...)`
   has registered the actual listener. Mirrors Node's own `stdin.resume`
   semantics — buffered data emits on the next tick, never synchronously
   from `setRawMode`.

## Invariants the current code does honour

- `stripKittyQueryResponses(responseBuffer)` correctly separates the
  protocol response bytes from user bytes — only user input is
  re-injected. Unit-tested.
- `cleanup()` clears its `timer`, removes the data listener, and nulls
  `cancelKittyDetection` so unmount-during-detection doesn't double-fire.
- `enableProtocol()` is gated on `!unmounted` so a teardown that races
  with the response doesn't write the enable sequence after we've
  already pushed the disable sequence.
- `inputManager.destroy()` clears `pendingInput` so an unmount during the
  detection window doesn't leak bytes into a later renderer instance
  sharing the same `inputManager` reference.

## If you touch this code

- **Don't move the listener registration after `inputManager.startListening()`.**
  A terminal that answers synchronously (the optimistic case) would
  drop the response onto a managed listener that doesn't know about
  protocol bytes.
- **Don't widen the 200ms timeout silently.** It's a startup cost paid
  on every `render()` call against a non-kitty terminal. The current
  value matches ink (`repos/ink/src/ink.tsx:1120-1126`).
- **Don't synchronously drain `pendingInput` from `startListening`.** The
  `useEmitterListener` contract runs `onAttach()` (i.e. `setRawMode`)
  before `emitter.on(...)`, so a sync drain would emit to a listener
  that doesn't exist yet. Stay on `queueMicrotask`.

## Related

- [[input-pipeline]] — the three-layer parser the unshifted bytes flow
  back into.
- [[../porting/from-react-ink]] — `kittyKeyboard.mode: 'auto'` is the
  default and matches ink's behaviour.
