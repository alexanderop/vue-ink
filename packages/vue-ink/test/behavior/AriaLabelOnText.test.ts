import { describe, it, expect, vi } from 'vitest';
import { defineComponent, h, onMounted } from 'vue';
import { render } from '@vue-ink/testing-library';
import { renderToString } from '@vue-ink/renderer';
import { Box, Text } from '../../src/index.ts';

// Tests aria-label / aria-hidden specifically on the <Text> component. The
// existing behavior/ScreenReader.test.ts covers Box-level aria handling
// thoroughly but only briefly touches Text-level aria. These tests pin the
// contract that:
//   - aria-label on Text replaces the visible text in the SR output.
//   - aria-hidden on Text removes its subtree entirely.
//   - a labelled Text inside a roled Box composes into "role: label".

const sr = (renderFn: () => unknown): string => {
	const { lastFrame, unmount } = render(
		defineComponent({ setup: () => renderFn }),
		{ isScreenReaderEnabled: true },
	);
	const out = lastFrame() ?? '';
	unmount();
	return out;
};

describe('screen-reader aria-label / aria-hidden on Text', () => {
	it('aria-label on Text replaces the visible text in SR output', () => {
		expect(sr(() => h(Text, { 'aria-label': 'alt' }, () => 'Visible'))).toBe(
			'alt',
		);
	});

	it('aria-hidden on Text removes its subtree from the SR walk', () => {
		// A hidden Text alongside a visible one should leave only the visible
		// announcement in the output.
		expect(
			sr(() =>
				h(Box, { flexDirection: 'column' }, () => [
					h(Text, { 'aria-hidden': true }, () => 'Invisible'),
					h(Text, null, () => 'See me'),
				]),
			),
		).toBe('See me');
	});

	it('a lone aria-hidden Text produces empty SR output', () => {
		expect(
			sr(() => h(Text, { 'aria-hidden': true }, () => 'Invisible')),
		).toBe('');
	});

	it('aria-label on Text inside a roled Box composes into "role: label"', () => {
		expect(
			sr(() =>
				h(Box, { 'aria-role': 'button' }, () =>
					h(Text, { 'aria-label': 'alt' }, () => 'Visible'),
				),
			),
		).toBe('button: alt');
	});

	// Parity with ink: when SR is on, Text replaces its children with the
	// aria-label entirely. Children should not be rendered/mounted, so any
	// side effects inside the slot (e.g. onMounted) do not fire.
	it('aria-label replaces the child subtree (no mount side effects)', () => {
		const onMount = vi.fn();
		const Child = defineComponent({
			setup() {
				onMounted(onMount);
				return () => 'visible';
			},
		});

		const out = renderToString(
			defineComponent({
				setup: () => () => h(Text, { 'aria-label': 'foo' }, () => h(Child)),
			}),
			{ columns: 80, isScreenReaderEnabled: true },
		);

		expect(out).toContain('foo');
		expect(out).not.toContain('visible');
		expect(onMount).not.toHaveBeenCalled();
	});

	it('renders the child subtree normally when SR is off', () => {
		const onMount = vi.fn();
		const Child = defineComponent({
			setup() {
				onMounted(onMount);
				return () => 'visible';
			},
		});

		const out = renderToString(
			defineComponent({
				setup: () => () => h(Text, { 'aria-label': 'foo' }, () => h(Child)),
			}),
			{ columns: 80, isScreenReaderEnabled: false },
		);

		expect(out).toContain('visible');
		expect(onMount).toHaveBeenCalledTimes(1);
	});
});
