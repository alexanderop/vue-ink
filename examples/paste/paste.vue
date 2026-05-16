<script setup lang="ts">
import { ref } from 'vue';
import { Box, Text, useApp, useInput, usePaste } from 'vueink';
import type { Key } from 'vueink';

const lastPaste = ref('');
const pasteCount = ref(0);
const { exit } = useApp();

usePaste((text: string) => {
	lastPaste.value = text;
	pasteCount.value += 1;
});

useInput((input: string, key: Key) => {
	if (input === 'q' || key.escape) exit();
});
</script>

<template>
	<Box flexDirection="column">
		<Text bold color="cyan">usePaste demo</Text>
		<Text dimColor>paste any text (Cmd+V / Ctrl+Shift+V) — q or Esc to quit</Text>
		<Box :marginTop="1" flexDirection="column">
			<Text>pastes: <Text color="yellow">{{ pasteCount }}</Text></Text>
			<Text>last paste: <Text dimColor>{{ lastPaste.length }} chars</Text></Text>
		</Box>
		<Box :marginTop="1" borderStyle="round" :padding="1" :width="60">
			<Text>{{ lastPaste || '(nothing pasted yet)' }}</Text>
		</Box>
	</Box>
</template>
