# `renderToString()`

Renders a component to a string (synchronously). Useful for snapshot tests, generating SSR-style output, or embedding rendered frames in non-TTY contexts.

```ts
import { renderToString } from 'vueink'

renderToString(component, options?): string
```

## Example

```ts
import { renderToString, Box, Text } from 'vueink'
import { defineComponent, h } from 'vue'

const App = defineComponent({
	setup: () => () =>
		h(Box, { padding: 1 }, () => h(Text, { color: 'cyan' }, () => 'Hello')),
})

const frame = renderToString(App, { columns: 40 })
console.log(frame)
```

## Options

```ts
type RenderToStringOptions = {
	columns?: number                  // default: 80
	isScreenReaderEnabled?: boolean   // emit accessibility tree instead
}
```

`columns` controls the layout width passed to Yoga — there's no terminal involved, so vue-ink can't auto-detect one.

`isScreenReaderEnabled` is a vue-ink extension over the ink API. It swaps the output for the flattened accessibility tree.
