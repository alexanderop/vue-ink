import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { dts } from "rollup-plugin-dts";

// Produces a single self-contained `dist/index.bundle.d.ts` that inlines the
// re-exports from `@vue-ink/renderer` / `@vue-ink/components` / `@vue-ink/core`
// (the only reason `dist/index.d.ts` isn't already self-sufficient). External
// deps — vue, node:* — stay as plain import declarations: the playground
// worker resolves their types from the CDN via `dependencyVersion.vue`, and
// node:* types come from the editor's tsconfig.
//
// We point `@vue-ink/*` at each workspace's already-built `dist/index.d.ts`
// instead of letting rollup-plugin-dts re-derive types from the workspace
// source. The dist `.d.ts` files contain the fully-resolved
// `DefineComponent<...>` return type for `Box`/`Text`/etc.; re-deriving from
// the source loses that type and emits `declare const Box: any`, which is
// what Monaco was seeing in the playground.
const WORKSPACE_DIST = {
  "@vue-ink/components": "../components/dist/index.d.ts",
  "@vue-ink/renderer": "../renderer/dist/index.d.ts",
  "@vue-ink/core": "../core/dist/index.d.ts",
};

const here = dirname(fileURLToPath(import.meta.url));
const workspaceDistPaths = Object.fromEntries(
  Object.entries(WORKSPACE_DIST).map(([id, rel]) => [id, resolve(here, rel)]),
);

for (const [id, path] of Object.entries(workspaceDistPaths)) {
  if (!existsSync(path)) {
    throw new Error(
      `rollup.dts.config.mjs: missing ${id} dist at ${path}. ` +
        `Run \`pnpm -r --filter "./packages/*" build\` before bundling vue-ink dts.`,
    );
  }
}

const isRelative = (id) => id.startsWith(".") || id.startsWith("/");

/** @type {import('rollup').Plugin} */
const resolveWorkspaceDist = {
  name: "resolve-workspace-dist",
  resolveId(id) {
    return workspaceDistPaths[id] ?? null;
  },
};

export default {
  input: "./src/index.ts",
  output: { file: "./dist/index.bundle.d.ts", format: "es" },
  external: (id) => !isRelative(id) && !(id in workspaceDistPaths),
  plugins: [resolveWorkspaceDist, dts({ respectExternal: true })],
};
