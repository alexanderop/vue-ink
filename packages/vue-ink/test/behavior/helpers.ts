import { defineComponent, h, type VNode } from 'vue';
import { render } from '@vue-ink/testing-library';

// Render a vnode-producing function and return the final frame. Strips a
// trailing transport newline via lastFrame() (the testing library already
// does this). Tests should match ink's `renderToString` output directly.
export const frame = (renderFn: () => VNode | VNode[] | string): string => {
	const { lastFrame, unmount } = render(
		defineComponent({ setup: () => renderFn as () => VNode }),
	);
	const result = lastFrame() ?? '';
	unmount();
	return result;
};
