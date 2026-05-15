import { describe, it } from 'vitest';

// TODO: port from repos/ink/test/hooks-use-paste.tsx — bracketed-paste
// events through usePaste, exclusivity vs useInput, multi-listener fan-out.
// Stdin driver should write `\x1B[200~<content>\x1B[201~` to trigger the
// paste codepath.

describe('usePaste', () => {
	it.todo('receives bracketed paste as single text blob');
	it.todo('paste content with escape sequences is delivered verbatim');
	it.todo('useInput does not receive bracketed paste content');
	it.todo('multiple simultaneous hooks both receive the same paste event');
});
