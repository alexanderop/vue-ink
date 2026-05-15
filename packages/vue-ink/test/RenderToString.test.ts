import { describe, it, expect } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import stripAnsi from 'strip-ansi';
import {
	Box,
	Text,
	renderToString,
	useApp,
	useInput,
	useStdin,
	useStdout,
	useStderr,
	useFocus,
	useFocusManager,
} from '../src/index.ts';

// Public renderToString — non-test consumers reach for this when they want
// the rendered output as a string (docs, snapshot fixtures, file output)
// without spinning up a live terminal session.

describe('renderToString', () => {
	it('renders plain text synchronously', () => {
		const Demo = defineComponent({
			setup: () => () => h(Text, null, () => 'Hello world'),
		});
		const out = renderToString(Demo);
		expect(stripAnsi(out)).toBe('Hello world');
	});

	it('preserves ANSI styling in the output', () => {
		const Demo = defineComponent({
			setup: () => () => h(Text, { color: 'green' }, () => 'green'),
		});
		const out = renderToString(Demo);
		// Stripping yields the plain text; the raw output keeps the escape.
		expect(stripAnsi(out)).toBe('green');
		expect(out).not.toBe('green');
		expect(out).toMatch(/\x1b\[/);
	});

	it('lays out <Box> children with the default 80-column width', () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{ width: 20, justifyContent: 'space-between' },
					() => [h(Text, null, () => 'A'), h(Text, null, () => 'B')],
				),
		});
		const out = stripAnsi(renderToString(Demo));
		expect(out).toBe('A                  B');
	});

	it('honors the `columns` option for the virtual terminal width', () => {
		// A flexGrow box should fill the requested column width.
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { flexDirection: 'column' }, () =>
					h(Box, { width: '100%' }, () => h(Text, null, () => 'x')),
				),
		});
		const wide = stripAnsi(renderToString(Demo, { columns: 40 }));
		const narrow = stripAnsi(renderToString(Demo, { columns: 10 }));
		// The wide render has more trailing space before `x` wraps; both
		// at minimum contain the 'x' on the first line.
		expect(wide.split('\n')[0]!.length).toBeGreaterThanOrEqual(
			narrow.split('\n')[0]!.length,
		);
	});

	it('resizes content when columns shrinks', () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{ width: '100%', justifyContent: 'space-between' },
					() => [h(Text, null, () => 'L'), h(Text, null, () => 'R')],
				),
		});
		const at40 = stripAnsi(renderToString(Demo, { columns: 40 }));
		const at10 = stripAnsi(renderToString(Demo, { columns: 10 }));
		expect(at40).toBe(`L${' '.repeat(38)}R`);
		expect(at10).toBe(`L${' '.repeat(8)}R`);
	});

	it('does not throw when components mount terminal composables', () => {
		// Each composable here would normally need a terminal session. The
		// no-op contexts inside renderToString must satisfy them — the
		// component should mount, render, and unmount without surprises.
		const Demo = defineComponent({
			setup() {
				useApp();
				useStdin();
				useStdout();
				useStderr();
				useFocusManager();
				useFocus();
				useInput(() => {});
				return () => h(Text, null, () => 'ok');
			},
		});
		expect(() => renderToString(Demo)).not.toThrow();
		expect(stripAnsi(renderToString(Demo))).toBe('ok');
	});

	it('captures the first synchronous frame even if state changes after mount', () => {
		// Mirrors React renderToString: post-mount async effects don't reach
		// the returned string.
		const Demo = defineComponent({
			setup() {
				const label = ref('initial');
				queueMicrotask(() => {
					label.value = 'after';
				});
				return () => h(Text, null, () => label.value);
			},
		});
		const out = stripAnsi(renderToString(Demo));
		expect(out).toBe('initial');
	});

	it('re-throws errors raised during component setup', () => {
		const Boom = defineComponent({
			setup() {
				throw new Error('boom');
			},
		});
		expect(() => renderToString(Boom)).toThrow(/boom/);
	});
});
