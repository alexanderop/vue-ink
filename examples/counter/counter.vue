<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { Text } from 'vue-ink';

const counter = ref(0);
let timer = null;

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
