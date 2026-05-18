import { bench, describe } from 'vitest';
import {
	FlatList,
	NestedBoxes,
	StyledGrid,
	WrappedParagraphs,
	renderOnce,
} from './ink-scenarios.ts';

// Parallel to ../end-to-end.bench.ts but rendered through ink (React reconciler
// + Yoga) instead of vue-ink. Compare the same scene side-by-side to track the
// vue-ink ↔ ink delta as we optimise. See ../README.md for caveats.

describe('end-to-end render (ink)', () => {
	bench('FlatList — 10 rows', async () => {
		await renderOnce(FlatList(10));
	});

	bench('FlatList — 100 rows', async () => {
		await renderOnce(FlatList(100));
	});

	bench('FlatList — 1000 rows', async () => {
		await renderOnce(FlatList(1000));
	});

	bench('NestedBoxes — depth 10', async () => {
		await renderOnce(NestedBoxes(10));
	});

	bench('NestedBoxes — depth 50', async () => {
		await renderOnce(NestedBoxes(50));
	});

	bench('StyledGrid — 5x5 with borders', async () => {
		await renderOnce(StyledGrid(5, 5));
	});

	bench('StyledGrid — 20x10 with borders', async () => {
		await renderOnce(StyledGrid(20, 10));
	});

	bench('WrappedParagraphs — 20 @ width 40', async () => {
		await renderOnce(WrappedParagraphs(20));
	});
});
