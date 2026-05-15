import { describe, it, expect } from 'vitest';
import { defineComponent, h } from 'vue';
import { render, useInput, type Key } from '../src/index.ts';
import { createCaptureStream, createFakeStdin, flush } from './helpers.ts';

// useInput should be a fan-out: every mounted component that registers a
// handler receives every keystroke. Verified end-to-end through render().

const makeApp = (Setup: () => () => unknown) =>
	defineComponent({ setup: () => Setup() });

describe('useInput — multiple listeners', () => {
	it('fans a single keystroke out to every active handler', async () => {
		const fakeStdin = createFakeStdin();
		const stdout = createCaptureStream(20);

		const firstHits: Array<{ input: string; key: Key }> = [];
		const secondHits: Array<{ input: string; key: Key }> = [];

		const FirstChild = defineComponent({
			setup() {
				useInput((input, key) => firstHits.push({ input, key }));
				return () => h('ink-text', null, 'a');
			},
		});
		const SecondChild = defineComponent({
			setup() {
				useInput((input, key) => secondHits.push({ input, key }));
				return () => h('ink-text', null, 'b');
			},
		});

		const App = defineComponent({
			setup: () => () =>
				h('ink-box', { flexDirection: 'column' }, [
					h(FirstChild),
					h(SecondChild),
				]),
		});

		const instance = render(App, {
			stdout,
			stdin: fakeStdin,
			exitOnCtrlC: false,
		});
		await flush();

		fakeStdin.emitData('x');

		expect(firstHits).toHaveLength(1);
		expect(secondHits).toHaveLength(1);
		expect(firstHits[0]!.input).toBe('x');
		expect(secondHits[0]!.input).toBe('x');

		instance.unmount();
	});

	it('skips listeners whose isActive ref is false, keeps the rest live', async () => {
		const fakeStdin = createFakeStdin();
		const stdout = createCaptureStream(20);

		const firstHits: string[] = [];
		const middleHits: string[] = [];
		const lastHits: string[] = [];

		const FirstChild = defineComponent({
			setup() {
				useInput((input) => firstHits.push(input));
				return () => h('ink-text', null, '1');
			},
		});
		const MiddleChild = defineComponent({
			setup() {
				useInput((input) => middleHits.push(input), { isActive: false });
				return () => h('ink-text', null, '2');
			},
		});
		const LastChild = defineComponent({
			setup() {
				useInput((input) => lastHits.push(input));
				return () => h('ink-text', null, '3');
			},
		});

		const App = makeApp(() => () =>
			h('ink-box', { flexDirection: 'column' }, [
				h(FirstChild),
				h(MiddleChild),
				h(LastChild),
			]),
		);

		const instance = render(App, {
			stdout,
			stdin: fakeStdin,
			exitOnCtrlC: false,
		});
		await flush();

		fakeStdin.emitData('q');

		expect(firstHits).toEqual(['q']);
		expect(middleHits).toEqual([]);
		expect(lastHits).toEqual(['q']);

		instance.unmount();
	});
});
