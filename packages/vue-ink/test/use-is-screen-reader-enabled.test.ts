import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { h, defineComponent, type Ref } from 'vue';
import { render, Text, useIsScreenReaderEnabled } from '../src/index.ts';
import { createCaptureStream, flush } from './helpers.ts';

describe('useIsScreenReaderEnabled()', () => {
	const originalEnv = process.env['INK_SCREEN_READER'];
	beforeEach(() => {
		delete process.env['INK_SCREEN_READER'];
	});
	afterEach(() => {
		if (originalEnv === undefined) delete process.env['INK_SCREEN_READER'];
		else process.env['INK_SCREEN_READER'] = originalEnv;
	});

	it('defaults to false', async () => {
		const stdout = createCaptureStream(20);
		let flag: Ref<boolean> | undefined;
		const App = defineComponent({
			setup() {
				flag = useIsScreenReaderEnabled();
				return () => h(Text, null, () => 'x');
			},
		});
		const instance = render(App, { stdout, interactive: true });
		await flush();
		expect(flag!.value).toBe(false);
		instance.unmount();
	});

	it('returns true when the option is set', async () => {
		const stdout = createCaptureStream(20);
		let flag: Ref<boolean> | undefined;
		const App = defineComponent({
			setup() {
				flag = useIsScreenReaderEnabled();
				return () => h(Text, null, () => 'x');
			},
		});
		const instance = render(App, {
			stdout,
			interactive: true,
			isScreenReaderEnabled: true,
		});
		await flush();
		expect(flag!.value).toBe(true);
		instance.unmount();
	});

	it('returns true when INK_SCREEN_READER=true', async () => {
		process.env['INK_SCREEN_READER'] = 'true';
		const stdout = createCaptureStream(20);
		let flag: Ref<boolean> | undefined;
		const App = defineComponent({
			setup() {
				flag = useIsScreenReaderEnabled();
				return () => h(Text, null, () => 'x');
			},
		});
		const instance = render(App, { stdout, interactive: true });
		await flush();
		expect(flag!.value).toBe(true);
		instance.unmount();
	});
});
