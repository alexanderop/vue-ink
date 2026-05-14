<script setup>
import { Box, Text, Transform } from 'vue-ink';

const upper = (text) => text.toUpperCase();
const reverse = (text) => [...text].reverse().join('');
const bracket = (text) => `[ ${text.trim()} ]`;
// the transform is called once per line; the second arg is the line index
const numbered = (text, index) => `${String(index + 1).padStart(2, ' ')}  ${text}`;

const poem = ['roses are red', 'violets are blue', 'transforms run', 'on every view'].join('\n');
</script>

<template>
	<Box flexDirection="column" :gap="1">
		<Transform :transform="upper">
			<Text>uppercased — applied at render time</Text>
		</Transform>

		<Transform :transform="reverse">
			<Text>reverse me</Text>
		</Transform>

		<Transform :transform="bracket">
			<Text color="cyan">wrapped in brackets · keeps inner color</Text>
		</Transform>

		<Box borderStyle="round" :padding="1">
			<Transform :transform="numbered">
				<Text>{{ poem }}</Text>
			</Transform>
		</Box>
	</Box>
</template>
