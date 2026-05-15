import { describe, it } from 'vitest';

// TODO: port from repos/ink/test/position.tsx — absolute/relative/static
// positioning with top/left/bottom/right offsets, percentage offsets,
// rerender clearing.

describe('position', () => {
	it.todo('absolute position with top and left offsets');
	it.todo('absolute position with bottom and right offsets');
	it.todo('absolute position with percentage offsets');
	it.todo('absolute position with percentage bottom and right offsets');
	it.todo('relative position offsets visual position while keeping flow');
	it.todo('static position ignores offsets');
	it.todo('static position ignores percentage offsets');
	it.todo('clears top offset on rerender');
	it.todo('clears percentage top and left offsets on rerender');
	it.todo('clears percentage top and left offsets when props are omitted on rerender');
	it.todo('clears bottom and right offsets on rerender');
});
