import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config.ts';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export default mergeConfig(baseConfig, {
	resolve: {
		alias: {
			'@vue-ink/components': path.join(repoRoot, 'packages/components/src/index.ts'),
			'@vue-ink/core': path.join(repoRoot, 'packages/core/src/index.ts'),
			'@vue-ink/renderer': path.join(repoRoot, 'packages/renderer/src/index.ts'),
			vueink: path.join(repoRoot, 'packages/vue-ink/src/index.ts'),
		},
	},
});
