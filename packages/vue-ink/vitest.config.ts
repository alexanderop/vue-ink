import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export default defineConfig({
	// Run from the monorepo root so coverage globs can reach every package
	// while we keep tests scoped to packages/vue-ink/test.
	root: repoRoot,
	test: {
		include: [
			'packages/vue-ink/test/**/*.test.ts',
			// VueUse-style: co-locate composable tests next to source.
			'packages/renderer/src/composables/**/*.test.ts',
		],
		pool: 'forks',
		poolOptions: {
			forks: {
				singleFork: true,
			},
		},
		setupFiles: ['./packages/vue-ink/test/setup.ts'],
		testTimeout: 15_000,
		coverage: {
			provider: 'v8',
			// Tests exercise all four packages via vue-ink's re-exports —
			// instrument every package source tree.
			include: ['packages/*/src/**/*.ts'],
			exclude: [
				'**/dist/**',
				'**/node_modules/**',
				'**/test/**',
				'**/*.d.ts',
				'**/index.ts',
				'**/bin/**',
				'repos/**',
				'examples/**',
			],
			reporter: ['text', 'html', 'lcov'],
			reportsDirectory: 'coverage',
			all: true,
		},
	},
});
