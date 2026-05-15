import { describe, it, expect } from 'vitest';
import { defineComponent, h } from 'vue';
import { render } from '@vue-ink/testing-library';
import { Box, Text } from '../../src/index.ts';

// The existing behavior/ScreenReader.test.ts exercises roughly 8 of the 18
// roles declared in `packages/core/src/dom.ts` (`AccessibilityRole`). This
// file fills in the remaining roles so every supported `aria-role` value has
// at least one passing screen-reader assertion. Each test renders a Box with
// a Text child and verifies the walker emits `${role}: <text>`.

const sr = (renderFn: () => unknown): string => {
	const { lastFrame, unmount } = render(
		defineComponent({ setup: () => renderFn }),
		{ isScreenReaderEnabled: true },
	);
	const out = lastFrame() ?? '';
	unmount();
	return out;
};

// All ten roles below come straight from the `AccessibilityRole` union; the
// list intentionally avoids `button`/`checkbox`/`combobox`/`list`/`listbox`/
// `listitem`/`option`/`textbox` since those already have coverage in
// behavior/ScreenReader.test.ts.
const ROLES = [
	'menu',
	'menuitem',
	'radio',
	'radiogroup',
	'tab',
	'tablist',
	'table',
	'timer',
	'toolbar',
	'progressbar',
] as const;

describe('screen-reader aria-role coverage (remaining roles)', () => {
	for (const role of ROLES) {
		it(`announces "${role}:" prefix on a Box with that role`, () => {
			expect(
				sr(() =>
					h(Box, { 'aria-role': role }, () =>
						h(Text, null, () => `${role}-content`),
					),
				),
			).toBe(`${role}: ${role}-content`);
		});
	}
});
