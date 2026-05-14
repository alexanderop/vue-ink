import { describe, it, expect } from 'vitest';
import { h, defineComponent } from 'vue';
import { Box, Text } from '../src/index.ts';
import { renderToString, renderToStringRaw } from './helpers.ts';

describe('sanitize ANSI', () => {
	it('strips the bell character from rendered text', async () => {
		const Demo = defineComponent({
			setup: () => () => h(Text, null, () => 'ab'),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out).toBe('ab');
	});

	it('measures bell-stripped width so layout matches', async () => {
		// Box width 4 would clip a 3-char string. With bell stripped, "a\x07b"
		// is 2 chars and fits with trailing space.
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { width: 4 }, () => h(Text, null, () => 'ab')),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out).toBe('ab');
	});

	it('strips backspace and lone carriage-return', async () => {
		const Demo = defineComponent({
			setup: () => () => h(Text, null, () => 'a\bb\rc'),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out).toBe('abc');
	});

	it('preserves SGR color escape sequences passed via raw string', async () => {
		// Bypass <Text color="green"> — pass a pre-coloured raw string and make
		// sure the sanitizer leaves the SGR escapes intact.
		const colored = '[31mhi[39m';
		const Demo = defineComponent({
			setup: () => () => h(Text, null, () => colored),
		});
		const raw = await renderToStringRaw(Demo, { columns: 20 });
		expect(raw).toMatch(/\[31m/);
		expect(raw).toMatch(/hi/);
	});
});
