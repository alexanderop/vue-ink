# Mutation Testing

- Stryker runs tests in a sandbox but symlinks `node_modules` by default.
- In this pnpm workspace, imports like `@vue-ink/core` can otherwise resolve through the original workspace package symlink, bypassing mutated files in the sandbox.
- Use a mutation-specific Vitest config with aliases from workspace package names to sandbox source entrypoints:
  - `@vue-ink/core` -> `packages/core/src/index.ts`
  - `@vue-ink/renderer` -> `packages/renderer/src/index.ts`
  - `@vue-ink/components` -> `packages/components/src/index.ts`
  - `vueink` -> `packages/vue-ink/src/index.ts`
- Do not use Vitest related mode for the canonical mutation pass; many tests cover internals through package re-exports, and related mode can under-select tests.
- Keep `examples/` available in the Stryker sandbox because the counter PTY test spawns `examples/counter`.
- Delete inherited `NO_COLOR` before forcing color in Vitest setup; `NO_COLOR` + `FORCE_COLOR` can emit warnings that break PTY output assertions.
