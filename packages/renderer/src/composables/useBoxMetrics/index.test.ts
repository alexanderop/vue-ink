import { describe, it, expect } from 'vitest';
import { ref } from 'vue';
import {
	addLayoutListener,
	createNode,
	appendChildNode,
	emitLayoutListeners,
} from '@vue-ink/core';
import {
	createFakeStdout,
	fakeStdoutContext,
	withSetup,
} from '../_test/with-setup.ts';
import { useBoxMetrics, type BoxMetricsTarget } from './index.ts';

// Unit tests for `useBoxMetrics`. The behaviour tests in
// `packages/vue-ink/test/behavior/use-box-metrics.test.ts` cover the full
// path through the real renderer; these tests pin the contract at the
// composable's boundary (resolves both target shapes, listens to resize,
// climbs to ink-root, cleans up on dispose) without spinning Yoga up.

const makeRoot = () => {
	const root = createNode('ink-root');
	const box = createNode('ink-box');
	appendChildNode(root, box);
	return { root, box };
};

const exposeProxyFor = (
	element: ReturnType<typeof createNode> | null,
): { $element: ReturnType<typeof createNode> | null } => ({ $element: element });

// Force a fake "computed layout" onto a yoga node so we don't have to
// call calculateLayout (which requires the full Yoga env + sizing).
// useBoxMetrics only reads width/height/left/top; right/bottom are filled
// to satisfy yoga's Layout type without affecting the assertions.
const stubLayout = (
	yogaNode: NonNullable<ReturnType<typeof createNode>['yogaNode']>,
	layout: { width: number; height: number; left: number; top: number },
): void => {
	Object.assign(yogaNode, {
		getComputedLayout: () => ({ ...layout, right: 0, bottom: 0 }),
	});
};

describe('useBoxMetrics', () => {
	it('returns zero metrics and hasMeasured=false when ref is null', () => {
		const stdout = createFakeStdout(80);
		const target = ref<BoxMetricsTarget>(null);
		const { result, unmount } = withSetup(() => useBoxMetrics(target), {
			stdout: fakeStdoutContext(stdout),
		});
		expect(result.width.value).toBe(0);
		expect(result.height.value).toBe(0);
		expect(result.left.value).toBe(0);
		expect(result.top.value).toBe(0);
		expect(result.hasMeasured.value).toBe(false);
		unmount();
	});

	it('reads getComputedLayout when the ref points to an ink-box', () => {
		const stdout = createFakeStdout(80);
		const { box } = makeRoot();
		stubLayout(box.yogaNode!, { width: 12, height: 3, left: 2, top: 4 });

		const target = ref<BoxMetricsTarget>(box);
		const { result, unmount } = withSetup(() => useBoxMetrics(target), {
			stdout: fakeStdoutContext(stdout),
		});

		expect(result.width.value).toBe(12);
		expect(result.height.value).toBe(3);
		expect(result.left.value).toBe(2);
		expect(result.top.value).toBe(4);
		expect(result.hasMeasured.value).toBe(true);
		unmount();
	});

	it('unwraps Box.expose()-style { $element } refs', () => {
		const stdout = createFakeStdout(80);
		const { box } = makeRoot();
		stubLayout(box.yogaNode!, { width: 5, height: 1, left: 0, top: 0 });

		const target = ref<BoxMetricsTarget>(exposeProxyFor(box));
		const { result, unmount } = withSetup(() => useBoxMetrics(target), {
			stdout: fakeStdoutContext(stdout),
		});

		expect(result.width.value).toBe(5);
		expect(result.hasMeasured.value).toBe(true);
		unmount();
	});

	it('updates when the layout listener fires', () => {
		const stdout = createFakeStdout(80);
		const { root, box } = makeRoot();
		stubLayout(box.yogaNode!, { width: 10, height: 1, left: 0, top: 0 });

		const target = ref<BoxMetricsTarget>(box);
		const { result, unmount } = withSetup(() => useBoxMetrics(target), {
			stdout: fakeStdoutContext(stdout),
		});

		expect(result.width.value).toBe(10);

		stubLayout(box.yogaNode!, { width: 40, height: 2, left: 0, top: 0 });
		emitLayoutListeners(root);

		expect(result.width.value).toBe(40);
		expect(result.height.value).toBe(2);
		unmount();
	});

	it('updates on stdout `resize`', () => {
		const stdout = createFakeStdout(80);
		const { box } = makeRoot();
		stubLayout(box.yogaNode!, { width: 80, height: 1, left: 0, top: 0 });

		const target = ref<BoxMetricsTarget>(box);
		const { result, unmount } = withSetup(() => useBoxMetrics(target), {
			stdout: fakeStdoutContext(stdout),
		});

		expect(result.width.value).toBe(80);

		stubLayout(box.yogaNode!, { width: 40, height: 1, left: 0, top: 0 });
		stdout.emit('resize');

		expect(result.width.value).toBe(40);
		unmount();
	});

	it('keeps the same ShallowRef identity when the value does not change', () => {
		const stdout = createFakeStdout(80);
		const { root, box } = makeRoot();
		stubLayout(box.yogaNode!, { width: 10, height: 1, left: 0, top: 0 });

		const target = ref<BoxMetricsTarget>(box);
		const { result, unmount } = withSetup(() => useBoxMetrics(target), {
			stdout: fakeStdoutContext(stdout),
		});

		const widthRef = result.width;
		emitLayoutListeners(root);

		// Same identity (we didn't reassign), same value (no churn).
		expect(result.width).toBe(widthRef);
		expect(result.width.value).toBe(10);
		unmount();
	});

	it('reattaches the layout listener when the tracked ref switches', async () => {
		const stdout = createFakeStdout(80);
		const { root: rootA, box: boxA } = makeRoot();
		const { root: rootB, box: boxB } = makeRoot();
		stubLayout(boxA.yogaNode!, { width: 5, height: 1, left: 0, top: 0 });
		stubLayout(boxB.yogaNode!, { width: 20, height: 2, left: 1, top: 1 });

		const target = ref<BoxMetricsTarget>(boxA);
		const { result, flush, unmount } = withSetup(() => useBoxMetrics(target), {
			stdout: fakeStdoutContext(stdout),
		});
		expect(result.width.value).toBe(5);

		// Vue watchers flush on `nextTick`; mirror the production path where
		// users `await waitUntilFlush()` after a state change.
		target.value = boxB;
		await flush();
		expect(result.width.value).toBe(20);
		expect(result.height.value).toBe(2);

		// Firing the old root must not move the metrics anymore.
		stubLayout(boxA.yogaNode!, { width: 999, height: 999, left: 0, top: 0 });
		emitLayoutListeners(rootA);
		expect(result.width.value).toBe(20);

		// Firing the new root does update them.
		stubLayout(boxB.yogaNode!, { width: 33, height: 4, left: 2, top: 2 });
		emitLayoutListeners(rootB);
		expect(result.width.value).toBe(33);
		expect(result.height.value).toBe(4);
		unmount();
	});

	it('detaches all listeners on scope dispose', () => {
		const stdout = createFakeStdout(80);
		const { root, box } = makeRoot();
		stubLayout(box.yogaNode!, { width: 10, height: 1, left: 0, top: 0 });

		const target = ref<BoxMetricsTarget>(box);
		const resizeBefore = stdout.listenerCount('resize');
		const { result, unmount } = withSetup(() => useBoxMetrics(target), {
			stdout: fakeStdoutContext(stdout),
		});
		expect(stdout.listenerCount('resize')).toBeGreaterThan(resizeBefore);
		// Listener is attached to root via addLayoutListener.
		expect(root.internal_layoutListeners?.size ?? 0).toBe(1);

		unmount();

		expect(stdout.listenerCount('resize')).toBe(resizeBefore);
		expect(root.internal_layoutListeners?.size ?? 0).toBe(0);

		// And it must be inert: post-dispose layout commits do not move refs.
		stubLayout(box.yogaNode!, { width: 99, height: 9, left: 0, top: 0 });
		emitLayoutListeners(root);
		expect(result.width.value).toBe(10);
	});

	it('throws when useStdout is not provided', () => {
		const target = ref<BoxMetricsTarget>(null);
		expect(() => withSetup(() => useBoxMetrics(target))).toThrow(/useStdout/);
	});

	it('exposes addLayoutListener as a no-op for non-root nodes', () => {
		// Sanity check on the core API — useBoxMetrics relies on this so a
		// non-root accidental input never throws and always returns a disposer.
		const box = createNode('ink-box');
		const dispose = addLayoutListener(box, () => {});
		expect(typeof dispose).toBe('function');
		expect(() => dispose()).not.toThrow();
	});
});
