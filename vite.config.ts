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
			'no-unused-vars': 'error',

			'prefer-object-spread': 'error',
			'prefer-spread': 'error',
			'object-shorthand': 'error',
			'prefer-template': 'error',
			'prefer-destructuring': 'error',

			'typescript/no-extraneous-class': 'error',
			'unicorn/no-static-only-class': 'error',
			'unicorn/no-this-assignment': 'error',
			'unicorn/no-new-array': 'error',
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
			{
				// Composables and components must use `requireContext()` for injected
				// state — see brain/composables/vueuse-patterns.md. Non-null bangs on
				// `inject()` swallow the missing-provider case.
				files: [
					'packages/renderer/src/composables/**/*.ts',
					'packages/components/src/**/*.ts',
				],
				rules: {
					'typescript/no-non-null-assertion': 'error',
				},
			},
			{
				// Byte-level ANSI/control-char handling. The whole point of these
				// files is to match and emit C0/CSI sequences.
				files: ['packages/core/src/sanitize-ansi.ts', 'packages/renderer/src/parse-keypress.ts'],
				rules: {
					'no-control-regex': 'off',
					'typescript/no-misused-spread': 'off',
				},
			},
			{
				// Output buffer is a per-frame hot path; sparse pre-allocation
				// (`new Array(n)`) is the intentional perf choice — see comments
				// in the file about ~6k cells/frame.
				files: ['packages/core/src/output.ts'],
				rules: {
					'unicorn/no-new-array': 'off',
				},
			},
			{
				// Tests legitimately match raw ANSI escapes (\x1b[..m), reference
				// unbound methods via vi.fn spies, spread ASCII-only inputs, and
				// stub injected yoga nodes with `!`. This block must come last so
				// it wins over the composables/components override above.
				files: ['**/*.test.ts', '**/*.test.tsx', '**/test/**', '**/_test/**'],
				rules: {
					'no-control-regex': 'off',
					'typescript/unbound-method': 'off',
					'typescript/no-misused-spread': 'off',
					'typescript/no-non-null-assertion': 'off',
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
