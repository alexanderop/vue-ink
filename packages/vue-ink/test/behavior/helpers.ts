import { defineComponent, type VNode } from 'vue';
import { render, Stdout } from '@vue-ink/testing-library';
import { render as vueInkRender } from '@vue-ink/renderer';

// Render a vnode-producing function and return the final frame. Strips a
// trailing transport newline via lastFrame() (the testing library already
// does this). Tests should match ink's `renderToString` output directly.
export const frame = (
	renderFn: () => VNode | VNode[] | string,
	options: { columns?: number } = {},
): string => {
	if (options.columns !== undefined) {
		// Bypass the testing-library shim so we can pin `columns` before the
		// renderer asks for it. Mirrors `render`'s defaults (debug, no
		// throttle, no console patch) so output stays frame-stable.
		const stdout = new Stdout();
		stdout.columns = options.columns;
		const instance = vueInkRender(
			defineComponent({ setup: () => renderFn as () => VNode }),
			{
				stdout: stdout as unknown as NodeJS.WriteStream,
				debug: true,
				exitOnCtrlC: false,
				patchConsole: false,
				maxFps: Number.POSITIVE_INFINITY,
			},
		);
		const out = stdout.lastFrame() ?? '';
		instance.unmount();
		return out;
	}
	const result = render(
		defineComponent({ setup: () => renderFn as () => VNode }),
	);
	const out = result.lastFrame() ?? '';
	result.unmount();
	return out;
};
