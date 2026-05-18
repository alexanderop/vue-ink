import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// vue-ink imports a handful of Node-only modules at module-load time (devtools
// uses `ws`, `cursor-helpers` uses `ansi-escapes`, the renderer reads
// `node:process` / `node:util`). For the browser playground we polyfill what we
// can (events, stream, process, util, buffer) and stub the rest with no-ops.
export default defineConfig({
	// GitHub Pages serves this at https://<user>.github.io/vue-ink/, so the
	// build needs a non-root base. Dev keeps the default `/` unless overridden.
	base: process.env.PLAYGROUND_BASE ?? '/',
	plugins: [
		vue(),
		nodePolyfills({
			include: ['events', 'stream', 'process', 'util', 'buffer'],
			globals: { Buffer: true, process: true },
			protocolImports: true,
		}),
	],
	resolve: {
		alias: {
			ws: fileURLToPath(new URL('./src/stubs/ws.ts', import.meta.url)),
			'signal-exit': fileURLToPath(new URL('./src/stubs/signal-exit.ts', import.meta.url)),
			'cli-cursor': fileURLToPath(new URL('./src/stubs/cli-cursor.ts', import.meta.url)),
			'restore-cursor': fileURLToPath(new URL('./src/stubs/restore-cursor.ts', import.meta.url)),
		},
	},
	define: {
		// vue-ink reads NODE_ENV in a few places; pin to production so it skips
		// dev-only branches (devtools wiring, verbose errors).
		'process.env.NODE_ENV': JSON.stringify('production'),
		'process.env.INK_SCREEN_READER': JSON.stringify('false'),
	},
	optimizeDeps: {
		// Per @vue/repl docs: exclude from pre-bundling so Monaco's worker setup
		// and dynamic imports keep working.
		exclude: ['@vue/repl', 'yoga-layout'],
	},
	server: {
		fs: {
			// Allow Vite to serve files from the monorepo root so workspace
			// packages (and yoga-layout's WASM payload) resolve in dev.
			allow: ['..', '../..'],
		},
	},
	worker: {
		format: 'es',
	},
});
