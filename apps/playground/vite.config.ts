import { createRequire } from "node:module";
import { fileURLToPath, URL } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig, type Plugin } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// vue-ink imports a handful of Node-only modules at module-load time (devtools
// uses `ws`, `cursor-helpers` uses `ansi-escapes`, the renderer reads
// `node:process` / `node:util`). For the browser playground we polyfill what we
// can (events, stream, process, util, buffer) and stub the rest with no-ops.

// The node-polyfills plugin injects `import … from 'vite-plugin-node-polyfills/shims/<name>'`
// into workspace source files that touch Buffer/global/process. Rollup's default
// resolution looks for the package next to the importer — but pnpm doesn't hoist
// vite-plugin-node-polyfills outside apps/playground, so any import emitted into
// packages/renderer/src/render.ts fails with `Could not load …/shims/process`.
// This plugin runs before the default file resolver and points the three shim
// specifiers at their actual on-disk locations.
const require = createRequire(import.meta.url);
const SHIM_NAMES = ["buffer", "global", "process"] as const;
const SHIM_RESOLUTIONS = new Map(
  SHIM_NAMES.map((name) => [
    `vite-plugin-node-polyfills/shims/${name}`,
    require.resolve(`vite-plugin-node-polyfills/shims/${name}`),
  ]),
);

const polyfillShimResolver = (): Plugin => ({
  name: "vue-ink-playground:polyfill-shim-resolver",
  enforce: "pre",
  resolveId(source) {
    const resolved = SHIM_RESOLUTIONS.get(source);
    return resolved ?? null;
  },
});

export default defineConfig({
  // GitHub Pages serves this at https://<user>.github.io/vue-ink/, so the
  // build needs a non-root base. Dev keeps the default `/` unless overridden.
  base: process.env.PLAYGROUND_BASE ?? "/",
  plugins: [
    polyfillShimResolver(),
    vue(),
    nodePolyfills({
      include: ["events", "stream", "process", "util", "buffer"],
      globals: { Buffer: true, process: true },
      protocolImports: true,
    }),
  ],
  resolve: {
    alias: {
      ws: fileURLToPath(new URL("./src/stubs/ws.ts", import.meta.url)),
      "signal-exit": fileURLToPath(new URL("./src/stubs/signal-exit.ts", import.meta.url)),
      "cli-cursor": fileURLToPath(new URL("./src/stubs/cli-cursor.ts", import.meta.url)),
      "restore-cursor": fileURLToPath(new URL("./src/stubs/restore-cursor.ts", import.meta.url)),
    },
  },
  define: {
    // vue-ink reads NODE_ENV in a few places; pin to production so it skips
    // dev-only branches (devtools wiring, verbose errors).
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env.INK_SCREEN_READER": JSON.stringify("false"),
  },
  optimizeDeps: {
    // Per @vue/repl docs: exclude from pre-bundling so Monaco's worker setup
    // and dynamic imports keep working.
    exclude: ["@vue/repl", "yoga-layout"],
  },
  server: {
    fs: {
      // Allow Vite to serve files from the monorepo root so workspace
      // packages (and yoga-layout's WASM payload) resolve in dev.
      allow: ["..", "../.."],
    },
  },
  worker: {
    format: "es",
  },
});
