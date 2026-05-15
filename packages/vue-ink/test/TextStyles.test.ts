import { describe, it, expect } from 'vitest';
import { h, defineComponent } from 'vue';
import { Text, Transform } from '../src/index.ts';
import { renderToStringRaw, renderToString } from './helpers.ts';

describe('Text styles (branch coverage for remaining flags)', () => {
	it('applies italic', async () => {
		const Demo = defineComponent({
			setup: () => () => h(Text, { italic: true }, () => 'i'),
		});
		const raw = await renderToStringRaw(Demo, { columns: 10 });
		// Italic = SGR 3.
		expect(raw).toMatch(/\x1b\[3m.*i.*\x1b\[23m/);
	});

	it('applies underline', async () => {
		const Demo = defineComponent({
			setup: () => () => h(Text, { underline: true }, () => 'u'),
		});
		const raw = await renderToStringRaw(Demo, { columns: 10 });
		expect(raw).toMatch(/\x1b\[4m.*u.*\x1b\[24m/);
	});

	it('applies strikethrough', async () => {
		const Demo = defineComponent({
			setup: () => () => h(Text, { strikethrough: true }, () => 's'),
		});
		const raw = await renderToStringRaw(Demo, { columns: 10 });
		expect(raw).toMatch(/\x1b\[9m.*s.*\x1b\[29m/);
	});

	it('applies inverse', async () => {
		const Demo = defineComponent({
			setup: () => () => h(Text, { inverse: true }, () => 'v'),
		});
		const raw = await renderToStringRaw(Demo, { columns: 10 });
		expect(raw).toMatch(/\x1b\[7m.*v.*\x1b\[27m/);
	});

	it('renders an empty <Text> with no slot', async () => {
		const Demo = defineComponent({
			setup: () => () => h(Text),
		});
		const out = await renderToString(Demo, { columns: 10 });
		expect(out).toBe('');
	});
});

describe('Transform edge cases', () => {
	it('returns null when there are no children', async () => {
		const Demo = defineComponent({
			setup: () => () => h(Transform, { transform: (s: string) => s.toUpperCase() }),
		});
		const out = await renderToString(Demo, { columns: 10 });
		expect(out).toBe('');
	});
});
