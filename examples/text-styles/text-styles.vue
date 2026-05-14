<script setup>
import { Box, Text } from 'vue-ink';
</script>

<template>
	<Box flexDirection="column">
		<Text bold>bold</Text>
		<Text italic>italic</Text>
		<Text underline>underline</Text>
		<Text strikethrough>strikethrough</Text>
		<Text inverse>inverse</Text>
		<Text dimColor>dim</Text>
		<Text bold underline color="cyan">bold + underline + cyan</Text>
	</Box>
</template>
