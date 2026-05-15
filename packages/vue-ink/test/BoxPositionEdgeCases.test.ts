import { describe, it, expect } from 'vitest';
import { h, defineComponent } from 'vue';
import { Box, Text } from '../src/index.ts';
import { renderToString } from './helpers.ts';

describe('Box position/sizing edge cases', () => {
	it('absolute child overlays a flex sibling without consuming row space', async () => {
		// The flexGrow Text fills the row; the absolutely-positioned Text is
		// taken out of normal flow and pinned to top:0 left:0, so it overlays
		// the start of the flex sibling but doesn't shrink it.
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{
						position: 'relative',
						width: 12,
						flexDirection: 'row',
						justifyContent: 'flex-end',
					},
					() => [
						h(
							Box,
							{ position: 'absolute', top: 0, left: 0 },
							() => h(Text, null, () => 'AB'),
						),
						h(Text, null, () => 'XY'),
					],
				),
		});
		const out = await renderToString(Demo, { columns: 20 });
		const firstLine = out.split('\n')[0] ?? '';
		// Absolute child paints at column 0, justify-flex-end pushes 'XY' to
		// the right edge of the 12-wide parent.
		expect(firstLine.startsWith('AB')).toBe(true);
		expect(firstLine.endsWith('XY')).toBe(true);
	});

	it('percentage width/height computes against fixed-size parent', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{ width: 20, height: 6, flexDirection: 'column' },
					() =>
						h(
							Box,
							{
								width: '50%',
								height: '50%',
								borderStyle: 'single',
							},
							() => h(Text, null, () => 'x'),
						),
				),
		});
		const out = await renderToString(Demo, { columns: 30 });
		const lines = out.split('\n');
		// 50% of 20 = 10 wide; 50% of 6 = 3 tall → top, content, bottom
		expect(lines[0]).toBe('┌────────┐');
		expect(lines[1]).toBe('│x       │');
		expect(lines[2]).toBe('└────────┘');
	});

	it('overflow: hidden clips a child wider than its parent', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{
						width: 5,
						overflow: 'hidden',
						flexDirection: 'row',
					},
					() =>
						h(Box, { width: 16, flexShrink: 0 }, () =>
							h(Text, null, () => 'ABCDEFGHIJ'),
						),
				),
		});
		const out = await renderToString(Demo, { columns: 20 });
		// Output is clipped to the 5-column parent; nothing past column 5.
		expect(out).toBe('ABCDE');
		expect(out).not.toContain('F');
		expect(out).not.toContain('J');
	});

	it('display: none removes the subtree from output', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { flexDirection: 'column' }, () => [
					h(Box, { display: 'none' }, () => h(Text, null, () => 'HIDDEN')),
					h(Text, null, () => 'visible'),
				]),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out).not.toContain('HIDDEN');
		expect(out).toContain('visible');
	});
});
