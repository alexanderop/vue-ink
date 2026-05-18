# `render()`

Mounts a Vue component to the terminal.

```ts
import { render } from 'vueink'

render(component, options?): Instance
```

When `stdout` is a TTY, vue-ink erases the previous frame on each render so the output updates in place. Otherwise it appends.

## Example

```ts
import { render } from 'vueink'
import App from './app.vue'

const instance = render(App)
await instance.waitUntilExit()
```

## `RenderOptions`

```ts
type RenderOptions = {
	stdout?: NodeJS.WriteStream         // default: process.stdout
	stdin?: NodeJS.ReadStream           // default: process.stdin
	stderr?: NodeJS.WriteStream         // default: process.stderr
	debug?: boolean                     // append frames instead of erasing
	exitOnCtrlC?: boolean               // default: true
	patchConsole?: boolean              // default: true; routes console.* through ink
	onRender?: (metrics: RenderMetrics) => void
	isScreenReaderEnabled?: boolean     // emit accessibility tree only
	maxFps?: number                     // default: 30; frame throttle
	incrementalRendering?: boolean      // default: true; diff against last frame
	interactive?: boolean               // default: true (requires TTY)
	alternateScreen?: boolean           // use alt-screen buffer (vim-style)
	kittyKeyboard?: boolean             // enable kitty keyboard protocol if supported
}

type RenderMetrics = {
	frame: number       // monotonic frame index (1-based)
	renderTime: number  // time spent rendering this frame, ms (matches ink)
	lineCount: number   // number of lines in the painted frame
	output: string      // the frame string written to stdout
}
```

`debug` is the most useful one when developing: it disables the cursor-rewind so every frame is appended, which makes it easy to see what changed between renders.

`alternateScreen` switches the terminal to the alternate buffer (the one `vim` and `htop` use). The previous scrollback is preserved when the app exits.

`maxFps` caps how often the renderer flushes. Bursts of state changes coalesce to one paint per frame, so a flurry of `ref.value++` calls within ~16ms paints once.

`isScreenReaderEnabled` swaps the renderer for an accessibility walker that emits flattened text from `aria-label`, `aria-role`, etc. — used for screen-reader output instead of the boxes-and-styles frame.

## `Instance`

```ts
type Instance = {
	rerender(component: Component): void
	unmount(): void
	waitUntilExit(): Promise<unknown>
	waitUntilRenderFlush(): Promise<void>
	clear(): void
	cleanup(): void
}
```

- `rerender(component)` — swap the root component. Useful for live-reloading or wrapping in providers.
- `unmount()` — tear down. Restores raw mode, stops the SIGWINCH listener, unpatches console.
- `waitUntilExit()` — resolves when the user exits (Ctrl-C, by default) or when `unmount()` is called. If `useApp().exit(value)` was called the promise resolves with that value; passing an `Error` rejects it. Most CLIs `await` this to keep the process alive.
- `waitUntilRenderFlush()` — resolves after the next frame has been painted. Useful in tests.
- `clear()` — erase the previously-rendered frame from the terminal.
- `cleanup()` — alias of `unmount()`, present for ink compatibility. Unmounts the app and removes the internal instance for this stdout so a follow-up `render()` against the same stream starts fresh.

## See also

- [`renderToString()`](./render-to-string) — render to a string instead of a TTY.
- [`measureElement()`](./measure-element) — read a rendered Box's dimensions.
