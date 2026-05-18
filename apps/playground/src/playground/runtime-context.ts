// Bridge between the runner (which sets up xterm-bound stdout/stdin) and the
// `vue-ink` proxy that the user's compiled code imports. A single mutable slot
// works because Vite serves the proxy under one URL, so both sides get the
// same module instance.

import type { RenderOptions } from 'vueink';

type RunContext = {
	stdout: NonNullable<RenderOptions['stdout']>;
	stdin: NonNullable<RenderOptions['stdin']>;
	stderr: NonNullable<RenderOptions['stderr']>;
};

let activeContext: RunContext | undefined;

export const setActiveContext = (ctx: RunContext): void => {
	activeContext = ctx;
};

export const clearActiveContext = (): void => {
	activeContext = undefined;
};

export const getActiveContext = (): RunContext => {
	if (!activeContext) {
		throw new Error(
			'vue-ink playground: no active run context — render() was called outside of a playground run.',
		);
	}
	return activeContext;
};
