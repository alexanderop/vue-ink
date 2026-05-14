import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export default defineConfig({
	root: repoRoot,
	test: {
		pool: 'forks',
		poolOptions: {
			forks: {
				singleFork: true,
			},
		},
		benchmark: {
			// Only our benches — without this, vitest's default `**/*.bench.ts` glob
			// picks up the vendored Vue bench files under repos/.
			include: ['packages/vue-ink/bench/**/*.bench.ts'],
			exclude: ['**/node_modules/**', 'repos/**', '**/dist/**'],
			reporters: ['default'],
		},
	},
});
