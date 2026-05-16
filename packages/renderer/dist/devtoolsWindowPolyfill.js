import ws from 'ws';
const customGlobal = globalThis;
// These globals must exist before importing `@vue/devtools`. `||=` keeps any
// pre-existing real values (e.g. when a host already provides WebSocket).
customGlobal['WebSocket'] ||= ws;
customGlobal['window'] ||= globalThis;
customGlobal['self'] ||= globalThis;
// Read at runtime by Vue's prod build to decide whether `devtoolsInitApp`
// no-ops. Must be set before the first `app.mount()` for prod consumers.
customGlobal['__VUE_PROD_DEVTOOLS__'] = true;
//# sourceMappingURL=devtoolsWindowPolyfill.js.map