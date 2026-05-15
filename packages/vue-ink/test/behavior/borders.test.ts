import { describe, it } from 'vitest';

// TODO: port from repos/ink/test/borders.tsx — the largest behaviour file
// (~1000 lines). Covers full/fit-content/fixed-width boxes, padding,
// horizontal/vertical alignment, wrapping, nested boxes, border edge
// hide/show, per-side color, dim, custom border styles.

describe('borders', () => {
	it.todo('single node - full width box');
	it.todo('single node - full width box with colorful border');
	it.todo('single node - fit-content box');
	it.todo('single node - fit-content box with wide characters');
	it.todo('single node - fit-content box with emojis');
	it.todo('single node - fit-content box with variation selector emojis');
	it.todo('single node - fixed width box');
	it.todo('single node - fixed width and height box');
	it.todo('single node - box with padding');
	it.todo('single node - box with horizontal alignment');
	it.todo('single node - box with vertical alignment');
	it.todo('single node - box with wrapping');
	it.todo('multiple nodes - full width box');
	it.todo('multiple nodes - full width box with colorful border');
	it.todo('multiple nodes - fit-content box');
	it.todo('multiple nodes - fixed width box');
	it.todo('multiple nodes - fixed width and height box');
	it.todo('multiple nodes - box with padding');
	it.todo('multiple nodes - box with horizontal alignment');
	it.todo('multiple nodes - box with vertical alignment');
	it.todo('multiple nodes - box with wrapping');
	it.todo('multiple nodes - box with wrapping and long first node');
	it.todo('multiple nodes - box with wrapping and very long first node');
	it.todo('nested boxes');
	it.todo('nested boxes - fit-content box with wide characters on flex-direction row');
	it.todo('nested boxes - fit-content box with emojis on flex-direction row');
	it.todo('nested boxes - fit-content box with wide characters on flex-direction column');
	it.todo('nested boxes - fit-content box with emojis on flex-direction column');
	it.todo('render border after update');
	it.todo('render border edge changes after update when borderStyle is unchanged');
	it.todo('hide top border');
	it.todo('hide bottom border');
	it.todo('hide top and bottom borders');
	it.todo('hide left border');
	it.todo('hide right border');
	it.todo('hide left and right border');
	it.todo('hide all borders');
	it.todo('change color of top border');
	it.todo('change color of bottom border');
	it.todo('change color of left border');
	it.todo('change color of right border');
	it.todo('custom border style');
	it.todo('dim border color');
	it.todo('dim top border color');
	it.todo('dim bottom border color');
	it.todo('dim left border color');
	it.todo('dim right border color');
	it.todo('borderDimColor does not dim styled child Text touching left edge');
});
