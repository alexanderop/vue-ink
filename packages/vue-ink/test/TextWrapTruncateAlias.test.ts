import { describe, it, expect } from 'vitest';
import { h, defineComponent } from 'vue';
import { Box, Text } from '../src/index.ts';
import { renderToString } from './helpers.ts';

// `wrap="truncate"` is documented as a shorthand for `wrap="truncate-end"`.
// The existing WrapText suite only exercises the long names, so this file
// pins the alias.

describe('Text wrap "truncate" alias', () => {
	it('truncate alias behaves identically to truncate-end for a long word', async () => {
		const Alias = defineComponent({
			setup: () => () =>
				h(Box, { width: 6 }, () =>
					h(Text, { wrap: 'truncate' }, () => 'helloworld'),
				),
		});
		const Full = defineComponent({
			setup: () => () =>
				h(Box, { width: 6 }, () =>
					h(Text, { wrap: 'truncate-end' }, () => 'helloworld'),
				),
		});

		const aliasOut = await renderToString(Alias, { columns: 20 });
		const fullOut = await renderToString(Full, { columns: 20 });
		expect(aliasOut).toBe(fullOut);
		expect(aliasOut.endsWith('…')).toBe(true);
		expect(aliasOut.length).toBeLessThanOrEqual(6);
	});

	it('truncate alias matches truncate-end with surrounding spaces', async () => {
		const Alias = defineComponent({
			setup: () => () =>
				h(Box, { width: 8 }, () =>
					h(Text, { wrap: 'truncate' }, () => 'hello world program'),
				),
		});
		const Full = defineComponent({
			setup: () => () =>
				h(Box, { width: 8 }, () =>
					h(Text, { wrap: 'truncate-end' }, () => 'hello world program'),
				),
		});

		const aliasOut = await renderToString(Alias, { columns: 20 });
		const fullOut = await renderToString(Full, { columns: 20 });
		expect(aliasOut).toBe(fullOut);
	});
});
