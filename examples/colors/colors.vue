<script setup>
import { Box, Text } from 'vue-ink';

const colors = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
</script>

<template>
	<Box flexDirection="column">
		<Box flexDirection="column" :marginBottom="1">
			<Text>Foreground:</Text>
			<Box>
				<Text v-for="c in colors" :key="c" :color="c">{{ c }} </Text>
			</Box>
		</Box>
		<Box flexDirection="column">
			<Text>Background:</Text>
			<Box>
				<Text v-for="c in colors" :key="c" :backgroundColor="c"> {{ c }} </Text>
			</Box>
		</Box>
	</Box>
</template>
