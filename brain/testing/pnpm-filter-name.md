# Workspace filter name is `vueink`, not `vue-ink`

The monorepo dir is `packages/vue-ink/` but its `package.json` declares
`"name": "vueink"` (no dash). pnpm filters match on the package name, not
the directory:

- ✅ `pnpm --filter vueink test -- Input KittyKeyboardAuto`
- ❌ `pnpm --filter vue-ink test -- ...` → `No projects matched the filters`

Other workspace packages do use the dashed form: `@vue-ink/renderer`,
`@vue-ink/components`, `@vue-ink/testing-library`. Only the umbrella package
drops the dash.

For workspace-wide test runs prefer `pnpm test` (which expands to
`pnpm -r test`) — it sidesteps the naming quirk entirely.
