import { describe, it, expect } from 'vitest';
import {
	defineComponent,
	h,
	ref,
	useTemplateRef,
	computed,
	type Ref,
} from 'vue';
import stripAnsi from 'strip-ansi';
import { render } from '@vue-ink/testing-library';
import {
	Box,
	Text,
	useBoxMetrics,
	type BoxMetricsTarget,
} from '../../src/index.ts';

// Ported from repos/ink/test/use-box-metrics.tsx. The shape is the same as
// ink's tests (mount → assert lastFrame → mutate state → reassert) but we
// drive Vue through the testing-library, which already wires `debug: true`
// + `maxFps: Infinity` so each commit produces one full-frame write.
//
// `useBoxMetrics` lives on the layout-listener path: every paint fires
// `emitLayoutListeners`, which triggers a metrics re-read, which schedules
// a Vue re-render that lands in the very next frame. Tests rely on
// `waitUntilFlush()` to chase that two-frame ping-pong to settle.

const frameOf = (lastFrame: () => string | undefined): string =>
	stripAnsi(lastFrame() ?? '');

const settle = async (waitUntilFlush: () => Promise<void>): Promise<void> => {
	// Initial render produces frame 1 (zeros). The layout listener fires,
	// flips hasMeasured / writes metrics, and Vue schedules frame 2 on the
	// next tick. Two flushes guarantee both frames land before assertions.
	await waitUntilFlush();
	await waitUntilFlush();
};

describe('use-box-metrics', () => {
	it('returns correct size on first render', async () => {
		const Test = defineComponent({
			setup() {
				const boxRef = useTemplateRef<BoxMetricsTarget>('box');
				const { width, height } = useBoxMetrics(boxRef);
				return () =>
					h(Box, { ref: 'box' }, () =>
						h(Text, null, () => `${width.value}x${height.value}`),
					);
			},
		});

		const { lastFrame, waitUntilFlush, unmount } = render(Test);
		await settle(waitUntilFlush);
		// Width fills terminal (testing-library default 100); height = 1 line.
		expect(frameOf(lastFrame)).toContain('100x1');
		unmount();
	});

	it('returns correct position', async () => {
		const Test = defineComponent({
			setup() {
				const boxRef = useTemplateRef<BoxMetricsTarget>('box');
				const { left, top } = useBoxMetrics(boxRef);
				return () =>
					h(Box, { flexDirection: 'column' }, () => [
						h(Text, null, () => 'first line'),
						h(Box, { ref: 'box', marginLeft: 5 }, () =>
							h(Text, null, () => `${left.value},${top.value}`),
						),
					]);
			},
		});

		const { lastFrame, waitUntilFlush, unmount } = render(Test);
		await settle(waitUntilFlush);
		expect(frameOf(lastFrame)).toContain('5,1');
		unmount();
	});

	it('updates when terminal is resized', async () => {
		const Test = defineComponent({
			setup() {
				const boxRef = useTemplateRef<BoxMetricsTarget>('box');
				const { width } = useBoxMetrics(boxRef);
				return () =>
					h(Box, { ref: 'box' }, () =>
						h(Text, null, () => `Width: ${width.value}`),
					);
			},
		});

		const { lastFrame, stdout, waitUntilFlush, unmount } = render(Test);
		await settle(waitUntilFlush);
		expect(frameOf(lastFrame)).toContain('Width: 100');

		stdout.columns = 60;
		stdout.emit('resize');
		await settle(waitUntilFlush);
		expect(frameOf(lastFrame)).toContain('Width: 60');
		unmount();
	});

	it('uses latest tracked ref when terminal is resized', async () => {
		const trackSecond = ref(false);
		const Test = defineComponent({
			setup() {
				const firstRef = useTemplateRef<BoxMetricsTarget>('first');
				const secondRef = useTemplateRef<BoxMetricsTarget>('second');
				const tracked = computed(() =>
					trackSecond.value ? secondRef.value : firstRef.value,
				);
				const { height } = useBoxMetrics(tracked);
				return () =>
					h(Box, { flexDirection: 'column' }, () => [
						h(Box, { ref: 'first' }, () => h(Text, null, () => 'short')),
						h(Box, { ref: 'second' }, () =>
							h(
								Text,
								null,
								() =>
									'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
							),
						),
						h(Text, null, () => `Tracked height: ${height.value}`),
					]);
			},
		});

		const { lastFrame, stdout, waitUntilFlush, unmount } = render(Test);
		await settle(waitUntilFlush);
		expect(frameOf(lastFrame)).toContain('Tracked height: 1');

		trackSecond.value = true;
		await settle(waitUntilFlush);
		// At 100 cols the long string still fits on one line.
		expect(frameOf(lastFrame)).toContain('Tracked height: 1');

		stdout.columns = 20;
		stdout.emit('resize');
		await settle(waitUntilFlush);
		expect(frameOf(lastFrame)).toContain('Tracked height: 4');
		unmount();
	});

	it('updates when sibling content changes', async () => {
		const siblingText = ref('short');
		const Test = defineComponent({
			setup() {
				const boxRef = useTemplateRef<BoxMetricsTarget>('box');
				const { height } = useBoxMetrics(boxRef);
				return () =>
					h(Box, { flexDirection: 'column' }, () => [
						h(Box, { ref: 'box', flexDirection: 'column' }, () =>
							h(Text, null, () => siblingText.value),
						),
						h(Text, null, () => `Height: ${height.value}`),
					]);
			},
		});

		const { lastFrame, waitUntilFlush, unmount } = render(Test);
		await settle(waitUntilFlush);
		expect(frameOf(lastFrame)).toContain('Height: 1');

		siblingText.value = 'line 1\nline 2\nline 3';
		await settle(waitUntilFlush);
		expect(frameOf(lastFrame)).toContain('Height: 3');
		unmount();
	});

	it('returns zeros when ref is not attached', async () => {
		const Test = defineComponent({
			setup() {
				const detachedRef: Ref<BoxMetricsTarget> = ref(null);
				const { width, height, left, top, hasMeasured } =
					useBoxMetrics(detachedRef);
				return () =>
					h(Box, null, () =>
						h(
							Text,
							null,
							() =>
								`${width.value},${height.value},${left.value},${top.value},${String(hasMeasured.value)}`,
						),
					);
			},
		});

		const { lastFrame, waitUntilFlush, unmount } = render(Test);
		await settle(waitUntilFlush);
		expect(frameOf(lastFrame)).toContain('0,0,0,0,false');
		unmount();
	});

	it('hasMeasured becomes true when tracked element is mounted on initial render', async () => {
		const Test = defineComponent({
			setup() {
				const boxRef = useTemplateRef<BoxMetricsTarget>('box');
				const { hasMeasured } = useBoxMetrics(boxRef);
				return () =>
					h(Box, { ref: 'box' }, () =>
						h(
							Text,
							null,
							() => `Has measured: ${String(hasMeasured.value)}`,
						),
					);
			},
		});

		const { lastFrame, waitUntilFlush, unmount } = render(Test);
		await settle(waitUntilFlush);
		expect(frameOf(lastFrame)).toContain('Has measured: true');
		unmount();
	});

	it('hasMeasured resets when tracked ref switches to a detached element', async () => {
		const trackSecond = ref(false);
		const mountSecond = ref(false);
		const Test = defineComponent({
			setup() {
				const firstRef = useTemplateRef<BoxMetricsTarget>('first');
				const secondRef = useTemplateRef<BoxMetricsTarget>('second');
				const tracked = computed(() =>
					trackSecond.value ? secondRef.value : firstRef.value,
				);
				const { hasMeasured } = useBoxMetrics(tracked);
				return () =>
					h(Box, { flexDirection: 'column' }, () => [
						h(Box, { ref: 'first' }, () => h(Text, null, () => 'First')),
						mountSecond.value
							? h(Box, { ref: 'second' }, () =>
									h(Text, null, () => 'Second'),
								)
							: null,
						h(
							Text,
							null,
							() => `Has measured: ${String(hasMeasured.value)}`,
						),
					]);
			},
		});

		const { lastFrame, waitUntilFlush, unmount } = render(Test);
		await settle(waitUntilFlush);
		expect(frameOf(lastFrame)).toContain('Has measured: true');

		trackSecond.value = true;
		await settle(waitUntilFlush);
		expect(frameOf(lastFrame)).toContain('Has measured: false');

		mountSecond.value = true;
		await settle(waitUntilFlush);
		expect(frameOf(lastFrame)).toContain('Has measured: true');
		unmount();
	});

	it('hasMeasured becomes true after the tracked element is measured', async () => {
		const mounted = ref(false);
		const Test = defineComponent({
			setup() {
				const boxRef = useTemplateRef<BoxMetricsTarget>('box');
				const { hasMeasured } = useBoxMetrics(boxRef);
				return () =>
					h(Box, { flexDirection: 'column' }, () => [
						mounted.value
							? h(Box, { ref: 'box' }, () =>
									h(Text, null, () => 'Tracked'),
								)
							: null,
						h(
							Text,
							null,
							() => `Has measured: ${String(hasMeasured.value)}`,
						),
					]);
			},
		});

		const { lastFrame, waitUntilFlush, unmount } = render(Test);
		await settle(waitUntilFlush);
		expect(frameOf(lastFrame)).toContain('Has measured: false');

		mounted.value = true;
		await settle(waitUntilFlush);
		expect(frameOf(lastFrame)).toContain('Has measured: true');
		unmount();
	});

	it('resets metrics when tracked element unmounts', async () => {
		const mounted = ref(true);
		const Test = defineComponent({
			setup() {
				const boxRef = useTemplateRef<BoxMetricsTarget>('box');
				const { width, height, left, top, hasMeasured } =
					useBoxMetrics(boxRef);
				return () =>
					h(Box, { flexDirection: 'column' }, () => [
						mounted.value
							? h(Box, { ref: 'box', width: 10 }, () =>
									h(Text, null, () => '1234567890'),
								)
							: null,
						h(
							Text,
							null,
							() =>
								`Metrics: ${width.value},${height.value},${left.value},${top.value},${String(hasMeasured.value)}`,
						),
					]);
			},
		});

		const { lastFrame, waitUntilFlush, unmount } = render(Test);
		await settle(waitUntilFlush);
		expect(frameOf(lastFrame)).toContain('Metrics: 10,1,0,0,true');

		mounted.value = false;
		await settle(waitUntilFlush);
		expect(frameOf(lastFrame)).toContain('Metrics: 0,0,0,0,false');
		unmount();
	});

	it('removes resize listener on unmount', async () => {
		const Test = defineComponent({
			setup() {
				const boxRef = useTemplateRef<BoxMetricsTarget>('box');
				useBoxMetrics(boxRef);
				return () =>
					h(Box, { ref: 'box' }, () => h(Text, null, () => 'Hello'));
			},
		});

		const { stdout, waitUntilFlush, unmount } = render(Test);
		await settle(waitUntilFlush);
		// Mounted: at least useBoxMetrics's own listener is attached. The
		// renderer also attaches one for its own resize handling — both must
		// detach on unmount.
		expect(stdout.listenerCount('resize')).toBeGreaterThanOrEqual(1);

		unmount();
		expect(stdout.listenerCount('resize')).toBe(0);
	});

	it('does not crash when resize fires after unmount', async () => {
		const Test = defineComponent({
			setup() {
				const boxRef = useTemplateRef<BoxMetricsTarget>('box');
				useBoxMetrics(boxRef);
				return () =>
					h(Box, { ref: 'box' }, () => h(Text, null, () => 'Hello'));
			},
		});

		const { stdout, waitUntilFlush, unmount } = render(Test);
		await settle(waitUntilFlush);
		unmount();

		expect(() => {
			stdout.emit('resize');
		}).not.toThrow();
	});
});
