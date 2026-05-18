// Same trick as ./vue.ts, but with one twist: we shadow the real `render` so
// user code that calls `render(App)` ends up writing into the playground's
// xterm.js instance instead of a `process.stdout` that doesn't exist.
//
// ES modules give explicit local exports precedence over `export *`, so the
// `export *` line below will re-export everything from vueink EXCEPT `render`
// (and `renderToString`, which we also rebind because it lives in the same
// namespace and we want to be explicit).

import type { Component } from 'vue';
import {
	render as builtinRender,
	renderToString as builtinRenderToString,
	type Instance,
	type RenderOptions,
} from 'vueink';

import { getActiveContext } from '../runtime-context';

export * from 'vueink';

export const render = (component: Component, options: RenderOptions = {}): Instance => {
	const ctx = getActiveContext();
	return builtinRender(component, {
		stdout: ctx.stdout,
		stdin: ctx.stdin,
		stderr: ctx.stderr,
		// Browser-host defaults. Listed before `...options` so user-supplied
		// values still win — pinning interactive avoids the renderer guessing
		// from `isTTY`, and alt-screen would hide frames when the app unmounts
		// because xterm.js owns its own scrollback.
		interactive: true,
		alternateScreen: false,
		patchConsole: false,
		...options,
	});
};

export const renderToString = builtinRenderToString;
