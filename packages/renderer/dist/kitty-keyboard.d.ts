export declare const kittyFlags: {
    readonly disambiguateEscapeCodes: 1;
    readonly reportEventTypes: 2;
    readonly reportAlternateKeys: 4;
    readonly reportAllKeysAsEscapeCodes: 8;
    readonly reportAssociatedText: 16;
};
export type KittyFlagName = keyof typeof kittyFlags;
export declare const resolveKittyFlags: (flags: KittyFlagName[]) => number;
export declare const enableKittyKeyboard: (flags: KittyFlagName[]) => string;
export declare const disableKittyKeyboard: () => string;
export declare const kittyModifiers: {
    readonly shift: 1;
    readonly alt: 2;
    readonly ctrl: 4;
    readonly super: 8;
    readonly hyper: 16;
    readonly meta: 32;
    readonly capsLock: 64;
    readonly numLock: 128;
};
export type KittyKeyboardOptions = {
    mode?: 'auto' | 'enabled' | 'disabled';
    flags?: KittyFlagName[];
};
export declare const hasCompleteKittyQueryResponse: (buffer: number[]) => boolean;
export declare const stripKittyQueryResponses: (buffer: number[]) => number[];
export declare const kittyQueryEscape = "\u001B[?u";
//# sourceMappingURL=kitty-keyboard.d.ts.map