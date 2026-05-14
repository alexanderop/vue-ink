<script setup>
import { Box, Text, useApp, useInput, useWindowSize } from 'vue-ink';

const { columns, rows } = useWindowSize();
const { exit } = useApp();

useInput((input, key) => {
	if (input === 'q' || key.escape) exit();
});
</script>

<template>
	<Box flexDirection="column" :gap="1">
		<Text bold color="cyan">useWindowSize demo</Text>
		<Text dimColor>resize the terminal — q or Esc to quit</Text>
		<Box borderStyle="round" :padding="1">
			<Text>columns: <Text color="green">{{ columns }}</Text></Text>
			<Text>  rows: <Text color="green">{{ rows }}</Text></Text>
		</Box>
		<Box :width="columns - 2" borderStyle="single">
			<Text>← stretches to terminal width</Text>
		</Box>
	</Box>
</template>
