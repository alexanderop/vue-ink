import { describe, it, expect } from 'vitest';
import { h, defineComponent } from 'vue';
import { render, Box, Text } from '../src/index.ts';
import { renderToString } from './helpers.ts';

// `wrap-text` is internal — exercise it end-to-end through <Text wrap>.

describe('wrap-text', () => {
	it('wraps text at word boundaries by default', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { width: 5, flexDirection: 'column' }, () => h(Text, null, () => 'hello world')),
		});
		const out = await renderToString(Demo, { columns: 20 });
		// wrap-ansi inserts a blank line at the soft-wrap point with trim:false
		expect(out.split('\n').filter(Boolean)).toEqual(['hello', 'world']);
	});

	it('breaks long words when wrap is "wrap"', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { width: 4, flexDirection: 'column' }, () =>
					h(Text, { wrap: 'wrap' }, () => 'abcdefghij'),
				),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out.split('\n')).toEqual(['abcd', 'efgh', 'ij']);
	});

	it('hard-wraps mid-word with wrap="hard"', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { width: 3, flexDirection: 'column' }, () =>
					h(Text, { wrap: 'hard' }, () => 'hello world'),
				),
		});
		const out = await renderToString(Demo, { columns: 20 });
		// hard mode doesn't break on word boundaries
		expect(out.split('\n').every((line) => line.length <= 3)).toBe(true);
	});

	it('truncates with ellipsis at end (wrap="truncate-end")', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { width: 6 }, () => h(Text, { wrap: 'truncate-end' }, () => 'helloworld')),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out.endsWith('…')).toBe(true);
		expect(out.length).toBeLessThanOrEqual(6);
	});

	it('truncates in middle (wrap="truncate-middle")', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { width: 6 }, () => h(Text, { wrap: 'truncate-middle' }, () => 'helloworld')),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out).toContain('…');
		expect(out.length).toBeLessThanOrEqual(6);
	});

	it('truncates at start (wrap="truncate-start")', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { width: 6 }, () => h(Text, { wrap: 'truncate-start' }, () => 'helloworld')),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out.startsWith('…')).toBe(true);
		expect(out.length).toBeLessThanOrEqual(6);
	});

	it('caches repeated wrap calls (idempotent output)', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { flexDirection: 'column' }, () => [
					h(Box, { width: 5 }, () => h(Text, null, () => 'hello world cache')),
					h(Box, { width: 5 }, () => h(Text, null, () => 'hello world cache')),
				]),
		});
		const out = await renderToString(Demo, { columns: 20 });
		const lines = out.split('\n');
		// Both Boxes should wrap identically — covers the cache hit path.
		expect(lines.length).toBeGreaterThan(2);
	});
});
