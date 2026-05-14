// Kitty keyboard protocol flags.
// @see https://sw.kovidgoyal.net/kitty/keyboard-protocol/
export const kittyFlags = {
	disambiguateEscapeCodes: 1,
	reportEventTypes: 2,
	reportAlternateKeys: 4,
	reportAllKeysAsEscapeCodes: 8,
	reportAssociatedText: 16,
} as const;

export type KittyFlagName = keyof typeof kittyFlags;

export const resolveKittyFlags = (flags: KittyFlagName[]): number => {
	let result = 0;
	for (const flag of flags) {
		result |= kittyFlags[flag];
	}
	return result;
};

// Push/pop the kitty progressive enhancement stack. Non-kitty terminals
// silently ignore both escapes, so writing them unconditionally is safe.
export const enableKittyKeyboard = (flags: KittyFlagName[]): string =>
	`\x1b[>${resolveKittyFlags(flags)}u`;
export const disableKittyKeyboard = (): string => '\x1b[<u';

// Kitty modifier bits in the modifier parameter of CSI u sequences.
// Note: the wire value is (modifiers - 1) — caller is expected to subtract 1.
export const kittyModifiers = {
	shift: 1,
	alt: 2,
	ctrl: 4,
	super: 8,
	hyper: 16,
	meta: 32,
	capsLock: 64,
	numLock: 128,
} as const;

export type KittyKeyboardOptions = {
	// 'auto' (default): try to detect support by querying the terminal.
	// 'enabled': force enable.
	// 'disabled': never enable.
	mode?: 'auto' | 'enabled' | 'disabled';

	// Protocol flags to request from the terminal. Defaults to
	// ['disambiguateEscapeCodes'] if omitted.
	flags?: KittyFlagName[];
};
