# Testing

`@vue-ink/testing-library` is a port of [ink-testing-library](https://github.com/vadimdemedes/ink-testing-library). It mounts components against a fake stdout, captures every frame, and exposes a fake stdin so you can drive input.

## Install

```sh
pnpm add -D @vue-ink/testing-library
```

## Basic test

```ts
import { describe, it, expect } from 'vitest'
import { defineComponent, h } from 'vue'
import { render } from '@vue-ink/testing-library'
import { Text } from 'vueink'

describe('greeting', () => {
	it('renders hello world', () => {
		const App = defineComponent({
			setup: () => () => h(Text, { color: 'green' }, () => 'Hello world'),
		})

		const { lastFrame } = render(App)
		expect(lastFrame()).toContain('Hello world')
	})
})
```

## API

```ts
type TestRender = {
	lastFrame(): string
	frames: string[]
	rerender(component: Component): void
	unmount(): void
	cleanup(): void
	stdin: { write(data: string): void }
	waitUntilFlush(): Promise<void>
}
```

`waitUntilFlush()` resolves after Vue's scheduler has flushed and the next frame has been painted to the fake stdout — use it after writing to `stdin` or mutating refs to assert on the result.

```ts
const { stdin, lastFrame, waitUntilFlush } = render(App)
stdin.write('[A') // up arrow
await waitUntilFlush()
expect(lastFrame()).toContain('selected: 1')
```

## Differences from ink-testing-library

- `waitUntilFlush()` is an addition (Vue's scheduler is async-batched, so you need to await it before asserting).
- Everything else mirrors ink-testing-library 1:1.

See the [Ink parity table](/reference/ink-parity#testing) for the full breakdown.
