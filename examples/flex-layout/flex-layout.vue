<script setup>
import { Box, Text } from 'vue-ink';
</script>

<template>
	<Box flexDirection="column" :gap="1">
		<Text bold>Row, justifyContent="space-between"</Text>
		<Box justifyContent="space-between" :width="40">
			<Text color="red">left</Text>
			<Text color="green">middle</Text>
			<Text color="blue">right</Text>
		</Box>

		<Text bold>Column, alignItems="center"</Text>
		<Box flexDirection="column" alignItems="center" :width="40">
			<Text>top</Text>
			<Text>middle</Text>
			<Text>bottom</Text>
		</Box>

		<Text bold>Row, gap=3</Text>
		<Box :gap="3">
			<Text>one</Text>
			<Text>two</Text>
			<Text>three</Text>
		</Box>

		<Text bold>Padding (2) around inner box</Text>
		<Box :padding="2">
			<Text backgroundColor="cyan" color="black"> inside </Text>
		</Box>
	</Box>
</template>
