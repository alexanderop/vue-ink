import { describe, it, expect } from 'vitest';
import { h } from 'vue';
import { Box, Text, Newline, Spacer, Transform } from '../../src/index.ts';
import { frame } from './helpers.ts';

// Ported from repos/ink/test/components.tsx (subset).

describe('text composition', () => {
	it('plain text', () => {
		expect(frame(() => h(Text, null, () => 'Hello World'))).toBe('Hello World');
	});

	it('text with variable interpolation', () => {
		expect(frame(() => h(Text, null, () => `Count: ${1}`))).toBe('Count: 1');
	});

	it('multiple text fragments in a slot', () => {
		expect(frame(() => h(Text, null, () => ['Hello', ' World']))).toBe(
			'Hello World',
		);
	});

	it('text composed from nested <Text>', () => {
		expect(
			frame(() =>
				h(Text, null, () => ['Hello ', h(Text, null, () => 'World')]),
			),
		).toBe('Hello World');
	});
});

describe('text wrapping', () => {
	it('soft wrap fits within width', () => {
		const output = frame(() =>
			h(Box, { width: 7 }, () =>
				h(Text, { wrap: 'wrap' }, () => 'Hello World'),
			),
		);
		expect(output).toBe('Hello\nWorld');
	});

	it('does not wrap when there is enough space', () => {
		const output = frame(() =>
			h(Box, { width: 20 }, () =>
				h(Text, { wrap: 'wrap' }, () => 'Hello World'),
			),
		);
		expect(output).toBe('Hello World');
	});

	it('hard wrap breaks at width boundary', () => {
		const output = frame(() =>
			h(Box, { width: 7 }, () =>
				h(Text, { wrap: 'hard' }, () => 'Hello World'),
			),
		);
		expect(output).toBe('Hello W\norld');
	});

	it('hard wrap with long word', () => {
		const output = frame(() =>
			h(Box, { width: 5 }, () =>
				h(Text, { wrap: 'hard' }, () => 'aaaaaaaaaa'),
			),
		);
		expect(output).toBe('aaaaa\naaaaa');
	});

	it('does not hard wrap when there is enough space', () => {
		const output = frame(() =>
			h(Box, { width: 20 }, () =>
				h(Text, { wrap: 'hard' }, () => 'Hello World'),
			),
		);
		expect(output).toBe('Hello World');
	});

	it('truncate text in the end', () => {
		const output = frame(() =>
			h(Box, { width: 7 }, () =>
				h(Text, { wrap: 'truncate' }, () => 'Hello World'),
			),
		);
		expect(output).toBe('Hello …');
	});

	it('truncate text in the middle', () => {
		const output = frame(() =>
			h(Box, { width: 7 }, () =>
				h(Text, { wrap: 'truncate-middle' }, () => 'Hello World'),
			),
		);
		expect(output).toBe('Hel…rld');
	});

	it('truncate text in the beginning', () => {
		const output = frame(() =>
			h(Box, { width: 7 }, () =>
				h(Text, { wrap: 'truncate-start' }, () => 'Hello World'),
			),
		);
		expect(output).toBe('… World');
	});
});

describe('<Newline>', () => {
	it('single newline', () => {
		const output = frame(() =>
			h(Text, null, () => ['Hello', h(Newline), 'World']),
		);
		expect(output).toBe('Hello\nWorld');
	});

	it('multiple newlines via count', () => {
		const output = frame(() =>
			h(Text, null, () => ['Hello', h(Newline, { count: 2 }), 'World']),
		);
		expect(output).toBe('Hello\n\nWorld');
	});
});

describe('<Spacer>', () => {
	it('horizontal spacer fills row', () => {
		const output = frame(() =>
			h(Box, { width: 20 }, () => [
				h(Text, null, () => 'Left'),
				h(Spacer),
				h(Text, null, () => 'Right'),
			]),
		);
		expect(output).toBe('Left           Right');
	});

	it('vertical spacer fills column', () => {
		const output = frame(() =>
			h(Box, { flexDirection: 'column', height: 6 }, () => [
				h(Text, null, () => 'Top'),
				h(Spacer),
				h(Text, null, () => 'Bottom'),
			]),
		);
		expect(output).toBe('Top\n\n\n\n\nBottom');
	});
});

describe('<Transform>', () => {
	it('transforms children with index', () => {
		const output = frame(() =>
			h(
				Transform,
				{
					transform: (str: string, index: number) =>
						`[${index}: ${str}]`,
				},
				() =>
					h(Text, null, () =>
						h(
							Transform,
							{
								transform: (str: string, index: number) =>
									`{${index}: ${str}}`,
							},
							() => h(Text, null, () => 'test'),
						),
					),
			),
		);
		expect(output).toBe('[0: {0: test}]');
	});

	it('applies transform across multiple lines', () => {
		const output = frame(() =>
			h(
				Transform,
				{
					transform: (str: string, index: number) =>
						`[${index}: ${str}]`,
				},
				() => h(Text, null, () => 'hello world\ngoodbye world'),
			),
		);
		expect(output).toBe('[0: hello world]\n[1: goodbye world]');
	});

	it('<Transform> with empty children renders empty', () => {
		const output = frame(() => h(Transform, { transform: (s: string) => s }));
		expect(output).toBe('');
	});
});
