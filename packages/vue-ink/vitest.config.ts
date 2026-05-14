import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// Scope to our own tests — `repos/` holds vendored reference source
		// whose own specs aren't meant to run in this repo.
		include: ['test/**/*.test.ts'],
		pool: 'forks',
		poolOptions: {
			forks: {
				singleFork: true,
			},
		},
		setupFiles: ['./test/setup.ts'],
		testTimeout: 15_000,
	},
});
