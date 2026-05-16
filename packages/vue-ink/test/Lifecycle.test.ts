import { describe, it, expect, vi } from 'vitest';
import { h, defineComponent, onMounted, ref } from 'vue';
import Yoga from 'yoga-layout';
import stripAnsi from 'strip-ansi';
import { render, Box, Text, useApp } from '../src/index.ts';
import { createCaptureStream, flush } from './helpers.ts';

describe('comments are invisible', () => {
	it('renders no spurious whitespace from v-if comment anchors', async () => {
		const stdout = createCaptureStream(20);
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { flexDirection: 'column' }, () => [
					h(Text, null, () => 'a'),
					// v-if anchor: a falsy slot child renders as a comment vnode
					false,
					h(Text, null, () => 'b'),
				]),
		});
		const instance = render(Demo, { stdout, interactive: true });
		await flush();
		const out = stripAnsi(stdout.frames.join('')).replace(/\n+$/, '');
		instance.unmount();
		expect(out).toBe('a\nb');
	});
});

describe('rerender preserves component state', () => {
	it('keeps the same root instance when rerender is called with the same component', async () => {
		const stdout = createCaptureStream(20);
		const counter = ref(0);
		const App = defineComponent({
			setup: () => () => h(Text, null, () => `n=${counter.value}`),
		});

		const instance = render(App, { stdout, interactive: true });
		await flush();

		counter.value = 1;
		instance.rerender(App);
		await flush();

		counter.value = 2;
		await flush();

		const frames = stdout.frames.map((f) => stripAnsi(f).trim()).filter(Boolean);
		instance.unmount();

		// state survives rerender: we see n=2 after the rerender swap
		expect(frames.at(-1)).toContain('n=2');
	});
});

describe('resize triggers a re-layout', () => {
	it('produces a new frame when columns change', async () => {
		const stdout = createCaptureStream(10);
		const Demo = defineComponent({
			setup: () => () => h(Box, { width: '100%' }, () => h(Text, null, () => 'X')),
		});
		const instance = render(Demo, { stdout, interactive: true });
		await flush();
		const before = stdout.frames.length;

		stdout.columns = 30;
		stdout.emit('resize');
		await flush();

		instance.unmount();
		expect(stdout.frames.length).toBeGreaterThan(before);
	});
});

// Ported from repos/ink/test/exit.tsx. Ink runs these through node-pty
// fixtures; vue-ink can call `useApp().exit(...)` directly inside a mounted
// component and assert on `waitUntilExit()`'s settlement, no subprocess.
describe('exit() and waitUntilExit() — exit value forwarding', () => {
	const mountWithExit = (exitArg: () => unknown): ReturnType<typeof render> => {
		const stdout = createCaptureStream(20);
		const App = defineComponent({
			setup() {
				const app = useApp();
				onMounted(() => {
					app.exit(exitArg());
				});
				return () => h(Text, null, () => 'frame');
			},
		});
		return render(App, { stdout, interactive: true });
	};

	it('exit() with no args resolves waitUntilExit() with undefined', async () => {
		const instance = mountWithExit(() => undefined);
		await expect(instance.waitUntilExit()).resolves.toBeUndefined();
	});

	it('exit(value) forwards the value through waitUntilExit()', async () => {
		const instance = mountWithExit(() => 'hello from vue-ink');
		await expect(instance.waitUntilExit()).resolves.toBe('hello from vue-ink');
	});

	it('exit(object) forwards the object identity through waitUntilExit()', async () => {
		const payload = { hello: 'from vue-ink object' };
		const instance = mountWithExit(() => payload);
		await expect(instance.waitUntilExit()).resolves.toBe(payload);
	});

	it('exit(error) rejects waitUntilExit() with the error', async () => {
		const boom = new Error('boom');
		const instance = mountWithExit(() => boom);
		await expect(instance.waitUntilExit()).rejects.toBe(boom);
	});

	it('unmount() without an explicit exit() resolves waitUntilExit() with undefined', async () => {
		const stdout = createCaptureStream(20);
		const App = defineComponent({
			setup: () => () => h(Text, null, () => 'frame'),
		});
		const instance = render(App, { stdout, interactive: true });
		await flush();
		instance.unmount();
		await expect(instance.waitUntilExit()).resolves.toBeUndefined();
	});

	it('exit() after unmount() is a no-op (idempotent)', async () => {
		const stdout = createCaptureStream(20);
		let captured: ReturnType<typeof useApp> | undefined;
		const App = defineComponent({
			setup() {
				captured = useApp();
				return () => h(Text, null, () => 'frame');
			},
		});
		const instance = render(App, { stdout, interactive: true });
		await flush();
		instance.unmount();
		// Should not throw, should not re-trigger any teardown side-effects.
		expect(() => captured!.exit(new Error('late'))).not.toThrow();
		await expect(instance.waitUntilExit()).resolves.toBeUndefined();
	});

	it('exit() twice keeps the first resolution (idempotent)', async () => {
		const stdout = createCaptureStream(20);
		const App = defineComponent({
			setup() {
				const app = useApp();
				onMounted(() => {
					app.exit('first');
					app.exit('second');
					app.exit(new Error('late error'));
				});
				return () => h(Text, null, () => 'frame');
			},
		});
		const instance = render(App, { stdout, interactive: true });
		await expect(instance.waitUntilExit()).resolves.toBe('first');
	});

	it('exit(error) followed by exit(value) still rejects (error wins)', async () => {
		const stdout = createCaptureStream(20);
		const boom = new Error('first-error');
		const App = defineComponent({
			setup() {
				const app = useApp();
				onMounted(() => {
					app.exit(boom);
					app.exit('ignored');
				});
				return () => h(Text, null, () => 'frame');
			},
		});
		const instance = render(App, { stdout, interactive: true });
		await expect(instance.waitUntilExit()).rejects.toBe(boom);
	});

	it('waitUntilExit() can be called multiple times and settles each caller', async () => {
		const stdout = createCaptureStream(20);
		const App = defineComponent({
			setup() {
				const app = useApp();
				onMounted(() => {
					app.exit('shared');
				});
				return () => h(Text, null, () => 'frame');
			},
		});
		const instance = render(App, { stdout, interactive: true });
		const [a, b] = await Promise.all([instance.waitUntilExit(), instance.waitUntilExit()]);
		expect(a).toBe('shared');
		expect(b).toBe('shared');
	});
});

describe('yoga cleanup on unmount', () => {
	it('frees the yoga subtree so leftover handles cannot keep accumulating', async () => {
		// Yoga nodes inherit from a per-instance class — easiest cross-version
		// way to count live handles is to snapshot a created node's proto and
		// confirm freeRecursive is called when we unmount.
		const probe = Yoga.Node.create();
		const proto = Object.getPrototypeOf(probe) as {
			freeRecursive: (this: unknown) => void;
		};
		const spy = vi.spyOn(proto, 'freeRecursive');
		probe.freeRecursive(); // baseline call so spy is wired correctly
		const baseline = spy.mock.calls.length;

		const stdout = createCaptureStream(20);
		const Demo = defineComponent({
			setup: () => () => h(Text, null, () => 'hi'),
		});
		const instance = render(Demo, { stdout });
		await flush();
		instance.unmount();

		expect(spy.mock.calls.length).toBeGreaterThan(baseline);
		spy.mockRestore();
	});
});
