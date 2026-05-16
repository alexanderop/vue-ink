export type UseStdinReturn = {
    stdin: NodeJS.ReadStream;
    isRawModeSupported: boolean;
    setRawMode: (enable: boolean) => void;
    setBracketedPasteMode: (enable: boolean) => void;
};
/**
 * Access stdin and the raw-mode controls from inside a component mounted via
 * `render()`. Hides the internal emitter; subscribe via {@link useInput} or
 * {@link usePaste} instead.
 */
export declare const useStdin: () => UseStdinReturn;
//# sourceMappingURL=index.d.ts.map