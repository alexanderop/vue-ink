# `measureElement()`

Reads the laid-out dimensions of a `<Box>` after Yoga has run. The non-reactive sibling of [`useBoxMetrics`](./composables#useboxmetrics).

```ts
import { measureElement } from 'vueink'

measureElement(ref): { width: number, height: number }
```

## Example

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Box, Text, measureElement } from 'vueink'

const boxRef = ref<HTMLElement>()

onMounted(() => {
	const { width, height } = measureElement(boxRef.value!)
	console.log(`Box is ${width}x${height} cells`)
})
</script>

<template>
	<Box ref="boxRef" padding="1" border-style="round">
		<Text>Measured</Text>
	</Box>
</template>
```

## When to use

- One-shot reads (e.g., inside `onMounted` to seed a state).
- Computing layout in a parent based on a child's natural size.

For reactive reads — e.g., a dimension that should track resizes — use [`useBoxMetrics`](./composables#useboxmetrics) instead. It returns refs that update on every layout pass.
