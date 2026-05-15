import { describe, it, expect } from 'vitest';
import { h, defineComponent } from 'vue';
import { Box, Text, Spacer } from '../src/index.ts';
import { renderToString } from './helpers.ts';

describe('Spacer (vertical)', () => {
	it('pushes its two siblings to opposite edges in a fixed-height column', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { height: 5, flexDirection: 'column' }, () => [
					h(Text, null, () => 'top'),
					h(Spacer),
					h(Text, null, () => 'bot'),
				]),
		});
		const out = await renderToString(Demo, { columns: 10 });
		const lines = out.split('\n');
		expect(lines[0]).toBe('top');
		// Lines 1..3 are spacer fill (blank or trimmed).
		expect(lines[lines.length - 1]).toBe('bot');
		expect(lines.length).toBe(5);
	});

	it('three-way column layout: header, spacer, footer keeps middle empty', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { height: 4, flexDirection: 'column' }, () => [
					h(Text, null, () => 'H'),
					h(Spacer),
					h(Text, null, () => 'F'),
				]),
		});
		const out = await renderToString(Demo, { columns: 10 });
		const lines = out.split('\n');
		expect(lines[0]).toBe('H');
		expect(lines[lines.length - 1]).toBe('F');
		// Each middle line is whitespace-only.
		for (const line of lines.slice(1, -1)) {
			expect(line.trim()).toBe('');
		}
	});
});
