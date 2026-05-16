<script setup lang="ts">
import { ref } from 'vue';
import { Box, Text, useApp, useInput } from 'vueink';
import type { Key } from 'vueink';

type Last = { input: string; flags: string; special: string; eventType: string };

const last = ref<Last>({ input: '', flags: '', special: '', eventType: '' });
const { exit } = useApp();

useInput((input: string, key: Key) => {
	const flags: string[] = [];
	if (key.ctrl) flags.push('ctrl');
	if (key.shift) flags.push('shift');
	if (key.meta) flags.push('meta');
	if (key.super) flags.push('super');
	if (key.hyper) flags.push('hyper');
	if (key.capsLock) flags.push('capsLock');
	if (key.numLock) flags.push('numLock');

	const special: string[] = [];
	if (key.upArrow) special.push('↑');
	if (key.downArrow) special.push('↓');
	if (key.leftArrow) special.push('←');
	if (key.rightArrow) special.push('→');
	if (key.pageUp) special.push('PgUp');
	if (key.pageDown) special.push('PgDn');
	if (key.home) special.push('Home');
	if (key.end) special.push('End');
	if (key.return) special.push('Return');
	if (key.tab) special.push('Tab');
	if (key.backspace) special.push('Backspace');
	if (key.delete) special.push('Delete');

	last.value = {
		input: input ? JSON.stringify(input) : '(none)',
		flags: flags.length ? flags.join(' + ') : '(none)',
		special: special.length ? special.join(' ') : '(none)',
		eventType: key.eventType ?? '(legacy mode)',
	};

	if (input === 'q' || key.escape) exit();
});
</script>

<template>
	<Box flexDirection="column">
		<Text bold color="cyan">Kitty keyboard demo</Text>
		<Text dimColor>press any combo — best in a kitty-protocol terminal (Kitty, Ghostty, WezTerm)</Text>
		<Box :marginTop="1" flexDirection="column">
			<Text>input:   <Text color="green">{{ last.input }}</Text></Text>
			<Text>flags:   <Text color="magenta">{{ last.flags }}</Text></Text>
			<Text>special: <Text color="yellow">{{ last.special }}</Text></Text>
			<Text>event:   <Text color="blue">{{ last.eventType }}</Text></Text>
		</Box>
		<Box :marginTop="1" borderStyle="round" :padding="1">
			<Text dimColor>kitty mode also reports super/hyper/capsLock/numLock and press/repeat/release event types · q or Esc quits</Text>
		</Box>
	</Box>
</template>
