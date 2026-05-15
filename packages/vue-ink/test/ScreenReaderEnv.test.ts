import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { defineComponent, h } from 'vue';
import { render } from '@vue-ink/testing-library';
import { Box, Text } from '../src/index.ts';

// Coverage for the `INK_SCREEN_READER` env-var default in `render()`. The
// renderer reads `process.env.INK_SCREEN_READER === 'true'` as the seed for
// the accessibility context's `isScreenReaderEnabled` ref — unless an explicit
// option overrides it. Mid-render toggling is intentionally out of scope here.

let savedEnv: string | undefined;

beforeEach(() => {
	savedEnv = process.env['INK_SCREEN_READER'];
});

afterEach(() => {
	if (savedEnv === undefined) delete process.env['INK_SCREEN_READER'];
	else process.env['INK_SCREEN_READER'] = savedEnv;
});

const Tree = defineComponent({
	setup: () => () =>
		h(Box, { 'aria-label': 'announce-me' }, () =>
			h(Text, null, () => 'visible-text'),
		),
});

describe('INK_SCREEN_READER env var', () => {
	it('defaults to screen-reader mode when set to "true"', async () => {
		process.env['INK_SCREEN_READER'] = 'true';
		const { lastFrame, unmount } = render(Tree);
		// Screen-reader walker fires: announces the aria-label, suppresses
		// the visual text child.
		expect(lastFrame()).toBe('announce-me');
		unmount();
	});

	it('defaults to visual mode when the env var is unset', async () => {
		delete process.env['INK_SCREEN_READER'];
		const { lastFrame, unmount } = render(Tree);
		// Visual path: the text child renders, no "announce-me" prefix appears
		// because aria-label is only consumed by the screen-reader walker.
		expect(lastFrame()).toContain('visible-text');
		expect(lastFrame()).not.toContain('announce-me');
		unmount();
	});

	it('defaults to visual mode when env var is anything other than "true"', async () => {
		process.env['INK_SCREEN_READER'] = '1';
		const { lastFrame, unmount } = render(Tree);
		expect(lastFrame()).toContain('visible-text');
		expect(lastFrame()).not.toContain('announce-me');
		unmount();
	});

	it('explicit `isScreenReaderEnabled: true` overrides a missing env var', async () => {
		delete process.env['INK_SCREEN_READER'];
		const { lastFrame, unmount } = render(Tree, {
			isScreenReaderEnabled: true,
		});
		expect(lastFrame()).toBe('announce-me');
		unmount();
	});

	it('explicit `isScreenReaderEnabled: false` overrides INK_SCREEN_READER=true', async () => {
		process.env['INK_SCREEN_READER'] = 'true';
		const { lastFrame, unmount } = render(Tree, {
			isScreenReaderEnabled: false,
		});
		expect(lastFrame()).toContain('visible-text');
		expect(lastFrame()).not.toContain('announce-me');
		unmount();
	});
});
