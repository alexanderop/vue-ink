// `cli-cursor` toggles the real terminal's cursor visibility via stderr writes
// tied to process-exit hooks. xterm.js owns its own cursor, so noop here and
// let the renderer's own DECTCEM (\x1B[?25l/h) escapes drive visibility.
export const show = (): void => {};
export const hide = (): void => {};
export const toggle = (): void => {};
export default { show, hide, toggle };
