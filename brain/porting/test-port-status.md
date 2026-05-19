# React Ink Test Port Status

- Tracks parity between `repos/ink/test/` and vue-ink tests.
- Read with [[api-tracker]], [[../testing/ink-strategy]], and [[test-parity-is-scenario-level]].
- Current test layout is flat: ink-equivalent tests live in `packages/vue-ink/test/*.test.ts`.

## Status

- Verified against `repos/ink/test/` on 2026-05-19. File-level parity is effectively complete.
- Ink test files: 47. Ported/equivalent: 46.
- Not applicable: `build-output.ts` — vue-ink uses workspace `pnpm typecheck` / `pnpm build` instead.
- Keep checking scenario-level coverage when upstream Ink grows — see [[test-parity-is-scenario-level]].

## Audit Rule

- Do not trust file names alone.
- Compare upstream `test(...)` / `test.serial(...)` scenarios against local `it(...)` / `test(...)` scenarios.
- Port tests at behavior level, not React implementation level; Vue-specific assertions can live beside ink-equivalent cases.
