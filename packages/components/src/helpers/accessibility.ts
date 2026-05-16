import type { AccessibilityInfo } from '@vue-ink/core';

/**
 * Build an `AccessibilityInfo` from a partial fields object, or return
 * `undefined` when every field is undefined. The renderer's screen-reader
 * walker treats an absent `internal_accessibility` the same as `{}`, so
 * dropping the prop entirely when nothing is set keeps the DOM cleaner and
 * lets identity-based dirty checks short-circuit.
 */
export const buildAccessibility = (
	fields: AccessibilityInfo,
): AccessibilityInfo | undefined => {
	for (const key in fields) {
		if (fields[key as keyof AccessibilityInfo] !== undefined) return fields;
	}
	return undefined;
};
