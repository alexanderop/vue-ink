# Components

All components are re-exported from `vueink`:

```ts
import { Box, Text, Newline, Spacer, Static, Transform } from 'vueink'
```

## Box

Flexbox container. The terminal equivalent of `<div>` with `display: flex` already on it.

```vue
<template>
	<Box flex-direction="column" padding="1" gap="1">
		<Text bold>Title</Text>
		<Text>Body</Text>
	</Box>
</template>
```

### Sizing

`width`, `height`, `minWidth`, `minHeight`, `maxWidth`, `maxHeight`, `aspectRatio`.

Numbers are character cells; strings can be percentages (`'50%'`) or `'auto'`.

### Spacing

- Padding: `padding`, `paddingX`, `paddingY`, `paddingTop`, `paddingBottom`, `paddingLeft`, `paddingRight`
- Margin: `margin`, `marginX`, `marginY`, `marginTop`, `marginBottom`, `marginLeft`, `marginRight`
- Gap: `gap`, `columnGap`, `rowGap`

### Flex

`flexGrow`, `flexShrink`, `flexBasis`, `flexDirection`, `flexWrap`, `alignItems`, `alignSelf`, `alignContent`, `justifyContent`.

### Position

`position` (`'relative'` | `'absolute'`), `top`, `right`, `bottom`, `left`.

### Visibility & overflow

`display`, `overflow`, `overflowX`, `overflowY`.

### Borders

`borderStyle`: one of `'single'`, `'double'`, `'round'`, `'bold'`, `'singleDouble'`, `'doubleSingle'`, `'classic'`, `'arrow'`, or a custom border object.

`borderColor`, `borderTopColor`, `borderRightColor`, `borderBottomColor`, `borderLeftColor`, `borderDimColor`, `borderTopDimColor`, `borderRightDimColor`, `borderBottomDimColor`, `borderLeftDimColor`, `borderBackgroundColor`, `borderTopBackgroundColor`, `borderRightBackgroundColor`, `borderBottomBackgroundColor`, `borderLeftBackgroundColor`.

Per-side toggles: `borderTop`, `borderRight`, `borderBottom`, `borderLeft` (all default `true`).

### Background

`backgroundColor` — color name, hex (`'#ff0000'`), or `rgb(...)`.

### Accessibility

`aria-label`, `aria-hidden`, `aria-role`, `aria-state` — see [Ink parity → ARIA](/reference/ink-parity#screen-reader-aria) for the supported role/state list.

---

## Text

Renders styled text. Inside a `<Text>`, you can only have other `<Text>`s, plain strings, or `<Newline>`s — not `<Box>`es.

```vue
<template>
	<Text color="cyan" bold>Loading…</Text>
</template>
```

### Props

- `color`, `backgroundColor` — color names, hex (`'#ff0000'`), or `rgb(...)`
- `dimColor`, `bold`, `italic`, `underline`, `strikethrough`, `inverse` — booleans
- `wrap`: `'wrap'` | `'truncate'` | `'truncate-start'` | `'truncate-middle'` | `'truncate-end'`

### Accessibility

`aria-label`, `aria-hidden`.

---

## Newline

Inserts a line break inside a `<Text>`. Must be a child of `<Text>` — not a sibling.

```vue
<template>
	<Text>
		First line
		<Newline />
		Second line
		<Newline :count="2" />
		Fourth line
	</Text>
</template>
```

`count` defaults to `1`.

---

## Spacer

Equivalent to `<Box flex-grow="1" />` — pushes siblings to the edges of a flex container.

```vue
<template>
	<Box>
		<Text>Left</Text>
		<Spacer />
		<Text>Right</Text>
	</Box>
</template>
```

---

## Static

Renders a list of items **above** the dynamic frame. Used for permanent log output (think `npm install` lines that scroll past as new ones print).

```vue
<template>
	<Static :items="logs">
		<template #default="{ item, index }">
			<Text :key="index">{{ item.message }}</Text>
		</template>
	</Static>

	<!-- the dynamic part of your UI -->
	<Text>{{ progress }}%</Text>
</template>
```

Each unique item is printed exactly once — re-renders don't repaint items already drawn. This is what makes Static usable for huge log streams without flickering.

The renderer deduplicates internally (not the component). If you replace the `items` array, only new entries are emitted.

---

## Transform

Wraps children and runs a function over each rendered line. Useful for post-processing styled output without computing string lengths yourself.

```vue
<script setup>
import { Transform, Text } from 'vueink'

const upperCase = (line) => line.toUpperCase()
</script>

<template>
	<Transform :transform="upperCase">
		<Text>hello world</Text>
	</Transform>
</template>
```

`transform: (line: string, index: number) => string`.

### `accessibilityLabel`

vue-ink extension. If set, screen-reader mode emits the label instead of the transformed visual output — useful when the transform produces ASCII art that doesn't read as text.

---

## See the parity table

For every component prop with status, [Ink → vue-ink parity](/reference/ink-parity#components) is the source of truth.
