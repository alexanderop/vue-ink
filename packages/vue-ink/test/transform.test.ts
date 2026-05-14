import { describe, it, expect } from 'vitest';
import { h, defineComponent } from 'vue';
import { Text, Transform } from '../src/index.ts';
import { renderToString } from './helpers.ts';

describe('Transform', () => {
	it('uppercases its children string', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Transform, { transform: (s: string) => s.toUpperCase() }, () => 'hi'),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out).toBe('HI');
	});

	it('composes when nested (innermost runs first)', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Transform,
					{ transform: (s: string) => `${s}!` },
					() =>
						h(
							Transform,
							{ transform: (s: string) => s.toUpperCase() },
							() => 'hi',
						),
				),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out).toBe('HI!');
	});

	it('passes a per-line index to the transform', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Transform,
					{ transform: (line: string, i: number) => `${i}:${line}` },
					() => h(Text, null, () => 'a\nb'),
				),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out).toBe('0:a\n1:b');
	});
});
