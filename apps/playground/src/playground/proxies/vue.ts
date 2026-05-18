// runner.ts rewrites `from 'vue'` in user code to this URL so the user's
// compiled SFC shares the same Vue runtime as the playground shell — required
// because Vue's reactivity uses module-scoped state (effect stacks, scheduler).
export * from 'vue';
