# `<Spacer>` component

## Why
Ink ships `<Spacer />` as a one-liner shortcut for `<Box flexGrow={1} />` to push siblings apart along the main axis. Cheap to add, very commonly used.

## Scope
- Add `Spacer` to `@vue-ink/components` (`packages/components/src/Spacer.ts`).
- Implementation: `h(Box, { flexGrow: 1 })`.
- Export from package index and from `@vue-ink/vue-ink`.

## Acceptance criteria
- `<Spacer />` mounts an `ink-box` with `flexGrow: 1`, no other props.
- Test: two `<Text>` children separated by `<Spacer>` in a row container land at the two edges of a fixed-width box.

## References
- Ink source: `repos/ink/src/components/Spacer.tsx`
