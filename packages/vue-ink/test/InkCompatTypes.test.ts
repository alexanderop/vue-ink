import { describe, it, expectTypeOf } from 'vitest';
import type {
	WindowSize,
	AnimationResult,
	DOMElement,
	BoxMetrics,
} from '../src/index.ts';

// Parity surface for porters: ink exposes these names directly. Renaming
// (or omitting) them forces every "import { WindowSize, AnimationResult,
// DOMElement } from 'vue-ink'" port to break. These aliases preserve the
// import shape without disturbing the richer Vue-flavored return types
// (`UseWindowSizeReturn`, `UseAnimationReturn`) we already publish.

describe('ink-compat type aliases', () => {
	it('WindowSize matches ink: plain numbers (not ShallowRefs)', () => {
		// Construct a value matching the type — if WindowSize were `{ columns:
		// ShallowRef<number>; rows: ShallowRef<number> }` (our renamed return
		// type), passing literal numbers would fail to type-check.
		const size: WindowSize = { columns: 80, rows: 24 };
		expectTypeOf(size.columns).toEqualTypeOf<number>();
		expectTypeOf(size.rows).toEqualTypeOf<number>();
	});

	it('AnimationResult exposes the ink-shaped readonly fields', () => {
		// AnimationResult is the porting-friendly alias for the composable's
		// return; both ink and our composable yield `frame`/`time`/`delta`
		// plus a `reset()`.
		const r = {} as AnimationResult;
		// Access keys to ensure they exist; type assertion handled by the
		// alias resolution at compile time.
		void r.frame;
		void r.time;
		void r.delta;
		void r.reset;
	});

	it('DOMElement resolves to the host node type', () => {
		// `<Box ref="el">` exposes its underlying DOMElement via `$element`.
		// The exported type should resolve — if missing, the import would
		// fail at the top of this file.
		const _el = null as unknown as DOMElement;
		void _el;
	});

	it('BoxMetrics matches ink: plain numbers, no `hasMeasured`', () => {
		// Ink exposes `BoxMetrics = { width, height, left, top }`
		// (`repos/ink/src/hooks/use-box-metrics.ts`). The reactive vue-ink
		// return shape lives under `UseBoxMetricsReturn`; this alias is the
		// non-reactive ink-shaped value type used by porters.
		const m: BoxMetrics = { width: 10, height: 5, left: 1, top: 2 };
		expectTypeOf(m.width).toEqualTypeOf<number>();
		expectTypeOf(m.height).toEqualTypeOf<number>();
		expectTypeOf(m.left).toEqualTypeOf<number>();
		expectTypeOf(m.top).toEqualTypeOf<number>();
	});
});
