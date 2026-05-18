import type { Component } from 'vue';
import type { Terminal } from '@xterm/xterm';
import type { Instance } from 'vueink';

import { createShims } from './shim';
import { clearActiveContext, setActiveContext } from './runtime-context';

const VUE_PROXY_URL = new URL('./proxies/vue.ts', import.meta.url).href;
const VUE_INK_PROXY_URL = new URL('./proxies/vue-ink.ts', import.meta.url).href;

// Match `vue-ink` / `vueink` before plain `vue`, otherwise the `vue` rule
// corrupts the hyphenated names. Only `from`-style imports are rewritten —
// dynamic `import('vue')` is not currently supported in playground sources.
const REWRITE_RULES: ReadonlyArray<readonly [RegExp, string]> = [
	[/(\bfrom\s*['"])vueink(['"])/g, `$1${VUE_INK_PROXY_URL}$2`],
	[/(\bfrom\s*['"])vue-ink(['"])/g, `$1${VUE_INK_PROXY_URL}$2`],
	[/(\bfrom\s*['"])vue(['"])/g, `$1${VUE_PROXY_URL}$2`],
];

const rewriteImports = (source: string): string =>
	REWRITE_RULES.reduce<string>((acc, [pattern, replacement]) => acc.replace(pattern, replacement), source);

export type RunResult = {
	instance: Instance;
	dispose: () => Promise<void>;
};

export type RunFailure = { ok: false; error: Error };
export type RunSuccess = { ok: true; result: RunResult };
export type RunOutcome = RunFailure | RunSuccess;

const blobURL = (source: string): string =>
	URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));

export const runUserCode = async (
	term: Terminal,
	compiledJs: string,
): Promise<RunOutcome> => {
	const shims = createShims(term);
	setActiveContext({ stdout: shims.stdout, stdin: shims.stdin, stderr: shims.stderr });

	let moduleURL: string | undefined;

	const cleanup = (): void => {
		shims.dispose();
		clearActiveContext();
		if (moduleURL) URL.revokeObjectURL(moduleURL);
	};

	try {
		moduleURL = blobURL(rewriteImports(compiledJs));
		const mod = (await import(/* @vite-ignore */ moduleURL)) as {
			default?: unknown;
			instance?: Instance;
		};

		// Two supported entry shapes:
		//   1. `export default <Component>` — playground calls render() itself.
		//   2. Module body calls render() and re-exports the resulting instance.
		let instance: Instance;
		if (mod.instance && typeof mod.instance.waitUntilExit === 'function') {
			({ instance } = mod);
		} else if (mod.default) {
			const { render } = (await import(/* @vite-ignore */ VUE_INK_PROXY_URL)) as {
				render: (c: Component) => Instance;
			};
			instance = render(mod.default as Component);
		} else {
			throw new Error(
				'Playground entry must `export default` a Vue component, or run render() at module scope and export the resulting `instance`.',
			);
		}

		return {
			ok: true,
			result: {
				instance,
				dispose: async () => {
					try {
						instance.unmount();
						await instance.waitUntilExit().catch(() => undefined);
					} finally {
						cleanup();
					}
				},
			},
		};
	} catch (error) {
		cleanup();
		return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
	}
};
