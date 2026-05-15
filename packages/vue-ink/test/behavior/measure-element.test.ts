import { describe, it } from 'vitest';

// TODO: port from repos/ink/test/measure-element.tsx — measure a ref'd
// element's computed dimensions, including across reactive state changes
// and while paints are throttled. vue-ink equivalent likely flows through
// `useBoxMetrics` or a similar composable.

describe('measure-element', () => {
	it.todo('measure element');
	it.todo('measure element after state update');
	it.todo('measure element after multiple state updates');
	it.todo('measure element in useLayoutEffect after state update');
	it.todo('calculate layout while rendering is throttled');
});
