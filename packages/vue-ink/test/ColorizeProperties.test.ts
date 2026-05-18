import { describe, it, expect } from "vitest";
import fc from "fast-check";
import stripAnsi from "strip-ansi";
import { colorize, sanitizeAnsi } from "@vue-ink/core";

// Printable ASCII without ESC/C0 controls — stripAnsi on input is a no-op,
// so the round-trip target is `s` itself.
const printable = fc.string({
  unit: fc.constantFrom(..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 !?-_"),
  maxLength: 40,
});

const namedColor = fc.constantFrom(
  "red",
  "green",
  "blue",
  "yellow",
  "magenta",
  "cyan",
  "white",
  "gray",
);
const hexColor = fc
  .tuple(
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
  )
  .map(
    ([r, g, b]) =>
      `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`,
  );
const ansi256Color = fc.integer({ min: 0, max: 255 }).map((n) => `ansi256(${n})`);
const rgbColor = fc
  .tuple(
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
  )
  .map(([r, g, b]) => `rgb(${r}, ${g}, ${b})`);

const anyColor = fc.oneof(namedColor, hexColor, ansi256Color, rgbColor);
const colorType = fc.constantFrom("foreground" as const, "background" as const);

describe("colorize — properties", () => {
  it("round-trip: stripAnsi(colorize(s, color, type)) === s", () => {
    fc.assert(
      fc.property(printable, anyColor, colorType, (text, color, type) => {
        const coloured = colorize(text, color, type);
        expect(stripAnsi(coloured)).toBe(text);
      }),
      { numRuns: 500 },
    );
  });

  it("colorize is a no-op when color is undefined", () => {
    fc.assert(
      fc.property(printable, colorType, (text, type) => {
        expect(colorize(text, undefined, type)).toBe(text);
      }),
      { numRuns: 100 },
    );
  });

  it("non-empty inputs gain bytes when a color is applied (escape sequences are emitted)", () => {
    fc.assert(
      fc.property(
        printable.filter((s) => s.length > 0),
        namedColor,
        colorType,
        (text, color, type) => {
          const coloured = colorize(text, color, type);
          // Coloured output must be strictly longer than the plain text
          // (it carries SGR enter + reset around the payload).
          expect(coloured.length).toBeGreaterThan(text.length);
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe("sanitizeAnsi — properties", () => {
  it("idempotency: sanitizeAnsi(sanitizeAnsi(s)) === sanitizeAnsi(s)", () => {
    // Any input — including ESC, C1, malformed bytes — must reach a fixed
    // point after one pass. Without this, a later sanitize call could keep
    // peeling bytes off output, which would break renderer assumptions
    // (the renderer sanitises text node values once on write).
    const broadAlphabet = fc.constantFrom(
      ..."abc 0123",
      "\x1b",
      "[",
      "]",
      "m",
      "\x07",
      "\x08",
      "\x7f",
      "\r",
      "\n",
      "\t",
      "",
      "",
    );
    fc.assert(
      fc.property(fc.string({ unit: broadAlphabet, maxLength: 40 }), (input) => {
        const once = sanitizeAnsi(input);
        expect(sanitizeAnsi(once)).toBe(once);
      }),
      { numRuns: 500 },
    );
  });

  it("preserves SGR sequences emitted by colorize", () => {
    // Colorize emits exactly the SGR-final-byte CSI sequences sanitizeAnsi
    // keeps. Feeding its output back through sanitizeAnsi should round-trip.
    fc.assert(
      fc.property(printable, anyColor, colorType, (text, color, type) => {
        const coloured = colorize(text, color, type);
        expect(sanitizeAnsi(coloured)).toBe(coloured);
      }),
      { numRuns: 300 },
    );
  });

  it("strips lone C0 controls from plain text (visible content equals input)", () => {
    // Inject random BEL/BS/DEL bytes among printable text; sanitize should
    // drop them and the visible text equals the input minus those bytes.
    const noisyText = fc.array(
      fc.oneof(
        printable.filter((s) => s.length > 0),
        fc.constantFrom("\x07", "\x08", "\x7f"),
      ),
      { minLength: 1, maxLength: 10 },
    );
    fc.assert(
      fc.property(noisyText, (parts) => {
        const input = parts.join("");
        const sanitized = sanitizeAnsi(input);
        const expected = input.replace(/[\x07\x08\x7f]/g, "");
        expect(sanitized).toBe(expected);
      }),
      { numRuns: 300 },
    );
  });
});
