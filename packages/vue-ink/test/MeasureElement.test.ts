import { describe, it, expect } from 'vitest';
import { defineComponent, h, useTemplateRef } from 'vue';
import { Box, Text, measureElement, type BoxMetricsTarget } from '../src/index.ts';
import { renderReusable } from './helpers.ts';

// Public measureElement — the non-reactive sibling of useBoxMetrics. Designed
// for one-shot reads in input handlers / timers where allocating a watcher
// for a single read is overkill.

describe('measureElement', () => {
	it('returns { width: 0, height: 0 } for null/undefined', () => {
		expect(measureElement(null)).toEqual({ width: 0, height: 0 });
		expect(measureElement(undefined)).toEqual({ width: 0, height: 0 });
	});

	it('reads computed width/height from a measured Box ref', async () => {
		let captured: { width: number; height: number } | undefined;
		const Demo = defineComponent({
			setup() {
				const boxRef = useTemplateRef<BoxMetricsTarget>('box');
				return () => {
					const node =
						h(
							Box,
							{ ref: 'box', width: 30, height: 4 },
							() => h(Text, null, () => 'x'),
						);
					// Defer the read to a microtask so layout has committed
					// before we sample. The render function itself runs
					// before the post-flush layout pass.
					queueMicrotask(() => {
						captured = measureElement(boxRef.value);
					});
					return node;
				};
			},
		});
		const { instance, flush } = await renderReusable(Demo, { columns: 80 });
		await flush();
		expect(captured).toEqual({ width: 30, height: 4 });
		instance.unmount();
	});

	it('returns the same shape as react-ink (width + height only)', async () => {
		// Guards against accidentally widening the API surface — the contract
		// is the two-key object, nothing else.
		let captured: object | undefined;
		const Demo = defineComponent({
			setup() {
				const boxRef = useTemplateRef<BoxMetricsTarget>('box');
				return () => {
					const node = h(Box, { ref: 'box', width: 10, height: 2 });
					queueMicrotask(() => {
						captured = measureElement(boxRef.value);
					});
					return node;
				};
			},
		});
		const { instance, flush } = await renderReusable(Demo, { columns: 80 });
		await flush();
		expect(Object.keys(captured ?? {}).sort()).toEqual(['height', 'width']);
		instance.unmount();
	});

	it('does not subscribe to layout changes (one-shot read)', async () => {
		// Sanity check: calling measureElement repeatedly returns the latest
		// committed layout without registering anything that lingers after the
		// call. Contrast with useBoxMetrics, which attaches a layout listener.
		let measureFn: (() => { width: number; height: number }) | undefined;
		const Demo = defineComponent({
			setup() {
				const boxRef = useTemplateRef<BoxMetricsTarget>('box');
				measureFn = () => measureElement(boxRef.value);
				return () => h(Box, { ref: 'box', width: 12, height: 3 });
			},
		});
		const { instance, flush } = await renderReusable(Demo);
		await flush();
		const first = measureFn!();
		const second = measureFn!();
		expect(first).toEqual({ width: 12, height: 3 });
		expect(second).toEqual({ width: 12, height: 3 });
		instance.unmount();
	});
});
