import { describe, it } from 'vitest';

// TODO: port from repos/ink/test/screen-reader.tsx — aria props
// (aria-hidden, aria-role, aria-label, aria-state.*), screen-reader-only
// rendering, ANSI-stripped output, nested layouts. Requires
// isScreenReaderEnabled: true in render() options. The flag is already
// supported via @vue-ink/testing-library — we'd extend the testing-library
// render() to accept it as a passthrough, or set INK_SCREEN_READER=true.

describe('screen-reader', () => {
	it.todo('render text for screen readers');
	it.todo('render text for screen readers with aria-hidden');
	it.todo('render text for screen readers with aria-role');
	it.todo('render select input for screen readers');
	it.todo('render aria-label only Text for screen readers');
	it.todo('render aria-label only Box for screen readers');
	it.todo('omit ANSI styling in screen-reader output');
	it.todo('skip nodes with display:none style in screen-reader output');
	it.todo('render multiple Text components');
	it.todo('render nested Box components with Text');
	it.todo('render component that returns null');
	it.todo('render with aria-state.busy');
	it.todo('render with aria-state.checked');
	it.todo('render with aria-state.disabled');
	it.todo('render with aria-state.expanded');
	it.todo('render with aria-state.multiline');
	it.todo('render with aria-state.multiselectable');
	it.todo('render with aria-state.readonly');
	it.todo('render with aria-state.required');
	it.todo('render with aria-state.selected');
	it.todo('render multi-line text');
	it.todo('render nested multi-line text');
	it.todo('render nested row');
	it.todo('render multi-line text with roles');
	it.todo('render listbox with multiselectable options');
});
