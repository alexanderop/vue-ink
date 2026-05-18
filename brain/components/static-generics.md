# Don't make `<Static>` generic via `as new <T>()` cast

`<Static>` keeps `items: unknown[]` even though it looks like a textbook
generic-component case. The constructor-cast idiom that the Vue 3 community
recommends for generic non-SFC components — does not work here and actively
breaks template slot inference.

## What was tried

```ts
const StaticImpl = defineComponent({
  /* items: readonly unknown[] */
});

const Static = StaticImpl as unknown as new <T>() => {
  $props: StaticProps<T>;
  $slots: { default?: (args: StaticSlotArgs<T>) => VNode[] };
};
```

`StaticProps<T>` had `items: readonly T[]`. The intent: pass `T` from the
`items` prop through to the slot's `item` argument.

## Why it failed

- `vue-tsc` does not propagate `T` from `$props` into `$slots` when the
  component is a constructor cast. `<Static :items="completed">` with
  `completed: CompletedTest[]` still typed the slot's `item` as `unknown`.
- It also doesn't infer through `h(Static, { items }, { default })` — the
  slot callback's `item` becomes `any` because the overload picked for
  constructor-shaped components is the untyped fallback.
- Worse: in the baseline (no cast), Volar inferred the slot's `item` to
  something usable via the default-slot contextual typing it does for
  `defineComponent`. Adding the cast **regressed** that path — `test-runner.vue`
  went from clean to five `TS18046: 'item' is of type 'unknown'` errors.

Net: the cast helps nothing and removes inference that already worked.

## The only known fix

`<script setup lang="ts" generic="T">` in an SFC. This is the path vue-tsc's
generic-component machinery is actually wired for. Banned here for the four
reasons in [[../renderer/no-sfc-components]].

## Decision

`StaticProps` stays non-generic. `items: unknown[]`. `StaticSlotArgs<T = unknown>`
keeps the type parameter so external code can still do
`StaticSlotArgs<MyItem>` when it needs to annotate slot args by hand. Users
who want type-safe slot args type-assert at the call site:

```vue
<template #default="{ item }: { item: MyItem; index: number }"></template>
```
