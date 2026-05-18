# Components

All six components are re-exported from `vueink`:

```ts
import { Box, Text, Newline, Spacer, Static, Transform } from 'vueink'
```

Source: [`packages/components/src/`](https://github.com/alexanderop/vue-ink/tree/main/packages/components/src). See [Ink parity → components](/reference/ink-parity#components) for the parity table.

## Box

Flexbox container. The terminal equivalent of `<div>` with `display: flex` already on it. Source: [`Box.ts`](https://github.com/alexanderop/vue-ink/blob/main/packages/components/src/Box.ts).

```vue
<template>
	<Box flex-direction="column" padding="1" gap="1">
		<Text bold>Title</Text>
		<Text>Body</Text>
	</Box>
</template>
```

All 53+ style props from Yoga are exposed directly as props. Defaults match ink: `flex-direction` is `'row'`, `flex-grow` is `0`, `flex-shrink` is `1`, `flex-wrap` is `'nowrap'`.

### Dimensions

`width`, `height`, `minWidth`, `minHeight`, `maxWidth`, `maxHeight`, `flexBasis`, `aspectRatio`.

`width`/`height` and friends accept `number | string`: numbers are character cells, strings can be percentages (`'50%'`) or `'auto'`. `aspectRatio` is a `number`.

### Padding

`padding`, `paddingX`, `paddingY`, `paddingTop`, `paddingBottom`, `paddingLeft`, `paddingRight`. All `number` (character cells).

### Margin

`margin`, `marginX`, `marginY`, `marginTop`, `marginBottom`, `marginLeft`, `marginRight`. All `number` (character cells).

### Gap

`gap`, `columnGap`, `rowGap`. All `number`.

### Flex

`flexGrow`, `flexShrink`, `flexBasis`, `flexDirection`, `flexWrap`, `alignItems`, `alignSelf`, `alignContent`, `justifyContent`.

- `flexDirection`: `'row' | 'row-reverse' | 'column' | 'column-reverse'`
- `flexWrap`: `'nowrap' | 'wrap' | 'wrap-reverse'`
- `alignItems`: `'flex-start' | 'center' | 'flex-end' | 'stretch'`
- `alignSelf`: `'auto' | 'flex-start' | 'center' | 'flex-end' | 'stretch'`
- `alignContent`: `'flex-start' | 'center' | 'flex-end' | 'stretch' | 'space-between' | 'space-around'`
- `justifyContent`: `'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly'`

### Position

- `position`: `'relative' | 'absolute'`
- `top`, `right`, `bottom`, `left`: `number | string`

### Visibility & overflow

- `display`: `'flex' | 'none'`
- `overflow`: `'visible' | 'hidden'` (shorthand for setting both axes)
- `overflowX`, `overflowY`: `'visible' | 'hidden'` (override per axis)

### Borders

`borderStyle` accepts a preset name or a custom border object:

```ts
type BorderStyle =
	| 'single' | 'double' | 'round' | 'bold'
	| 'singleDouble' | 'doubleSingle'
	| 'classic' | 'arrow'
	| BoxStyle   // custom { topLeft, top, topRight, … } from `cli-boxes`
```

Color and dim variants (one per side plus a global shorthand):

- `borderColor`, `border{Top,Right,Bottom,Left}Color`
- `borderDimColor`, `border{Top,Right,Bottom,Left}DimColor`
- `borderBackgroundColor`, `border{Top,Right,Bottom,Left}BackgroundColor`

Per-side toggles (all default `true` when `borderStyle` is set): `borderTop`, `borderRight`, `borderBottom`, `borderLeft`.

### Background

`backgroundColor` — color name, hex (`'#ff0000'`), or `rgb(...)`. Inherited by descendant `<Text>` nodes unless explicitly overridden.

### Accessibility

`aria-label`, `aria-hidden`, `aria-role`, `aria-state`. See the [ARIA reference](#aria-reference) below for supported values.

### `BoxProps`

```ts
type BoxProps = Omit<Styles, 'textWrap'> & {
	'aria-label'?: string
	'aria-hidden'?: boolean
	'aria-role'?: AccessibilityRole
	'aria-state'?: AccessibilityState
}
```

---

## Text

Renders styled text. Inside a `<Text>`, you can only have other `<Text>`s, plain strings, or `<Newline>`s — not `<Box>`es. Source: [`Text.ts`](https://github.com/alexanderop/vue-ink/blob/main/packages/components/src/Text.ts).

```vue
<template>
	<Text color="cyan" bold>Loading…</Text>
</template>
```

### Props

| prop              | type                                                                              | default  | notes                                                  |
|-------------------|-----------------------------------------------------------------------------------|----------|--------------------------------------------------------|
| `color`           | `Color`                                                                           | inherit  | name, hex (`'#ff0000'`), or `rgb(...)`                 |
| `backgroundColor` | `Color`                                                                           | inherit  | inherits from the nearest `<Box backgroundColor>` ancestor |
| `dimColor`        | `boolean`                                                                         | `false`  |                                                        |
| `bold`            | `boolean`                                                                         | `false`  |                                                        |
| `italic`          | `boolean`                                                                         | `false`  |                                                        |
| `underline`       | `boolean`                                                                         | `false`  |                                                        |
| `strikethrough`   | `boolean`                                                                         | `false`  |                                                        |
| `inverse`         | `boolean`                                                                         | `false`  | swap fg / bg                                           |
| `wrap`            | `'wrap' \| 'truncate' \| 'truncate-start' \| 'truncate-middle' \| 'truncate-end'` | `'wrap'` | how to handle overflow                                 |

### Accessibility

`aria-label`, `aria-hidden`. See the [ARIA reference](#aria-reference). Roles and state are only meaningful on `<Box>`.

### `TextProps`

```ts
type TextProps = {
	color?: Color
	backgroundColor?: Color
	dimColor?: boolean
	bold?: boolean
	italic?: boolean
	underline?: boolean
	strikethrough?: boolean
	inverse?: boolean
	wrap?: 'wrap' | 'truncate' | 'truncate-start' | 'truncate-middle' | 'truncate-end'
	'aria-label'?: string
	'aria-hidden'?: boolean
}
```

---

## Newline

Inserts a line break inside a `<Text>`. Must be a child of `<Text>` — not a sibling. Source: [`Newline.ts`](https://github.com/alexanderop/vue-ink/blob/main/packages/components/src/Newline.ts).

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

`count?: number` — defaults to `1`.

---

## Spacer

Equivalent to `<Box flex-grow="1" />` — pushes siblings to the edges of a flex container. No props. Source: [`Spacer.ts`](https://github.com/alexanderop/vue-ink/blob/main/packages/components/src/Spacer.ts).

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

Renders a list of items **above** the dynamic frame. Used for permanent log output (think `npm install` lines that scroll past as new ones print). Source: [`Static.ts`](https://github.com/alexanderop/vue-ink/blob/main/packages/components/src/Static.ts).

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

### Props

| prop    | type                                                | required | notes                                  |
|---------|-----------------------------------------------------|----------|----------------------------------------|
| `items` | `readonly T[]`                                      | yes      | list of items to render                |
| `style` | `Styles`                                            | no       | passed through to the wrapper Box      |

Slot signature: `{ item: T, index: number }`.

Each unique item is printed exactly once — re-renders don't repaint items already drawn. This is what makes Static usable for huge log streams without flickering. The renderer deduplicates internally (not the component). If you replace the `items` array, only new entries are emitted.

---

## Transform

Wraps children and runs a function over each rendered line. Useful for post-processing styled output without computing string lengths yourself. Source: [`Transform.ts`](https://github.com/alexanderop/vue-ink/blob/main/packages/components/src/Transform.ts).

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

### Props

| prop                 | type                                       | required | notes                                                                                  |
|----------------------|--------------------------------------------|----------|----------------------------------------------------------------------------------------|
| `transform`          | `(line: string, index: number) => string`  | yes      | called once per rendered line                                                          |
| `accessibilityLabel` | `string`                                   | no       | vue-ink extension — emitted in screen-reader mode in place of the transformed output  |

---

## ARIA reference

`<Box>` accepts the full set of ARIA props; `<Text>` accepts only `aria-label` and `aria-hidden`.

| prop          | type                  | applies to       | effect                                                            |
|---------------|-----------------------|------------------|-------------------------------------------------------------------|
| `aria-label`  | `string`              | `<Box>`, `<Text>`| Announced in place of the subtree                                 |
| `aria-hidden` | `boolean`             | `<Box>`, `<Text>`| Skip this subtree entirely in screen-reader output (and layout)   |
| `aria-role`   | `AccessibilityRole`   | `<Box>`          | Role announced to screen readers                                  |
| `aria-state`  | `AccessibilityState`  | `<Box>`          | State flags announced as `(checked, busy)` prefixes               |

Supported `aria-role` values:

`button`, `checkbox`, `combobox`, `list`, `listbox`, `listitem`, `menu`, `menuitem`, `option`, `progressbar`, `radio`, `radiogroup`, `tab`, `tablist`, `table`, `textbox`, `timer`, `toolbar`.

Supported `aria-state` flags (all `boolean`):

`busy`, `checked`, `disabled`, `expanded`, `multiline`, `multiselectable`, `readonly`, `required`, `selected`.

```vue
<template>
	<Box
		aria-role="checkbox"
		:aria-state="{ checked: isChecked, disabled: !canToggle }"
		aria-label="Accept terms"
	>
		<Text>{{ isChecked ? '[x]' : '[ ]' }} Accept terms</Text>
	</Box>
</template>
```

Activate a screen-reader-friendly walker with `render(App, { isScreenReaderEnabled: true })` or detect it from inside a component with [`useIsScreenReaderEnabled`](./composables#useisscreenreaderenabled).

Source types: [`packages/core/src/dom.ts`](https://github.com/alexanderop/vue-ink/blob/main/packages/core/src/dom.ts) (`AccessibilityRole`, `AccessibilityState`).

---

## See also

- [Ink parity → components](/reference/ink-parity#components) — every component prop with status.
- [Ink parity → ARIA](/reference/ink-parity#screen-reader-aria) — accessibility surface and screen-reader walker contract.
- [Composables → useIsScreenReaderEnabled](./composables#useisscreenreaderenabled) — react to screen-reader mode from inside a component.
