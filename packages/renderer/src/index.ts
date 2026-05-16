export {
	default as render,
	_flushActiveInstances,
	type RenderOptions,
	type Instance,
	type RenderMetrics,
} from './render.ts';
export {
	renderToString,
	type RenderToStringOptions,
} from './renderToString.ts';
export {
	measureElement,
	type MeasureElementOutput,
} from './measureElement.ts';
export { createApp } from './renderer.ts';
export {
	useApp,
	useStdin,
	useStdout,
	useStderr,
	useWindowSize,
	useIsScreenReaderEnabled,
	useInput,
	usePaste,
	useFocus,
	useFocusManager,
	useAnimation,
	useBoxMetrics,
	useCursor,
	type InputHandler,
	type UseInputOptions,
	type UseStdinReturn,
	type PasteHandler,
	type UsePasteOptions,
	type UseFocusOptions,
	type UseFocusReturn,
	type UseFocusManagerReturn,
	type UseWindowSizeReturn,
	type UseAnimationOptions,
	type UseAnimationReturn,
	type BoxMetricsTarget,
	type UseBoxMetricsReturn,
	type CursorPosition,
	type UseCursorReturn,
	type Key,
	// Ink-compat aliases (additive — porters' `import { WindowSize,
	// AnimationResult } from 'vue-ink'` keeps working).
	type WindowSize,
	type AnimationResult,
} from './composables/index.ts';
// Re-export `DOMElement` from core so porters can `import type { DOMElement }
// from 'vue-ink'` without reaching into `@vue-ink/core` directly.
export type { DOMElement } from '@vue-ink/core';
export {
	kittyFlags,
	kittyModifiers,
	type KittyFlagName,
	type KittyKeyboardOptions,
} from './kitty-keyboard.ts';
// Cursor escape-sequence helpers (pure functions, no side-effects). Exposed
// so internal tooling and tests can build the same byte sequences the
// renderer emits without duplicating the logic.
export {
	buildCursorOnlySequence,
	buildCursorSuffix,
	buildReturnToBottom,
	buildReturnToBottomPrefix,
	cursorPositionChanged,
	hideCursorEscape,
	showCursorEscape,
	type CursorOnlyInput,
} from './cursor-helpers.ts';
// Bare frame-overwrite primitive. Not used by `render()` itself (which has
// its own bespoke paint loop with `<Static>` and synchronized-update hooks)
// but available for tooling that wants the ink-parity behaviour.
export {
	default as logUpdate,
	type LogUpdate,
	type LogUpdateOptions,
} from './log-update.ts';
