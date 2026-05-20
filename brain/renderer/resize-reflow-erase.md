# Width-shrink resize needs a wrap-aware erase

When the terminal narrows, the previously rendered frame's logical lines
reflow in the buffer — each line now occupies more visual rows than it did
at the wider width. The renderer's `onResize` used to just reset
`lastLineCount = 0` and repaint, leaving the wrapped tail of the old frame
stranded above the new one. This is the "duplicate terminal" symptom seen
in the playground on mobile widths.

Ink does this at `repos/ink/src/ink.tsx:459`:

```ts
if (currentWidth < this.lastTerminalWidth) {
  this.log.clear(); // walks back lastLineCount + 1 lines
  ...
}
```

That's incomplete — `log-update`'s `clear()` only erases `lineCount + 1`
rows, not the reflowed-visual-row count. In xterm.js (and any terminal
that reflows on width change) you can still see the wrapped tail above
the new paint.

## The fix in vue-ink

`render.ts` `onResize` now:

1. Tracks `lastTerminalWidth` (initialized at mount time).
2. On every resize: if `currentWidth < lastTerminalWidth`, compute the
   reflowed visual row count for `lastOutputLines` at the new width and
   erase that many lines (plus the trailing slot). Then reset state and
   `renderImmediate`.

The reflowed-row helper (`countReflowedRows`) lives at the top of
`render.ts` and uses `string-width` for cell-accurate widths, so wide
CJK / emoji columns are counted correctly.

## Why not just clear the whole screen?

`\x1B[H\x1B[2J` would nuke any content above the frame too — e.g. a
user's earlier `console.log` line written via `writeAboveFrame`. The
wrap-aware erase walks back exactly the rows our frame occupied.

## Why not erase before reset only when the wrap is small?

The wrap-aware path subsumes the small case: when no line exceeds `cols`,
`countReflowedRows` returns `lastLineCount`, so the math reduces to
`eraseLines(lastLineCount + 1)` — same as the pre-fix behaviour.

## Tracked by

- `packages/vue-ink/test/ResizeReflowErase.test.ts` — asserts the
  wrap-aware erase count for a frame that wraps on shrink, and that
  widening does NOT trigger the extra erase.

## Related

- [[output-hot-path]] — `lastOutputLines` lives here too; we read it
  during resize to compute the reflowed row count.
