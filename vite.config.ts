import { defineConfig } from 'vite-plus';

export default defineConfig({
	staged: {
		'*': 'vp check --fix',
	},
	lint: {
		plugins: ['oxc', 'typescript', 'unicorn'],
		categories: {
			correctness: 'warn',
		},
		rules: {
			'no-param-reassign': ['error', { props: true }],
			'no-var': 'error',
			'prefer-const': 'error',
			'no-plusplus': 'error',
			'no-loop-func': 'error',
			'no-unmodified-loop-condition': 'error',

			'prefer-object-spread': 'error',
			'prefer-spread': 'error',
			'object-shorthand': 'error',
			'prefer-template': 'error',
			'prefer-destructuring': 'error',

			'typescript/no-extraneous-class': 'error',
			'unicorn/no-static-only-class': 'error',
			'unicorn/no-this-assignment': 'error',
			'oxc/no-this-in-exported-function': 'error',

			'arrow-body-style': ['error', 'as-needed'],
			'func-style': ['error', 'expression', { allowArrowFunctions: true }],
			'unicorn/consistent-function-scoping': 'error',

			'unicorn/prefer-array-flat-map': 'error',
			'unicorn/prefer-array-flat': 'error',
			'unicorn/prefer-array-find': 'error',
			'unicorn/prefer-array-some': 'error',
			'unicorn/no-array-for-each': 'error',
		},
		overrides: [
			{
				// Tree-mutation APIs (DOM, Output buffer, Vue host renderer) exist to
				// mutate the nodes passed in. Param-mutation IS the contract here.
				files: [
					'packages/core/src/dom.ts',
					'packages/core/src/output.ts',
					'packages/renderer/src/renderer.ts',
				],
				rules: {
					'no-param-reassign': 'off',
				},
			},
		],
		ignorePatterns: ['repos/**', '**/dist/**', '**/build/**'],
		options: {
			typeAware: true,
			typeCheck: true,
		},
	},
	fmt: {
		semi: true,
		singleQuote: true,
		printWidth: 100,
		useTabs: true,
		ignorePatterns: ['repos/**', '**/dist/**', '**/build/**'],
	},
});
