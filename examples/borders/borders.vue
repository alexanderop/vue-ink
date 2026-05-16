<script setup lang="ts">
import { Box, Text } from 'vueink';
</script>

<template>
	<Box flexDirection="column" :gap="1">
		<Box borderStyle="single" :padding="1">
			<Text>single</Text>
		</Box>

		<Box borderStyle="double" borderColor="green" :padding="1">
			<Text>double · borderColor="green"</Text>
		</Box>

		<Box borderStyle="round" borderColor="cyan" :padding="1">
			<Text>round · borderColor="cyan"</Text>
		</Box>

		<Box borderStyle="bold" borderColor="magenta" :padding="1">
			<Text>bold · borderColor="magenta"</Text>
		</Box>

		<Box borderStyle="classic" :padding="1">
			<Text>classic</Text>
		</Box>

		<Box
			borderStyle="single"
			:borderLeft="false"
			:borderRight="false"
			:paddingY="1"
		>
			<Text>top + bottom only (borderLeft/borderRight = false)</Text>
		</Box>

		<Box
			borderStyle="round"
			borderTopColor="green"
			borderRightColor="yellow"
			borderBottomColor="red"
			borderLeftColor="blue"
			:padding="1"
		>
			<Text>per-side borderColor</Text>
		</Box>

		<Box borderStyle="round" borderColor="cyan" borderDimColor :padding="1">
			<Text>borderDimColor</Text>
		</Box>
	</Box>
</template>
