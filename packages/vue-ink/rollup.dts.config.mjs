import { dts } from "rollup-plugin-dts";

// Produces a single self-contained `dist/index.bundle.d.ts` that inlines the
// re-exports from `@vue-ink/renderer` / `@vue-ink/components` / `@vue-ink/core`
// (the only reason `dist/index.d.ts` isn't already self-sufficient). External
// deps — vue, node:* — stay as plain import declarations: the playground
// worker resolves their types from the CDN via `dependencyVersion.vue`, and
// node:* types come from the editor's tsconfig.
//
// `respectExternal: true` flips rollup-plugin-dts's default of "treat every
// non-relative import as external," which is what causes `@vue-ink/*` to be
// followed. The `external` callback then re-marks anything *outside* the
// workspace (e.g. `vue`, `node:stream`) as external again so we don't drag
// Vue's runtime-core types into the bundle.
const WORKSPACE_PREFIX = "@vue-ink/";
const isWorkspace = (id) => id === WORKSPACE_PREFIX.slice(0, -1) || id.startsWith(WORKSPACE_PREFIX);
const isRelative = (id) => id.startsWith(".") || id.startsWith("/");

export default {
  input: "./src/index.ts",
  output: { file: "./dist/index.bundle.d.ts", format: "es" },
  external: (id) => !isRelative(id) && !isWorkspace(id),
  plugins: [dts({ respectExternal: true })],
};
