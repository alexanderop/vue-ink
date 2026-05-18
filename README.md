# vue-ink

A Vue 3 port of [Ink](https://github.com/vadimdemedes/ink) — render Vue components to the terminal.

Use Vue's reactivity, components, and SFCs to build interactive command-line apps. Layout is handled by [Yoga](https://www.yogalayout.dev/) (the same flexbox engine Ink uses), so `<Box>` and `<Text>` behave the way you'd expect coming from Ink or React Native.

> Status: early / experimental (`0.0.1`). API mirrors a subset of Ink.

## Install

```sh
npm install vueink vue
```

> The package is published as `vueink` on npm (the `vue-ink` name was taken). The project is still called vue-ink everywhere else.

Requires Node.js `>=22`.

## Quick start

```ts
import { render, Text } from 'vueink';
import { defineComponent } from 'vue';

const App = defineComponent({
	setup() {
		return () => h(Text, { color: 'green' }, () => 'Hello world');
	},
});

render(App);
```

### With SFCs

```vue
<!-- counter.vue -->
<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { Text } from 'vueink';

const counter = ref(0);
let timer = null;

onMounted(() => {
	timer = setInterval(() => {
		counter.value++;
	}, 100);
});

onBeforeUnmount(() => {
	if (timer) clearInterval(timer);
});
</script>

<template>
	<Text color="green">{{ counter }} tests passed</Text>
</template>
```

```ts
import { render } from 'vueink';
import Counter from './counter.vue';

const instance = render(Counter);
await instance.waitUntilExit();
```

See `examples/counter` for a complete SFC setup (including a minimal loader).

## API

### `render(component, options?) => Instance`

Mounts a Vue component to the terminal.

```ts
type RenderOptions = {
	stdout?: NodeJS.WriteStream; // defaults to process.stdout
	debug?: boolean; // append every frame instead of erasing previous
};

type Instance = {
	rerender(component: Component): void;
	unmount(): void;
	waitUntilExit(): Promise<void>;
	clear(): void;
};
```

When `stdout` is a TTY, vue-ink erases the previous frame on each render so the output updates in place. Otherwise it appends.

### `<Box>`

Flexbox container. Accepts the layout-related props you'd expect from Ink:

- Sizing: `width`, `height`, `minWidth`, `minHeight`, `maxWidth`, `maxHeight`
- Padding: `padding`, `paddingX`, `paddingY`, `paddingTop`, `paddingBottom`, `paddingLeft`, `paddingRight`
- Margin: `margin`, `marginX`, `marginY`, `marginTop`, `marginBottom`, `marginLeft`, `marginRight`
- Flex: `flexGrow`, `flexShrink`, `flexBasis`, `flexDirection`, `flexWrap`, `alignItems`, `alignSelf`, `justifyContent`
- Gap: `gap`, `columnGap`, `rowGap`
- Other: `display`, `overflow`, `overflowX`, `overflowY`

```vue
<template>
	<Box flex-direction="column" padding="1" gap="1">
		<Text bold>Title</Text>
		<Text>Body</Text>
	</Box>
</template>
```

### `<Text>`

Renders styled text. Props:

- `color`, `backgroundColor` — color names, hex (`#ff0000`), or `rgb(...)`
- `dimColor`, `bold`, `italic`, `underline`, `strikethrough`, `inverse`
- `wrap` — `wrap`, `truncate`, `truncate-start`, `truncate-middle`, `truncate-end`

```vue
<template>
	<Text color="cyan" bold>Loading…</Text>
</template>
```

## What's implemented

- Components: `<Box>`, `<Text>`, `<Newline>`, `<Spacer>`, `<Static>`, `<Transform>`
- Composables: `useApp`, `useStdin`, `useStdout`, `useStderr`, `useInput`, `usePaste`, `useFocus`, `useFocusManager`, `useWindowSize`, `useBoxMetrics`, `useCursor`, `useAnimation`, `useIsScreenReaderEnabled`
- `render()` / `renderToString()` / `measureElement()` with TTY in-place updates, `debug` mode, alternate screen, kitty keyboard, incremental rendering
- Reactive re-renders driven by Vue's scheduler
- Screen-reader / ARIA support on `<Box>` and `<Text>`
- Testing helpers via `@vue-ink/testing-library` (port of `ink-testing-library`)

See `brain/porting/api-tracker.md` for the full ink → vue-ink parity table.

## Packages

| package                    | npm                                                                   |
|----------------------------|-----------------------------------------------------------------------|
| `vueink`                   | umbrella entry — most apps install only this                          |
| `@vue-ink/components`      | `<Box>`, `<Text>`, `<Newline>`, `<Spacer>`, `<Static>`, `<Transform>` |
| `@vue-ink/renderer`        | Vue custom renderer + composables                                     |
| `@vue-ink/core`            | Terminal DOM, layout, output pipeline (no Vue dependency)             |
| `@vue-ink/testing-library` | `render`, `lastFrame`, `frames`, fake stdin/stdout                    |

## Credits

This project is a direct port of [Ink](https://github.com/vadimdemedes/ink) by Vadim Demedes. The layout, rendering, and component model trace back to that project; vue-ink swaps the React reconciler for a Vue custom renderer.

## License & attribution

MIT — see [`LICENSE`](./LICENSE) (Copyright (c) 2026 Alexander Opalic).

vue-ink embeds, adapts, or links against third-party MIT-licensed software (Ink, Yoga, and the Chalk / Sindre Sorhus ANSI helpers). The full per-source attribution list lives in [`NOTICES.md`](./NOTICES.md).
