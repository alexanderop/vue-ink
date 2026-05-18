import { describe, it, expect } from "vitest";
import fc from "fast-check";
import wrapText from "../../core/src/wrap-text.ts";

// ASCII alphabet so character count equals terminal column count — no need to
// pull in string-width here. Multi-byte/emoji widths are tested elsewhere.
const asciiChar = fc.constantFrom(
  ..."abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789  ",
);
const asciiText = fc.string({ unit: asciiChar, maxLength: 120 });
const maxWidth = fc.integer({ min: 1, max: 40 });

describe("wrapText — properties", () => {
  it("wrap: every output line fits within maxWidth", () => {
    fc.assert(
      fc.property(asciiText, maxWidth, (text, width) => {
        const wrapped = wrapText(text, width, "wrap");
        for (const line of wrapped.split("\n")) {
          expect(line.length).toBeLessThanOrEqual(width);
        }
      }),
      { numRuns: 300 },
    );
  });

  it("hard: every output line fits within maxWidth", () => {
    fc.assert(
      fc.property(asciiText, maxWidth, (text, width) => {
        const wrapped = wrapText(text, width, "hard");
        for (const line of wrapped.split("\n")) {
          expect(line.length).toBeLessThanOrEqual(width);
        }
      }),
      { numRuns: 300 },
    );
  });

  it("hard mode preserves every character — joining lines reproduces the input", () => {
    // Hard mode = `wordWrap: false` in wrap-ansi: it inserts newlines at the
    // column boundary without consuming or moving any byte. This is the
    // strongest content-preservation invariant we can express.
    fc.assert(
      fc.property(asciiText, maxWidth, (text, width) => {
        const wrapped = wrapText(text, width, "hard");
        expect(wrapped.replace(/\n/g, "")).toBe(text);
      }),
      { numRuns: 300 },
    );
  });

  it("idempotency: wrapping an already-wrapped string is a no-op (wrap)", () => {
    fc.assert(
      fc.property(asciiText, maxWidth, (text, width) => {
        const once = wrapText(text, width, "wrap");
        const twice = wrapText(once, width, "wrap");
        expect(twice).toBe(once);
      }),
      { numRuns: 300 },
    );
  });

  it("idempotency: wrapping an already-wrapped string is a no-op (hard)", () => {
    fc.assert(
      fc.property(asciiText, maxWidth, (text, width) => {
        const once = wrapText(text, width, "hard");
        const twice = wrapText(once, width, "hard");
        expect(twice).toBe(once);
      }),
      { numRuns: 300 },
    );
  });

  it("truncate-end never grows the string beyond maxWidth", () => {
    fc.assert(
      fc.property(asciiText, maxWidth, (text, width) => {
        const truncated = wrapText(text, width, "truncate-end");
        expect(truncated.length).toBeLessThanOrEqual(width);
      }),
      { numRuns: 300 },
    );
  });

  it("truncate-end is a no-op when text already fits", () => {
    fc.assert(
      fc.property(asciiText, (text) => {
        const width = Math.max(text.length, 1);
        expect(wrapText(text, width, "truncate-end")).toBe(text);
      }),
      { numRuns: 200 },
    );
  });
});
