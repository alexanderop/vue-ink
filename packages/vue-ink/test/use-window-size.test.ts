import { describe, it, expect } from 'vitest';
import { h, defineComponent, type Ref } from 'vue';
import { render, Text, useWindowSize } from '../src/index.ts';
import { createCaptureStream, flush } from './helpers.ts';

describe('useWindowSize()', () => {
	it('returns the initial dimensions from stdout', async () => {
		const stdout = createCaptureStream(42);
		(stdout as unknown as { rows: number }).rows = 17;
		let size: Ref<{ columns: number; rows: number }> | undefined;
		const App = defineComponent({
			setup() {
				size = useWindowSize();
				return () => h(Text, null, () => 'x');
			},
		});
		const instance = render(App, { stdout, interactive: true });
		await flush();
		expect(size!.value).toEqual({ columns: 42, rows: 17 });
		instance.unmount();
	});

	it('falls back to 80x24 when stdout has no dimensions', async () => {
		const stdout = createCaptureStream(80);
		Object.defineProperty(stdout, 'columns', { value: undefined, configurable: true });
		Object.defineProperty(stdout, 'rows', { value: undefined, configurable: true });
		let size: Ref<{ columns: number; rows: number }> | undefined;
		const App = defineComponent({
			setup() {
				size = useWindowSize();
				return () => h(Text, null, () => 'x');
			},
		});
		const instance = render(App, { stdout, interactive: true });
		await flush();
		expect(size!.value).toEqual({ columns: 80, rows: 24 });
		instance.unmount();
	});

	it('updates reactively when stdout emits resize', async () => {
		const stdout = createCaptureStream(20);
		(stdout as unknown as { rows: number }).rows = 10;
		let size: Ref<{ columns: number; rows: number }> | undefined;
		const App = defineComponent({
			setup() {
				size = useWindowSize();
				return () => h(Text, null, () => 'x');
			},
		});
		const instance = render(App, { stdout, interactive: true });
		await flush();
		expect(size!.value.columns).toBe(20);

		stdout.columns = 100;
		(stdout as unknown as { rows: number }).rows = 30;
		stdout.emit('resize');
		await flush();

		expect(size!.value).toEqual({ columns: 100, rows: 30 });
		instance.unmount();
	});

	it('detaches the resize listener on unmount', async () => {
		const stdout = createCaptureStream(20);
		const App = defineComponent({
			setup() {
				useWindowSize();
				return () => h(Text, null, () => 'x');
			},
		});
		const instance = render(App, { stdout, interactive: true });
		await flush();
		const before = stdout.listenerCount('resize');
		instance.unmount();
		expect(stdout.listenerCount('resize')).toBeLessThan(before);
	});
});
