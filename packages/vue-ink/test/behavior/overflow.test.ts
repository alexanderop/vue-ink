import { describe, it } from 'vitest';

// TODO: port from repos/ink/test/overflow.tsx — overflowX/overflowY/overflow,
// content clipping with and without borders, intersection at every edge,
// nested overflow containers, out-of-bounds-write safety.

describe('overflow', () => {
	describe('overflowX', () => {
		it.todo('single text node in a box inside overflow container');
		it.todo('single text node inside overflow container with border');
		it.todo('single text node in a box with border inside overflow container');
		it.todo('multiple text nodes in a box inside overflow container');
		it.todo('multiple text nodes in a box inside overflow container with border');
		it.todo('multiple text nodes in a box with border inside overflow container');
		it.todo('multiple boxes inside overflow container');
		it.todo('multiple boxes inside overflow container with border');
		it.todo('box before left edge of overflow container');
		it.todo('box before left edge of overflow container with border');
		it.todo('box intersecting with left edge of overflow container');
		it.todo('box intersecting with left edge of overflow container with border');
		it.todo('box after right edge of overflow container');
		it.todo('box intersecting with right edge of overflow container');
	});

	describe('overflowY', () => {
		it.todo('single text node inside overflow container');
		it.todo('single text node inside overflow container with border');
		it.todo('multiple boxes inside overflow container');
		it.todo('multiple boxes inside overflow container with border');
		it.todo('box above top edge of overflow container');
		it.todo('box above top edge of overflow container with border');
		it.todo('box intersecting with top edge of overflow container');
		it.todo('box intersecting with top edge of overflow container with border');
		it.todo('box below bottom edge of overflow container');
		it.todo('box below bottom edge of overflow container with border');
		it.todo('box intersecting with bottom edge of overflow container');
		it.todo('box intersecting with bottom edge of overflow container with border');
	});

	describe('overflow (both axes)', () => {
		it.todo('single text node inside overflow container');
		it.todo('single text node inside overflow container with border');
		it.todo('multiple boxes inside overflow container');
		it.todo('multiple boxes inside overflow container with border');
		it.todo('box intersecting with top left edge of overflow container');
		it.todo('box intersecting with top right edge of overflow container');
		it.todo('box intersecting with bottom left edge of overflow container');
		it.todo('box intersecting with bottom right edge of overflow container');
		it.todo('nested overflow');
		it.todo('out of bounds writes do not crash');
	});
});
