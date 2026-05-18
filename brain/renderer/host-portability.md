# Renderer is host-portable via stdout/stdin

The renderer is already abstracted over its I/O streams. `render(App, opts)`
takes `opts.stdout` / `opts.stdin` (`packages/renderer/src/render.ts:388-389`),
and `renderToString` builds a `createNoopStdout` (`renderToString.ts:40-48`).
To run vue-ink in a non-TTY host (browser + xterm.js, JSDOM, a network PTY),
**don't fork the renderer — build shims.**

## Minimum stdout contract

The renderer only touches a tiny slice of `NodeJS.WriteStream`:

- `write(chunk) → boolean` — every frame, every patched-console line.
- `columns`, `rows` — read by `useWindowSize`, the wrap path
  (`render.ts:669`), and `renderToString` width clamp.
- `isTTY: boolean` — gates alt-screen and interactivity
  (`render.ts:393-401`).
- `EventEmitter` — `useWindowSize` subscribes to `'resize'`
  (`composables/useWindowSize/index.ts:43-50`). Mutate `columns/rows`,
  then `emit('resize')`.
- `cursorTo`, `clearLine`, `moveCursor` — only called when `isTTY`. Noops
  are fine; if you set `isTTY = false` you can omit them.

## Minimum stdin contract

- `EventEmitter` — emit `'data'` with strings or `Buffer`s; the input
  pipeline handles both.
- `isTTY: boolean` + `setRawMode: () => any` — `input.ts:116` only checks
  `typeof stdin.setRawMode === 'function'`. A noop that returns `this` is
  enough.
- `resume`, `pause`, `setEncoding` — noops; called by the input pipeline
  on mount/unmount.

## Node-isms to alias-stub for browser builds

These are imported but not load-bearing outside a real TTY:
`signal-exit`, `cli-cursor`, `restore-cursor`, `process.exit`. Aliasing
them to empty modules (or shimming `process.exit` → `instance.unmount()`)
is enough. `ws` (the devtools bridge's WebSocket server) is also
Node-only — stub it with a class exposing the surface the import expects.
`patchConsole` works unchanged — it just routes `console.*` through
whatever stdout you passed in — but you'll usually want
`patchConsole: false` in a browser tab so it doesn't swallow the host
page's devtools console.

`yoga-layout` ships a WASM build that resolves in browser bundlers
without config; expect ~50–100ms cold-start before the first frame. If
the first paint 404s on the .wasm, switch from the default entry to
`yoga-layout/load`.

## Sensible browser-embedding defaults

When you wrap `render()` for a browser host (xterm.js, etc.), override:

- `alternateScreen: false` — the host emulator owns its own scrollback;
  alt-screen makes frames disappear when the app unmounts.
- `patchConsole: false` — see above.
- `interactive: true` — pin it on instead of letting the renderer infer
  from `isTTY`, so users who explicitly pass `interactive: false` still
  get the override they typed.

## Worked example

`apps/playground/` is the reference implementation: xterm.js + `@vue/repl`

- a Vite alias map for the stubs above, with `src/playground/shim.ts` as
  the stdout/stdin shim and `src/playground/proxies/vue-ink.ts` as a module
  proxy that shadows `render()` to bind it to the active terminal. Mirror
  its layout for any new host (server-side PTY, JSDOM-in-test, etc.).

**Don't bump `vite-plugin-node-polyfills` past `^0.22.0`.** 0.23.x is
deprecated on npm ("this version is broken") — it references
`unenv/node/*` paths without declaring `unenv` as a dependency, so the
dev server crashes during esbuild's dependency scan with `Cannot find
module 'unenv/node/inspector/promises'`. The pin in
`apps/playground/package.json` is load-bearing; check npm before
upgrading.

## Why this matters

When asked "can vue-ink run in X?" the answer is almost always "yes if X
can fake a WriteStream and a ReadStream." The renderer is the host, not
the terminal. Don't introduce a new entry point — extend `render()`'s
existing option surface.

Related: [[how-it-works]], [[input-pipeline]],
[[layout-listeners]] (the resize → useWindowSize path),
[[../apps/playground-pnpm-polyfill-shims]] (the shim/polyfill layout used in the playground).
