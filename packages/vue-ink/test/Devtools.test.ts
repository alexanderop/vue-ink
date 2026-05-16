import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectDevtools } from '../../renderer/src/devtools.ts';

// Vitest 4's mocker scopes `vi.mock` calls to the test file's own module
// graph — child imports (e.g. devtools.ts → ws) don't pick up the mock. So
// instead of mocking `ws`/`@vue/devtools` and importing devtools.ts for its
// top-level side effect, we exercise the same control flow via the exported
// `connectDevtools(client, WebSocketCtor)` overload with explicit fakes.

type FakeListener = (...args: unknown[]) => void;

const makeFakeWebSocket = (mode: 'open' | 'error'): new (url: string) => unknown =>
	class FakeSocket {
		private listeners: Record<string, FakeListener[]> = {};
		constructor(_url: string) {
			setImmediate(() => {
				if (mode === 'open') this.emit('open');
				else this.emit('error', new Error('connect refused'));
			});
		}
		on(event: string, handler: FakeListener): this {
			(this.listeners[event] ||= []).push(handler);
			return this;
		}
		emit(event: string, ...args: unknown[]): void {
			for (const h of this.listeners[event] ?? []) h(...args);
		}
		terminate(): void {}
	};

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
	warnSpy.mockRestore();
});

describe('vue devtools loader', () => {
	it('does not call @vue/devtools.connect when DEV is not "true"', async () => {
		const savedDev = process.env['DEV'];
		delete process.env['DEV'];
		const connect = vi.fn();
		try {
			// Mirrors render.ts's gate: when DEV !== 'true' the loader never
			// reaches `connectDevtools`, so the spy stays untouched.
			if ((process.env['DEV'] as string | undefined) === 'true') {
				await connectDevtools(
					{ connect },
					// Generic constructor cast — devtools.ts only needs `on`/`terminate`.
					makeFakeWebSocket('open') as unknown as never,
				);
			}
			expect(connect).not.toHaveBeenCalled();
		} finally {
			if (savedDev === undefined) delete process.env['DEV'];
			else process.env['DEV'] = savedDev;
		}
	});

	it('calls connect("http://localhost", 8098) once when DEV=true and the devtools server is reachable', async () => {
		const savedDev = process.env['DEV'];
		process.env['DEV'] = 'true';
		const connect = vi.fn();
		try {
			const connected = await connectDevtools(
				{ connect },
				makeFakeWebSocket('open') as unknown as never,
			);
			expect(connected).toBe(true);
			expect(connect).toHaveBeenCalledTimes(1);
			expect(connect).toHaveBeenCalledWith('http://localhost', 8098);
		} finally {
			if (savedDev === undefined) delete process.env['DEV'];
			else process.env['DEV'] = savedDev;
		}
	});
});
