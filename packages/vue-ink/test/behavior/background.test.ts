import { describe, it } from 'vitest';

// TODO: port from repos/ink/test/background.tsx — Box background color
// inheritance into Text, fill behaviour with borders/padding/alignment,
// hex/rgb/ansi256 variants, rerender clearing.

describe('background', () => {
	it.todo('Text inherits parent Box background color');
	it.todo('Text explicit background color overrides inherited');
	it.todo('Nested Box background inheritance');
	it.todo('Text without parent Box background has no inheritance');
	it.todo('Multiple Text elements inherit same background');
	it.todo('Mixed text with and without background inheritance');
	it.todo('Complex nested structure with background inheritance');
	it.todo('Box background with standard color');
	it.todo('Box background with hex color');
	it.todo('Box background with rgb color');
	it.todo('Box background with ansi256 color');
	it.todo('Box background with wide characters');
	it.todo('Box background with emojis');
	it.todo('Box background fills entire area with standard color');
	it.todo('Box background fills with hex color');
	it.todo('Box background fills with rgb color');
	it.todo('Box background fills with ansi256 color');
	it.todo('Box background with border fills content area');
	it.todo('Box background with padding fills entire padded area');
	it.todo('Box background with center alignment fills entire area');
	it.todo('Box background with column layout fills entire area');
	it.todo('Box background updates on rerender');
	it.todo('Box backgroundColor fills full width on every line when text wraps');
	it.todo('Text-only backgroundColor colors text content but does not fill Box width');
});
