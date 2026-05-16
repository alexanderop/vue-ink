# Wide-char overlay boundary cleanup

Wide characters (CJK, emoji) occupy two cells in the host frame buffer:
a **leading cell** holding the glyph (`fullWidth: true`) and a **trailing
placeholder** with `value: ''` and the same styles. The renderer relies on
this representation so column arithmetic stays grid-aligned.

When an absolute-positioned or overlay write lands on top of an existing
wide char, the placeholder pair gets desynced and the terminal renders a
half-visible glyph (or worse, the next cell smears). `Output.write` must
clean up the boundaries in two places, mirroring `repos/ink/src/output.ts`:

1. **Left boundary.** If the write starts on a trailing placeholder
   (`currentLine[offsetX].value === ''` *and* the cell to its left is a
   wide char), replace that left neighbour with a space — its trailing
   half is about to be overwritten.
2. **Right boundary.** After the write loop, if `offsetX` lands on a
   trailing placeholder (`value === ''`), replace it with a space — its
   leading half was just overwritten.

Both checks live in `packages/core/src/output.ts` (~line 185 and ~225).
The boundary cleanup is mandatory; without it, `TextWidth.test.ts` fails
on the absolute-overlay-on-CJK cases and real apps that draw modals over
text containing wide chars render glitched glyphs.

The trailing placeholder's `value === ''` (empty string, not a space) is
load-bearing — `stringifyRow` knows to skip it, `getStringWidth` returns
0 for it, and the boundary checks use it as the cue that "this column is
the right half of a wide neighbour". Don't normalise placeholders to
spaces anywhere.

## Related

- [[output-hot-path]] — the surrounding write/stringify pipeline
- [[../testing/ink-strategy]] — wide-char cases live in `TextWidth.test.ts`
