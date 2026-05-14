import { describe, it, expect } from 'vitest';
import { h, defineComponent } from 'vue';
import { Box, Text, Spacer } from '../src/index.ts';
import { renderToString } from './helpers.ts';

describe('Spacer', () => {
	it('pushes its two siblings to opposite edges in a fixed-width row', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { width: 10, flexDirection: 'row' }, () => [
					h(Text, null, () => 'L'),
					h(Spacer),
					h(Text, null, () => 'R'),
				]),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out).toBe('L        R');
	});
});
