// No POSIX signals in a browser tab. The unsubscribe handle is what callers
// hold onto, so return a no-op cleanup.
export const onExit = (): (() => void) => () => {};
export default onExit;
