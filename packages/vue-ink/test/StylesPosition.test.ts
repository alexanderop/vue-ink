import { describe, it, expect } from 'vitest';
import { h, defineComponent } from 'vue';
import { Box, Text } from '../src/index.ts';
import { renderToString } from './helpers.ts';

describe('position styles', () => {
	it('places an absolute child at top/left of its relative parent', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{ position: 'relative', width: 10, height: 4 },
					() =>
						h(
							Box,
							{ position: 'absolute', top: 2, left: 3 },
							() => h(Text, null, () => 'X'),
						),
				),
		});
		const out = await renderToString(Demo, { columns: 20 });
		const lines = out.split('\n');
		expect(lines[2]).toBe('   X');
	});

	it('supports percent strings for offset values', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{ position: 'relative', width: 10, height: 4 },
					() =>
						h(
							Box,
							{ position: 'absolute', top: '50%', left: '50%' },
							() => h(Text, null, () => 'M'),
						),
				),
		});
		const out = await renderToString(Demo, { columns: 20 });
		const lines = out.split('\n');
		expect(lines[2]).toBe('     M');
	});

	it('positions absolute via bottom/right offsets', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{ position: 'relative', width: 10, height: 4 },
					() =>
						h(
							Box,
							{ position: 'absolute', bottom: 0, right: 0 },
							() => h(Text, null, () => 'Y'),
						),
				),
		});
		const out = await renderToString(Demo, { columns: 20 });
		const lines = out.split('\n');
		expect(lines[3]).toBe('         Y');
	});

	it('static position is accepted and renders normally in flow', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{ flexDirection: 'column' },
					() => [
						h(Box, { position: 'static' }, () => h(Text, null, () => 'a')),
						h(Box, { position: 'static' }, () => h(Text, null, () => 'b')),
					],
				),
		});
		const out = await renderToString(Demo, { columns: 10 });
		expect(out).toBe('a\nb');
	});
});
