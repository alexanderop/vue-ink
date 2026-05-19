import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, '../../..');

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

type PackageJson = {
	name: string;
	bin?: Record<string, string>;
	files?: string[];
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
};

describe('published package contracts', () => {
	// what this catches: source imports that become runtime imports in the
	// published package must be declared as production dependencies. Strict
	// package managers do not make devDependencies available to consumers.
	it('@vue-ink/renderer declares @vue/runtime-core as a runtime dependency', () => {
		const packageJson = readJson<PackageJson>(
			resolve(repoRoot, 'packages/renderer/package.json'),
		);
		const rendererSource = readFileSync(
			resolve(repoRoot, 'packages/renderer/src/renderer.ts'),
			'utf8',
		);

		expect(rendererSource).toContain("from '@vue/runtime-core'");
		expect(packageJson.dependencies).toHaveProperty('@vue/runtime-core');
		expect(packageJson.devDependencies).not.toHaveProperty('@vue/runtime-core');
	});

	// what this catches: the umbrella package promises a CLI, so its published
	// package metadata must expose an executable that npm/pnpm can link.
	it('vueink publishes a vueink executable', () => {
		const packageJson = readJson<PackageJson>(
			resolve(repoRoot, 'packages/vue-ink/package.json'),
		);

		expect(packageJson.bin ?? {}).toHaveProperty('vueink');
		expect(packageJson.bin?.vueink).toMatch(/^\.\/dist\/bin\/vueink\.js$/);
		expect(packageJson.files).toContain('dist');
	});
});
