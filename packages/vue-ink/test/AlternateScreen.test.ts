import { describe, it, expect } from 'vitest';
import { defineComponent, h } from 'vue';
import stripAnsi from 'strip-ansi';
import { render } from '../src/index.ts';
import { createCaptureStream, flush } from './helpers.ts';

// CSI ?1049h / ?1049l — the DEC private mode pair that ink (and vim/htop/less)
// uses to enter/exit the terminal's alternate screen buffer. `cursorShow` is
// the CSI ?25h sequence ink emits after leaving the alt screen so the user's
// cursor is restored.
const enterAlternativeScreen = '\x1b[?1049h';
const exitAlternativeScreen = '\x1b[?1049l';
const cursorShow = '\x1b[?25h';

const Hello = defineComponent({
	setup: () => () => h('ink-text', null, 'Hello'),
});

// Ports of ink's alternate-screen tests in repos/ink/test/components.tsx
// (search for "alternate screen -"). Behaviors we mirror:
//   * enters on mount, exits on unmount
//   * disabled by default
//   * ignored when interactive=false
//   * ignored when isTTY=false (even with interactive=true)
//   * content lands between enter and exit
//   * exit comes before showCursor in TTY teardown

describe('alternate screen', () => {
	it('writes enterAlternativeScreen on mount and exitAlternativeScreen on unmount', async () => {
		const stdout = createCaptureStream(100);
		stdout.isTTY = true;

		const instance = render(Hello, {
			stdout,
			alternateScreen: true,
			interactive: true,
		});
		await flush();
		instance.unmount();

		const writes = stdout.frames;
		const enterIndex = writes.findIndex((w) =>
			w.includes(enterAlternativeScreen),
		);
		const exitIndex = writes.findLastIndex((w) =>
			w.includes(exitAlternativeScreen),
		);

		expect(enterIndex).not.toBe(-1);
		expect(exitIndex).not.toBe(-1);
		expect(enterIndex).toBeLessThan(exitIndex);
		// Ink asserts enter is the first write — mirror that.
		expect(enterIndex).toBe(0);
	});

	it('is disabled by default', async () => {
		const stdout = createCaptureStream(100);
		stdout.isTTY = true;

		const instance = render(Hello, { stdout, interactive: true });
		await flush();
		instance.unmount();

		const joined = stdout.frames.join('');
		expect(joined).not.toContain(enterAlternativeScreen);
		expect(joined).not.toContain(exitAlternativeScreen);
	});

	it('is ignored when interactive=false', async () => {
		const stdout = createCaptureStream(100);
		stdout.isTTY = true;

		const instance = render(Hello, {
			stdout,
			alternateScreen: true,
			interactive: false,
		});
		await flush();
		instance.unmount();

		const joined = stdout.frames.join('');
		expect(joined).not.toContain(enterAlternativeScreen);
		expect(joined).not.toContain(exitAlternativeScreen);
	});

	it('is ignored when isTTY=false', async () => {
		const stdout = createCaptureStream(100);
		stdout.isTTY = false;

		const instance = render(Hello, {
			stdout,
			alternateScreen: true,
		});
		await flush();
		instance.unmount();

		const joined = stdout.frames.join('');
		expect(joined).not.toContain(enterAlternativeScreen);
		expect(joined).not.toContain(exitAlternativeScreen);
	});

	it('is ignored when isTTY=false even if interactive=true', async () => {
		const stdout = createCaptureStream(100);
		stdout.isTTY = false;

		const instance = render(Hello, {
			stdout,
			alternateScreen: true,
			interactive: true,
		});
		await flush();
		instance.unmount();

		const joined = stdout.frames.join('');
		expect(joined).not.toContain(enterAlternativeScreen);
		expect(joined).not.toContain(exitAlternativeScreen);
	});

	it('renders content between enter and exit', async () => {
		const stdout = createCaptureStream(100);
		stdout.isTTY = true;

		const instance = render(Hello, {
			stdout,
			alternateScreen: true,
			interactive: true,
		});
		await flush();
		instance.unmount();

		const writes = stdout.frames;
		const enterIndex = writes.findIndex((w) =>
			w.includes(enterAlternativeScreen),
		);
		const exitIndex = writes.findLastIndex((w) =>
			w.includes(exitAlternativeScreen),
		);

		expect(enterIndex).not.toBe(-1);
		expect(exitIndex).not.toBe(-1);
		expect(enterIndex).toBeLessThan(exitIndex);

		const contentBetween = writes
			.slice(enterIndex + 1, exitIndex)
			.some((w) => stripAnsi(w).includes('Hello'));
		expect(contentBetween).toBe(true);
	});

	it('restores the cursor after leaving the alternate screen', async () => {
		const stdout = createCaptureStream(100);
		stdout.isTTY = true;

		const instance = render(Hello, {
			stdout,
			alternateScreen: true,
			interactive: true,
		});
		await flush();
		instance.unmount();

		const joined = stdout.frames.join('');
		const exitIndex = joined.lastIndexOf(exitAlternativeScreen);
		const showCursorIndex = joined.lastIndexOf(cursorShow);

		expect(exitIndex).not.toBe(-1);
		expect(showCursorIndex).toBeGreaterThan(exitIndex);
	});
});
