import { bench, describe } from 'vitest';
import {
	FlatList,
	NestedBoxes,
	StyledGrid,
	WrappedParagraphs,
	renderOnce,
} from './scenarios.ts';

// Each bench measures: Vue mount → scheduler flush → Yoga layout → output → unmount.
// Compare across sizes to spot non-linear scaling; compare across runs to spot regressions.

describe('end-to-end render', () => {
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
