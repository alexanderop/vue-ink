import { describe, it, expect } from 'vitest';
import { defineComponent, h } from 'vue';
import stripAnsi from 'strip-ansi';
import { render } from '@vue-ink/testing-library';
import { Text, useWindowSize } from '../../src/index.ts';

// End-to-end behavior for `useWindowSize`: mounted through the testing-library
// renderer so the actual stdout stream from `Stdout` is what the composable
// observes. The composable-level unit tests in
// `packages/renderer/src/composables/useWindowSize/index.test.ts` cover the
// missing-context paths and fallback dimensions.

const latest = (lastFrame: () => string | undefined): string =>
	stripAnsi(lastFrame() ?? '');

describe('useWindowSize behavior', () => {
	it('initial `columns` reflects the capture stream\'s columns', async () => {
		const Component = defineComponent({
			setup() {
				const { columns } = useWindowSize();
				return () => h(Text, null, () => `cols:${columns.value}`);
			},
		});

		const { lastFrame, stdout, waitUntilFlush, unmount } = render(Component);
		await waitUntilFlush();
		// `Stdout` (from testing-library) defaults columns to 100.
		expect(latest(lastFrame)).toBe(`cols:${stdout.columns}`);
		unmount();
	});

	it('updates reactively when stdout emits `resize` after a column change', async () => {
		const Component = defineComponent({
			setup() {
				const { columns } = useWindowSize();
				return () => h(Text, null, () => `cols:${columns.value}`);
			},
		});

		const { lastFrame, stdout, waitUntilFlush, unmount } = render(Component);
		await waitUntilFlush();
		const initial = stdout.columns;
		expect(latest(lastFrame)).toBe(`cols:${initial}`);

		stdout.columns = 40;
		stdout.emit('resize');
		await waitUntilFlush();
		expect(latest(lastFrame)).toBe('cols:40');

		stdout.columns = 132;
		stdout.emit('resize');
		await waitUntilFlush();
		expect(latest(lastFrame)).toBe('cols:132');

		unmount();
	});

	it('multiple consumers each attach exactly one resize listener and all detach on unmount', async () => {
		const Empty = defineComponent({
			setup: () => () => h(Text, null, () => ''),
		});
		// Baseline: any listeners the renderer itself attaches (frame-size
		// tracking, etc.) live here. We measure the delta the composables add.
		const probe = render(Empty);
		await probe.waitUntilFlush();
		const baseline = probe.stdout.listenerCount('resize');
		probe.unmount();

		const Component = defineComponent({
			setup() {
				const a = useWindowSize();
				const b = useWindowSize();
				const c = useWindowSize();
				return () =>
					h(
						Text,
						null,
						() => `${a.columns.value}|${b.columns.value}|${c.columns.value}`,
					);
			},
		});

		const { stdout, waitUntilFlush, unmount } = render(Component);
		await waitUntilFlush();

		// Three `useWindowSize()` consumers add exactly three listeners on top
		// of whatever the renderer attaches itself.
		expect(stdout.listenerCount('resize')).toBe(baseline + 3);

		unmount();
		// All composable-attached listeners detach on scope dispose — no leaks.
		expect(stdout.listenerCount('resize')).toBe(0);
	});

	// Ported from repos/ink/test/terminal-resize.tsx — guards against the
	// classic race where the OS delivers a SIGWINCH-driven resize event after
	// the consumer already unmounted the app.
	it('does not crash when stdout emits `resize` after unmount', async () => {
		const Component = defineComponent({
			setup() {
				const { columns } = useWindowSize();
				return () => h(Text, null, () => `cols:${columns.value}`);
			},
		});

		const { stdout, waitUntilFlush, unmount } = render(Component);
		await waitUntilFlush();
		unmount();

		stdout.columns = 33;
		expect(() => stdout.emit('resize')).not.toThrow();
	});
});
