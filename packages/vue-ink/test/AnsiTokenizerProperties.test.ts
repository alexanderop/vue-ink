import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { tokenizeAnsi } from "@vue-ink/core";

// Lone ESC bytes are intentionally skipped by the parser (see ansi-tokenizer.ts
// — "Ignore lone ESC and continue tokenizing the rest"). That makes a naive
// "tokens.map(value).join('') === input" property false for gibberish inputs.
// We test round-trip on a generator that only emits well-formed sequences,
// which is where the round-trip guarantee actually matters.

const textRun = fc
  .string({
    unit: fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz 0123456789"),
    maxLength: 8,
  })
  .filter((s) => s.length > 0);

// ESC '[' <digits>(;<digits>)* 'm' — SGR
const csiSgr = fc
  .array(fc.integer({ min: 0, max: 107 }).map(String), {
    minLength: 1,
    maxLength: 4,
  })
  .map((params) => `[${params.join(";")}m`);

// ESC ']' <payload> ESC '\' — OSC with ST terminator
const oscHyperlink = fc
  .string({
    unit: fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789:/."),
    maxLength: 12,
  })
  .map((payload) => `]8;;${payload}\\`);

// C1 CSI (single 0x9b byte introducer)
const c1Csi = fc
  .integer({ min: 0, max: 50 })
  .map(String)
  .map((p) => `${p}m`);

const fragment = fc.oneof(textRun, csiSgr, oscHyperlink, c1Csi);

const wellFormedInput = fc
  .array(fragment, { minLength: 1, maxLength: 8 })
  .map((parts) => parts.join(""));

// Broader alphabet that may include lone ESCs, used for properties that hold
// universally (CSI field consistency, no invented bytes).
const ansiUnit = fc.constantFrom(
  "\x1b",
  "[",
  "]",
  "P",
  "^",
  "_",
  "X",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "\x07",
  "\\",
  "0",
  "1",
  "2",
  "3",
  ";",
  ":",
  "?",
  " ",
  "/",
  "!",
  "m",
  "q",
  "H",
  "A",
  "a",
  "x",
);
const arbitraryInput = fc.string({ unit: ansiUnit, maxLength: 60 });

describe("tokenizeAnsi — properties", () => {
  it("round-trip: well-formed ANSI input reconstructs exactly from token.value", () => {
    fc.assert(
      fc.property(wellFormedInput, (input) => {
        const tokens = tokenizeAnsi(input);
        const reconstructed = tokens.map((token) => token.value).join("");
        expect(reconstructed).toBe(input);
      }),
      { numRuns: 500 },
    );
  });

  it("every CSI token carries the bytes its component fields describe", () => {
    fc.assert(
      fc.property(arbitraryInput, (input) => {
        for (const token of tokenizeAnsi(input)) {
          if (token.type !== "csi") continue;
          const tail = token.parameterString + token.intermediateString + token.finalCharacter;
          expect(token.value.endsWith(tail)).toBe(true);
        }
      }),
      { numRuns: 300 },
    );
  });

  it("parser never invents bytes — joined token values are a subsequence of input", () => {
    fc.assert(
      fc.property(arbitraryInput, (input) => {
        const joined = tokenizeAnsi(input)
          .map((token) => token.value)
          .join("");
        // joined must be input with zero or more lone-ESC bytes removed —
        // walk both in lockstep and skip past unmatched chars in input.
        let i = 0;
        for (const ch of joined) {
          while (i < input.length && input[i] !== ch) i += 1;
          expect(i).toBeLessThan(input.length);
          i += 1;
        }
      }),
      { numRuns: 300 },
    );
  });
});
