<script setup>
import { Box, Text, Spacer, Newline } from 'vue-ink';
</script>

<template>
	<Box flexDirection="column" :gap="1">
		<Text bold>Spacer — pushes siblings apart in a row</Text>
		<Box borderStyle="single" :padding="1" :width="50">
			<Text>left</Text>
			<Spacer />
			<Text>right</Text>
		</Box>

		<Box borderStyle="single" :padding="1" :width="50">
			<Text>start</Text>
			<Spacer />
			<Text>middle</Text>
			<Spacer />
			<Text>end</Text>
		</Box>

		<Text bold>Newline — line breaks inside a single Text</Text>
		<Box borderStyle="round" :padding="1" :width="50">
			<Text>
				first line<Newline />second line<Newline :count="2" />after a blank line
			</Text>
		</Box>
	</Box>
</template>
