import "./devtoolsWindowPolyfill.js";
import WebSocket from 'ws';
// @ts-ignore optional peer dep — types may or may not be present depending on whether the user has installed @vue/devtools
import { devtools } from '@vue/devtools';
const isDevToolsReachable = async () => new Promise((resolve) => {
    const socket = new WebSocket('ws://localhost:8098');
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
if (await isDevToolsReachable()) {
    devtools.connect('http://localhost', 8098);
}
else {
    console.warn('DEV is set to true, but the Vue DevTools server is not running. Start it with:\n\n$ pnpm dlx @vue/devtools\n');
}
//# sourceMappingURL=devtools.js.map