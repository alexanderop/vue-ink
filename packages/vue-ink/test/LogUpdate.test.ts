// Ported from repos/ink/test/log-update.tsx (MIT — https://github.com/vadimdemedes/ink)
import { Writable } from 'node:stream';
import { describe, expect, test } from 'vitest';
import ansiEscapes from 'ansi-escapes';
import {
	logUpdate,
	showCursorEscape,
	hideCursorEscape,
} from '@vue-ink/renderer';

type CapturedStream = Writable & {
	frames: string[];
	get: () => string;
};

const createStream = (): CapturedStream => {
	const frames: string[] = [];
	const stream = new Writable({
		write(chunk, _enc, cb) {
			frames.push(chunk.toString());
			cb();
		},
	}) as CapturedStream;
	stream.frames = frames;
	stream.get = () => frames[frames.length - 1] ?? '';
	return stream;
};

const standardOptions = { showCursor: true } as const;
const incrementalOptions = { showCursor: true, incremental: true } as const;

const modes = [
	{ name: 'standard rendering', options: standardOptions },
	{ name: 'incremental rendering', options: incrementalOptions },
] as const;

describe('logUpdate — standard rendering', () => {
	test('renders and updates output', () => {
		const stream = createStream();
		const render = logUpdate.create(stream, standardOptions);

		render('Hello\n');
		expect(stream.frames.length).toBe(1);
		expect(stream.frames[0]).toBe('Hello\n');

		render('World\n');
		expect(stream.frames.length).toBe(2);
		expect(stream.frames[1]).toContain('World');
	});

	test('skips identical output', () => {
		const stream = createStream();
		const render = logUpdate.create(stream, standardOptions);

		render('Hello\n');
		render('Hello\n');

		expect(stream.frames.length).toBe(1);
	});
});

describe('logUpdate — incremental rendering', () => {
	test('renders and updates output', () => {
		const stream = createStream();
		const render = logUpdate.create(stream, incrementalOptions);

		render('Hello\n');
		expect(stream.frames.length).toBe(1);
		expect(stream.frames[0]).toBe('Hello\n');

		render('World\n');
		expect(stream.frames.length).toBe(2);
		expect(stream.frames[1]).toContain('World');
	});

	test('skips identical output', () => {
		const stream = createStream();
		const render = logUpdate.create(stream, incrementalOptions);

		render('Hello\n');
		render('Hello\n');

		expect(stream.frames.length).toBe(1);
	});

	test('surgical updates skip unchanged lines', () => {
		const stream = createStream();
		const render = logUpdate.create(stream, incrementalOptions);

		render('Line 1\nLine 2\nLine 3\n');
		render('Line 1\nUpdated\nLine 3\n');

		const secondCall = stream.frames[1]!;
		expect(secondCall).toContain(ansiEscapes.cursorNextLine);
		expect(secondCall).toContain('Updated');
		expect(secondCall).not.toContain('Line 1');
		expect(secondCall).not.toContain('Line 3');
	});

	test('same-height update rewinds cursor to top with trailing newline', () => {
		const stream = createStream();
		const render = logUpdate.create(stream, incrementalOptions);

		render('Line 1\nLine 2\nLine 3\n');
		render('Line 1\nUpdated\nLine 3\n');

		const secondCall = stream.frames[1]!;
		expect(secondCall.startsWith(ansiEscapes.cursorUp(3))).toBe(true);
	});

	test('clears extra lines when output shrinks', () => {
		const stream = createStream();
		const render = logUpdate.create(stream, incrementalOptions);

		render('Line 1\nLine 2\nLine 3\n');
		render('Line 1\n');

		expect(stream.frames[1]).toContain(ansiEscapes.eraseLines(2));
	});

	test('when output grows', () => {
		const stream = createStream();
		const render = logUpdate.create(stream, incrementalOptions);

		render('Line 1\n');
		render('Line 1\nLine 2\nLine 3\n');

		const secondCall = stream.frames[1]!;
		expect(secondCall).toContain(ansiEscapes.cursorNextLine);
		expect(secondCall).toContain('Line 2');
		expect(secondCall).toContain('Line 3');
		expect(secondCall).not.toContain('Line 1');
	});

	test('single write call with multiple surgical updates', () => {
		const stream = createStream();
		const render = logUpdate.create(stream, incrementalOptions);

		render(
			'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8\nLine 9\nLine 10\n',
		);
		render(
			'Line 1\nUpdated 2\nLine 3\nUpdated 4\nLine 5\nUpdated 6\nLine 7\nUpdated 8\nLine 9\nUpdated 10\n',
		);

		expect(stream.frames.length).toBe(2);
	});

	test('shrinking output keeps screen tight', () => {
		const stream = createStream();
		const render = logUpdate.create(stream, incrementalOptions);

		render('Line 1\nLine 2\nLine 3\n');
		render('Line 1\nLine 2\n');
		render('Line 1\n');

		expect(stream.get()).toBe(
			ansiEscapes.eraseLines(2) +
				ansiEscapes.cursorUp(1) +
				ansiEscapes.cursorNextLine,
		);
	});

	test('clear() fully resets incremental state', () => {
		const stream = createStream();
		const render = logUpdate.create(stream, incrementalOptions);

		render('Line 1\nLine 2\nLine 3\n');
		render.clear();
		render('Line 1\n');

		expect(stream.get()).toBe(`${ansiEscapes.eraseLines(0)}Line 1\n`);
	});

	test('done() resets before next render', () => {
		const stream = createStream();
		const render = logUpdate.create(stream, incrementalOptions);

		render('Line 1\nLine 2\nLine 3\n');
		render.done();
		render('Line 1\n');

		expect(stream.get()).toBe(`${ansiEscapes.eraseLines(0)}Line 1\n`);
	});

	test('multiple consecutive clear() calls are harmless no-ops', () => {
		const stream = createStream();
		const render = logUpdate.create(stream, incrementalOptions);

		render('Line 1\nLine 2\nLine 3\n');
		render.clear();
		render.clear();
		render.clear();

		expect(stream.frames.length).toBe(4);

		render('New content\n');
		expect(stream.get()).toBe(`${ansiEscapes.eraseLines(0)}New content\n`);
	});

	test('sync() followed by update uses the incremental path', () => {
		const stream = createStream();
		const render = logUpdate.create(stream, incrementalOptions);

		render.sync('Line 1\nLine 2\nLine 3\n');
		expect(stream.frames.length).toBe(0);

		render('Line 1\nUpdated\nLine 3\n');
		expect(stream.frames.length).toBe(1);

		const firstCall = stream.frames[0]!;
		expect(firstCall).toContain(ansiEscapes.cursorNextLine);
		expect(firstCall).toContain('Updated');
		expect(firstCall).not.toContain('Line 1');
		expect(firstCall).not.toContain('Line 3');
	});
});

describe('logUpdate — cursor positioning', () => {
	test('standard: positions cursor after output when cursorPosition is set', () => {
		const stream = createStream();
		const render = logUpdate.create(stream, standardOptions);

		render.setCursorPosition({ x: 5, y: 1 });
		render('Line 1\nLine 2\nLine 3\n');

		const written = stream.frames[0]!;
		expect(written).toContain('Line 3');
		expect(
			written.endsWith(
				ansiEscapes.cursorUp(2) + ansiEscapes.cursorTo(5) + showCursorEscape,
			),
		).toBe(true);
	});

	test('standard: hides cursor before erase when cursor was previously shown', () => {
		const stream = createStream();
		const render = logUpdate.create(stream, standardOptions);

		render.setCursorPosition({ x: 0, y: 0 });
		render('Hello\n');
		render.setCursorPosition({ x: 0, y: 0 });
		render('World\n');

		const secondCall = stream.frames[1]!;
		expect(secondCall.startsWith(hideCursorEscape)).toBe(true);
		expect(
			secondCall.endsWith(
				ansiEscapes.cursorUp(1) + ansiEscapes.cursorTo(0) + showCursorEscape,
			),
		).toBe(true);
	});

	test('standard: no cursor positioning when cursorPosition is undefined', () => {
		const stream = createStream();
		const render = logUpdate.create(stream, standardOptions);

		render('Hello\n');

		expect(stream.frames[0]).not.toContain(showCursorEscape);
	});

	test('standard: cursor position at second-to-last line emits cursorUp(1)', () => {
		const stream = createStream();
		const render = logUpdate.create(stream, standardOptions);

		render.setCursorPosition({ x: 3, y: 2 });
		render('Line 1\nLine 2\nLine 3\n');

		expect(
			stream.frames[0]!.endsWith(
				ansiEscapes.cursorUp(1) + ansiEscapes.cursorTo(3) + showCursorEscape,
			),
		).toBe(true);
	});

	test('standard: clearing cursor position stops cursor positioning', () => {
		const stream = createStream();
		const render = logUpdate.create(stream, standardOptions);

		render.setCursorPosition({ x: 0, y: 0 });
		render('Hello\n');

		render.setCursorPosition(undefined);
		render('World\n');

		expect(stream.frames[1]).not.toContain(showCursorEscape);
	});

	test('incremental: positions cursor after surgical updates', () => {
		const stream = createStream();
		const render = logUpdate.create(stream, incrementalOptions);

		render.setCursorPosition({ x: 5, y: 1 });
		render('Line 1\nLine 2\nLine 3\n');

		expect(
			stream.frames[0]!.endsWith(
				ansiEscapes.cursorUp(2) + ansiEscapes.cursorTo(5) + showCursorEscape,
			),
		).toBe(true);
	});

	test('incremental: positions cursor after update', () => {
		const stream = createStream();
		const render = logUpdate.create(stream, incrementalOptions);

		render.setCursorPosition({ x: 2, y: 0 });
		render('Line 1\nLine 2\nLine 3\n');
		render.setCursorPosition({ x: 2, y: 0 });
		render('Line 1\nUpdated\nLine 3\n');

		expect(
			stream.frames[1]!.endsWith(
				ansiEscapes.cursorUp(3) + ansiEscapes.cursorTo(2) + showCursorEscape,
			),
		).toBe(true);
	});

	test('standard: returns to bottom before erase when cursor was positioned', () => {
		const stream = createStream();
		const render = logUpdate.create(stream, standardOptions);

		render.setCursorPosition({ x: 0, y: 0 });
		render('Line 1\nLine 2\nLine 3\n');

		render.setCursorPosition({ x: 5, y: 0 });
		render('Line A\nLine B\nLine C\n');

		const secondCall = stream.frames[1]!;
		expect(secondCall.startsWith(hideCursorEscape)).toBe(true);
		expect(secondCall).toContain(ansiEscapes.cursorDown(3));
		expect(secondCall).toContain('Line A');
	});

	test('standard: sync() without cursor does not write to stream', () => {
		const stream = createStream();
		const render = logUpdate.create(stream, standardOptions);

		render.sync('Line 1\nLine 2\nLine 3\n');

		expect(stream.frames.length).toBe(0);
	});
});

describe('logUpdate — parametrised across both modes', () => {
	for (const { name, options } of modes) {
		test(`${name} — clear() returns cursor to bottom before erasing`, () => {
			const stream = createStream();
			const render = logUpdate.create(stream, options);

			render.setCursorPosition({ x: 5, y: 0 });
			render('Line 1\nLine 2\nLine 3\n');

			render.clear();

			const clearCall = stream.frames[1]!;
			expect(clearCall).toContain(hideCursorEscape);
			expect(clearCall).toContain(ansiEscapes.cursorDown(3));
			expect(clearCall).toContain(ansiEscapes.eraseLines(4));
		});

		test(`${name} — repositions cursor when only cursor position changes (same output)`, () => {
			const stream = createStream();
			const render = logUpdate.create(stream, options);

			render.setCursorPosition({ x: 2, y: 0 });
			render('Hello\n');
			expect(stream.frames.length).toBe(1);

			render.setCursorPosition({ x: 3, y: 0 });
			render('Hello\n');

			expect(stream.frames.length).toBe(2);
			const secondCall = stream.frames[1]!;
			expect(secondCall).toContain(showCursorEscape);
			expect(secondCall.endsWith(ansiEscapes.cursorTo(3) + showCursorEscape)).toBe(
				true,
			);
		});

		test(`${name} — sync() resets cursor state`, () => {
			const stream = createStream();
			const render = logUpdate.create(stream, options);

			render.setCursorPosition({ x: 5, y: 0 });
			render('Line 1\nLine 2\nLine 3\n');

			render.sync('Fresh output\n');

			render('Updated output\n');

			const afterSync = stream.frames[stream.frames.length - 1]!;
			expect(afterSync).not.toContain(hideCursorEscape);
			expect(afterSync).not.toContain(ansiEscapes.cursorDown(3));
		});

		test(`${name} — sync() writes cursor suffix when cursor is dirty`, () => {
			const stream = createStream();
			const render = logUpdate.create(stream, options);

			render.setCursorPosition({ x: 5, y: 1 });
			render.sync('Line 1\nLine 2\nLine 3\n');

			expect(stream.frames.length).toBe(1);
			expect(stream.frames[0]).toBe(
				ansiEscapes.cursorUp(2) + ansiEscapes.cursorTo(5) + showCursorEscape,
			);
		});

		test(`${name} — sync() with cursor sets cursorWasShown for next render`, () => {
			const stream = createStream();
			const render = logUpdate.create(stream, options);

			render.setCursorPosition({ x: 5, y: 1 });
			render.sync('Line 1\nLine 2\nLine 3\n');

			render('Updated\n');

			const renderCall = stream.frames[stream.frames.length - 1]!;
			expect(renderCall.startsWith(hideCursorEscape)).toBe(true);
		});

		test(`${name} — sync() hides cursor when previous render showed cursor`, () => {
			const stream = createStream();
			const render = logUpdate.create(stream, options);

			render.setCursorPosition({ x: 5, y: 1 });
			render('Line 1\nLine 2\nLine 3\n');
			expect(stream.frames.length).toBe(1);

			render.sync('Fresh output\n');

			expect(stream.frames.length).toBe(2);
			expect(stream.frames[1]).toBe(hideCursorEscape);
		});
	}
});

describe('logUpdate — incremental no-trailing-newline (fullscreen) mode', () => {
	test('trailing to no-trailing transition', () => {
		const stream = createStream();
		const render = logUpdate.create(stream, incrementalOptions);

		render('A\nB\n');
		render('A\nB');

		const secondCall = stream.frames[1]!;
		expect(secondCall).toContain(ansiEscapes.cursorNextLine);
		expect(secondCall.endsWith('\n')).toBe(false);
	});

	test('no-trailing to no-trailing update', () => {
		const stream = createStream();
		const render = logUpdate.create(stream, incrementalOptions);

		render('A\nB');
		render('A\nC');

		const secondCall = stream.frames[1]!;
		expect(secondCall).toContain(ansiEscapes.cursorNextLine);
		expect(secondCall).toContain('C');
		expect(secondCall.endsWith('\n')).toBe(false);
	});

	test('shrink', () => {
		const stream = createStream();
		const render = logUpdate.create(stream, incrementalOptions);

		render('A\nB');
		render('A');

		const secondCall = stream.frames[1]!;
		expect(secondCall).toContain(ansiEscapes.eraseLines(1));
		expect(secondCall.endsWith('\n')).toBe(false);
	});

	test('grow', () => {
		const stream = createStream();
		const render = logUpdate.create(stream, incrementalOptions);

		render('A');
		render('A\nB\nC');

		const secondCall = stream.frames[1]!;
		expect(secondCall).toContain('B');
		expect(secondCall).toContain('C');
		expect(secondCall.endsWith('\n')).toBe(false);
	});

	test('unchanged lines do not overshoot cursor', () => {
		const stream = createStream();
		const render = logUpdate.create(stream, incrementalOptions);

		render('A\nB');
		render('A\nB');

		expect(stream.frames.length).toBe(1);

		render('X\nB');

		const thirdCall = stream.frames[1]!;
		expect(thirdCall).toContain('X');
		expect(thirdCall.lastIndexOf(ansiEscapes.cursorNextLine)).toBe(-1);
	});

	test('render to empty string is full clear vs early exit', () => {
		const stream = createStream();
		const render = logUpdate.create(stream, incrementalOptions);

		render('Line 1\nLine 2\nLine 3\n');
		render('\n');

		expect(stream.frames.length).toBe(2);
		expect(stream.frames[1]).toBe(`${ansiEscapes.eraseLines(4)}\n`);

		render('\n');
		expect(stream.frames.length).toBe(2);
	});
});
