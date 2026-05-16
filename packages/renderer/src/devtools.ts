import './devtoolsWindowPolyfill.ts';
import WebSocket from 'ws';
// @ts-ignore optional peer dep — types may or may not be present depending on whether the user has installed @vue/devtools
import { devtools } from '@vue/devtools';

type DevtoolsClient = { connect: (host: string, port: number) => void };

interface WsLike {
	on: (event: 'open' | 'error', handler: (...args: unknown[]) => void) => unknown;
	terminate: () => void;
}
type WsCtor = new (url: string) => WsLike;

export const isDevToolsReachable = (
	WebSocketCtor: WsCtor = WebSocket as unknown as WsCtor,
): Promise<boolean> =>
	new Promise((resolve) => {
		const socket = new WebSocketCtor('ws://localhost:8098');

		const timeout = setTimeout(() => {
			socket.terminate();
			resolve(false);
		}, 2000);
		// Don't let the probe timer keep the process alive on its own.
		timeout.unref();

		socket.on('open', () => {
			clearTimeout(timeout);
			socket.terminate();
			resolve(true);
		});

		socket.on('error', () => {
			clearTimeout(timeout);
			socket.terminate();
			resolve(false);
		});
	});

export const connectDevtools = async (
	client: DevtoolsClient = devtools as DevtoolsClient,
	WebSocketCtor: WsCtor = WebSocket as unknown as WsCtor,
): Promise<boolean> => {
	if (await isDevToolsReachable(WebSocketCtor)) {
		client.connect('http://localhost', 8098);
		return true;
	}
	console.warn(
		'DEV is set to true, but the Vue DevTools server is not running. Start it with:\n\n$ pnpm dlx @vue/devtools\n',
	);
	return false;
};

// Auto-invoke only when render.ts's loader dynamically imported us via the
// `DEV === 'true'` gate. The env-var double-check makes the module safe to
// import for testing (`connectDevtools()` is the exported entry point).
if (process.env['DEV'] === 'true') {
	await connectDevtools();
}
