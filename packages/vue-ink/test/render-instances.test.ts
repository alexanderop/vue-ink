import { describe, it, expect, vi } from 'vitest';
import { h, defineComponent } from 'vue';
import stripAnsi from 'strip-ansi';
import { render, Text } from '../src/index.ts';
import { createCaptureStream, flush } from './helpers.ts';

describe('render() instance registry', () => {
	it('returns the same instance when render() is called twice for the same stdout', async () => {
		const stdout = createCaptureStream(20);
		const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

		const First = defineComponent({ setup: () => () => h(Text, null, () => 'first') });
		const Second = defineComponent({ setup: () => () => h(Text, null, () => 'second') });

		const a = render(First, { stdout, interactive: true });
		await flush();
		const b = render(Second, { stdout, interactive: true });
		await flush();

		expect(b).toBe(a);
		const warning = stderrSpy.mock.calls.find(([msg]) =>
			typeof msg === 'string' && msg.toLowerCase().includes('warning'),
		);
		expect(warning).toBeTruthy();

		const finalFrame = stripAnsi(stdout.frames.at(-1) ?? '');
		expect(finalFrame).toContain('second');

		a.unmount();
		stderrSpy.mockRestore();
	});

	it('does not warn when render() is called after a normal unmount()', async () => {
		const stdout = createCaptureStream(20);
		const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

		const App = defineComponent({ setup: () => () => h(Text, null, () => 'y') });
		const a = render(App, { stdout });
		await flush();
		a.unmount();

		const b = render(App, { stdout });
		await flush();

		const warning = stderrSpy.mock.calls.find(([msg]) =>
			typeof msg === 'string' && msg.toLowerCase().includes('warning'),
		);
		expect(warning).toBeFalsy();
		expect(b).not.toBe(a);

		b.unmount();
		stderrSpy.mockRestore();
	});
});
