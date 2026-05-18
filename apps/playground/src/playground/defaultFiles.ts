export const DEFAULT_APP = `<script setup lang="ts">
import { ref } from 'vue'
import { Box, Text, useInput } from 'vue-ink'

const count = ref(0)

useInput((input, key) => {
  if (input === '+' || key.upArrow) count.value++
  if (input === '-' || key.downArrow) count.value--
  if (input === 'r') count.value = 0
})
</script>

<template>
  <Box flex-direction="column" padding="1">
    <Box border-style="round" padding-x="2" padding-y="1">
      <Text bold color="cyan">vue-ink playground</Text>
    </Box>

    <Box margin-top="1">
      <Text>Count: </Text>
      <Text bold color="yellow">{{ count }}</Text>
    </Box>

    <Box margin-top="1" flex-direction="column">
      <Text dim>↑ / +  increment</Text>
      <Text dim>↓ / -  decrement</Text>
      <Text dim>r      reset</Text>
    </Box>
  </Box>
</template>
`;
