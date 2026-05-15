import { describe, it } from 'vitest';

// TODO: port from repos/ink/test/hooks-use-input-navigation.tsx — arrow
// keys, page up/down, home/end, with ctrl and meta modifiers. All cheap to
// drive via stdin.write(`\x1B[A`) etc; no PTY needed.

describe('useInput - navigation', () => {
	it.todo('handle up arrow');
	it.todo('handle down arrow');
	it.todo('handle left arrow');
	it.todo('handle right arrow');
	it.todo('handle meta + up arrow');
	it.todo('handle meta + down arrow');
	it.todo('handle meta + left arrow');
	it.todo('handle meta + right arrow');
	it.todo('handle ctrl + up arrow');
	it.todo('handle ctrl + down arrow');
	it.todo('handle ctrl + left arrow');
	it.todo('handle ctrl + right arrow');
	it.todo('handle page down');
	it.todo('handle page up');
	it.todo('handle home');
	it.todo('handle end');
});
