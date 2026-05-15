import { describe, it } from 'vitest';

// TODO: port from repos/ink/test/use-box-metrics.tsx — useBoxMetrics
// composable: position and size, terminal resize, hasMeasured flag,
// detach/reattach, listener cleanup on unmount.

describe('use-box-metrics', () => {
	it.todo('returns correct size on first render');
	it.todo('returns correct position');
	it.todo('updates when terminal is resized');
	it.todo('uses latest tracked ref when terminal is resized');
	it.todo('updates when sibling content changes');
	it.todo('updates when sibling content changes but tracked component is memoized');
	it.todo('updates when tracked ref attaches after initial render and component is memoized');
	it.todo('does not trigger extra re-renders when layout is unchanged');
	it.todo('removes resize listener on unmount');
	it.todo('does not crash when resize fires after unmount');
	it.todo('returns zeros when ref is not attached');
	it.todo('hasMeasured becomes true when tracked element is mounted on initial render');
	it.todo('hasMeasured resets when tracked ref switches to a detached element');
	it.todo('hasMeasured becomes true after the tracked element is measured');
	it.todo('resets metrics when tracked element unmounts');
});
