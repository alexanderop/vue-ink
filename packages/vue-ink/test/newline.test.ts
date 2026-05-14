import { describe, it, expect } from 'vitest';
import { h, defineComponent } from 'vue';
import { Text, Newline } from '../src/index.ts';
import { renderToString } from './helpers.ts';

describe('Newline', () => {
	it('inserts one newline between siblings inside <Text>', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Text, null, () => ['a', h(Newline), 'b']),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out).toBe('a\nb');
	});

	it('count=3 inserts three newlines', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Text, null, () => ['a', h(Newline, { count: 3 }), 'b']),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out).toBe('a\n\n\nb');
	});
});
