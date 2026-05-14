# vue-ink

A Vue 3 port of [Ink](https://github.com/vadimdemedes/ink) — render Vue components to the terminal.

Use Vue's reactivity, components, and SFCs to build interactive command-line apps. Layout is handled by [Yoga](https://www.yogalayout.dev/) (the same flexbox engine Ink uses), so `<Box>` and `<Text>` behave the way you'd expect coming from Ink or React Native.

> Status: early / experimental (`0.0.1`). API mirrors a subset of Ink.

## Install

```sh
npm install vue-ink vue
```

Requires Node.js `>=22`.

## Quick start

```ts
import { render, Text } from 'vue-ink';
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
import { Text } from 'vue-ink';

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
import { render } from 'vue-ink';
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

- `render()` with TTY in-place updates and `debug` mode
- `<Box>` with the Ink flexbox prop surface, backed by Yoga
- `<Text>` with chalk-powered styling and text wrapping/truncation
- Reactive re-renders driven by Vue's scheduler

## What's not (yet)

- Hooks/composables for input (`useInput`), focus, app lifecycle (`useApp`, `useStdin`, `useStdout`)
- `<Static>`, `<Transform>`, `<Newline>`, `<Spacer>`
- Testing helpers (`ink-testing-library` equivalent)

PRs welcome.

## Credits

This project is a direct port of [Ink](https://github.com/vadimdemedes/ink) by Vadim Demedes. The layout, rendering, and component model trace back to that project; vue-ink swaps the React reconciler for a Vue custom renderer.

## License

MIT
