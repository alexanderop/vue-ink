import { bench, describe } from 'vitest';
import { defineComponent, h, nextTick, shallowRef, type Component } from 'vue';
import { Box, Text } from '../src/index.ts';
import { render } from '../src/index.ts';
import { createSilentStream } from './scenarios.ts';

// What this measures: the per-frame cost of "one thing changed" in an already
// mounted tree. Mutate a ref → Vue scheduler flush → post-flush render job →
// Yoga layout → paint to silent stream. That round-trip is what makes a real
// app feel responsive (counter ticking, spinner spinning, one row highlighted).
//
// Targets: < 0.5ms for FlatList(100), < 1ms for FlatList(1000).
//
// Note on setup: vitest 2's `bench` does not wire tinybench's per-task
// beforeAll/beforeEach hooks, and the vitest-runner `beforeAll` import does
// not run for benchmarks. So each scenario mounts synchronously at
// describe-body evaluation time and stays mounted for the whole run.

const flush = async (): Promise<void> => {
	await nextTick();
	// A second microtask turn lets any post-flush callbacks queued during the
	// component-update phase (the renderer's render job) settle before we
	// stop the clock.
	await new Promise<void>((resolve) => {
		queueMicrotask(() => resolve());
	});
};

type Scenario = {
	component: Component;
	tick: () => void;
};

// Counter row above N static rows. Each tick mutates one text node; the rest
// of the tree is structurally unchanged but still gets re-laid-out + repainted.
const counterOverFlatList = (rows: number): Scenario => {
	const counter = shallowRef(0);
	return {
		tick: () => {
			counter.value += 1;
		},
		component: defineComponent({
			setup: () => () =>
				h(Box, { flexDirection: 'column' }, () => [
					h(Text, null, () => `count: ${counter.value}`),
					...Array.from({ length: rows }, (_, i) => h(Text, null, () => `row ${i}`)),
				]),
		}),
	};
};

// Single-row highlight: one prop (color) on one Text inside a list of N flips
// per tick. Exercises patchProp + repaint without changing tree shape.
const highlightOneRow = (rows: number): Scenario => {
	const highlighted = shallowRef(0);
	return {
		tick: () => {
			highlighted.value = (highlighted.value + 1) % rows;
		},
		component: defineComponent({
			setup: () => () =>
				h(
					Box,
					{ flexDirection: 'column' },
					() =>
						Array.from({ length: rows }, (_, i) =>
							h(
								Text,
								{ color: i === highlighted.value ? 'cyan' : undefined },
								() => `row ${i}`,
							),
						),
				),
		}),
	};
};

// Spinner frame deep inside a nested tree. Same mutation cost as the counter,
// but the surrounding layout is depth-heavy instead of breadth-heavy — guards
// the case where layout cost scales with nesting, not row count.
const spinnerInNestedBoxes = (depth: number): Scenario => {
	const frame = shallowRef(0);
	const frames = ['|', '/', '-', '\\'];
	const build = (level: number): ReturnType<typeof h> =>
		level === 0
			? h(Text, null, () => `${frames[frame.value % frames.length]} loading`)
			: h(Box, { paddingLeft: 1, flexDirection: 'column' }, () => build(level - 1));
	return {
		tick: () => {
			frame.value += 1;
		},
		component: defineComponent({
			setup: () => () => build(depth),
		}),
	};
};

// Synchronously mounts the scenario. `render()` paints the first frame inline
// before returning, so once this call completes the tree is ready and the
// next ref mutation will trigger a measurable re-render cycle.
const mountScenario = (s: Scenario): Scenario => {
	render(s.component, { stdout: createSilentStream(80) });
	return s;
};

describe('rerender — counter tick', () => {
	const flat10 = mountScenario(counterOverFlatList(10));
	bench('FlatList(10)', async () => {
		flat10.tick();
		await flush();
	});

	const flat100 = mountScenario(counterOverFlatList(100));
	bench('FlatList(100) — target < 0.5ms', async () => {
		flat100.tick();
		await flush();
	});

	const flat1000 = mountScenario(counterOverFlatList(1000));
	bench('FlatList(1000) — target < 1ms', async () => {
		flat1000.tick();
		await flush();
	});
});

describe('rerender — highlight one row', () => {
	const flat100 = mountScenario(highlightOneRow(100));
	bench('FlatList(100)', async () => {
		flat100.tick();
		await flush();
	});

	const flat1000 = mountScenario(highlightOneRow(1000));
	bench('FlatList(1000)', async () => {
		flat1000.tick();
		await flush();
	});
});

describe('rerender — spinner in deep tree', () => {
	const deep50 = mountScenario(spinnerInNestedBoxes(50));
	bench('NestedBoxes(50)', async () => {
		deep50.tick();
		await flush();
	});
});
