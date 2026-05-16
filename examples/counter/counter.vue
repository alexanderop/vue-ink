<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { Text } from 'vueink';

const counter = ref(0);
let timer: NodeJS.Timeout | null = null;

onMounted(() => {
	timer = setInterval(() => {
		counter.value = counter.value + 1;
	}, 100);
});

onBeforeUnmount(() => {
	if (timer) clearInterval(timer);
});
</script>

<template>
	<Text color="green">{{ counter }} tests passed</Text>
</template>
