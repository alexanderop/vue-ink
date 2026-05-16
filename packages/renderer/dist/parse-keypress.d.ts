export declare const nonAlphanumericKeys: ReadonlySet<string>;
export type ParsedKey = {
    name: string;
    ctrl: boolean;
    meta: boolean;
    shift: boolean;
    sequence: string;
    raw: string | undefined;
    code?: string;
    super?: boolean;
    hyper?: boolean;
    capsLock?: boolean;
    numLock?: boolean;
    eventType?: 'press' | 'repeat' | 'release';
    isKittyProtocol?: boolean;
    text?: string;
    isPrintable?: boolean;
};
declare const parseKeypress: (raw?: Uint8Array | string) => ParsedKey;
export default parseKeypress;
//# sourceMappingURL=parse-keypress.d.ts.map