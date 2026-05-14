<script setup>
import { ref } from 'vue';
import { Box, Text, useInput, useApp } from 'vue-ink';

const lastInput = ref('');
const lastKey = ref('');
const pressCount = ref(0);

const { exit } = useApp();

useInput((input, key) => {
	pressCount.value += 1;
	lastInput.value = input;
	const flags = Object.entries(key)
		.filter(([, on]) => on === true)
		.map(([k]) => k);
	lastKey.value = flags.length > 0 ? flags.join('+') : '';
	if (input === 'q' || key.escape) exit();
});
</script>

<template>
	<Box flexDirection="column">
		<Text bold color="cyan">useInput demo</Text>
		<Text dimColor>press any key — q or Esc to quit</Text>
		<Box :marginTop="1" flexDirection="column">
			<Text>presses: <Text color="yellow">{{ pressCount }}</Text></Text>
			<Text>last input: <Text color="green">{{ lastInput ? JSON.stringify(lastInput) : '(none)' }}</Text></Text>
			<Text>flags: <Text color="magenta">{{ lastKey || '(none)' }}</Text></Text>
		</Box>
	</Box>
</template>
