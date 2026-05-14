# `<Newline>` component

## Why
Inserting newlines inside a `<Text>` block currently requires a literal `'\n'` string in the template, which Vue strips or whitespace-normalises depending on context. Ink ships `<Newline count?>` as the idiomatic way.

## Scope
- Add `Newline` to `@vue-ink/components` (`packages/components/src/Newline.ts`).
- Export from `packages/components/src/index.ts` and re-export from `@vue-ink/vue-ink`.
- Implementation: `defineComponent` that emits an `ink-text` host element whose only child is `'\n'.repeat(count ?? 1)`.
- Must be valid as a child of `<Text>` (no Yoga node).

## Acceptance criteria
- `<Newline />` renders one `\n`.
- `<Newline :count="3" />` renders three.
- Used inside `<Text>` joins surrounding inline text without an extra blank wrapper.
- Type: `NewlineProps = { count?: number }`.
- Test in `packages/vue-ink/test/newline.test.ts` mirroring Ink's behaviour.

## References
- Ink source: `repos/ink/src/components/Newline.tsx`
- Ink readme section "Components → `<Newline>`".
