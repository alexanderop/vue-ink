---
name: ink-open-pain-points
description: Top unresolved react-ink issues with proposed solutions — wedges where vue-ink can ship features ink hasn't merged
---

# Open ink pain points vue-ink can lead on

Snapshot of high-leverage gaps in react-ink as of 2026-05-18, mined from
`vadimdemedes/ink` issues. These move slowly — ink has a small maintainer
bandwidth — so the list is durable for scoping where vue-ink can ship first.

Verify against the live issue tracker before committing; reaction counts and
status drift, but the underlying API shape proposals tend to stay put.

## Scroll primitives — ink #765 (sindresorhus-designed, unshipped) + #222

Most-requested missing surface. ink's designed-but-unshipped proposal:

- `contentOffsetX` / `contentOffsetY` props on `<Box>` for viewport translation
- Extend `useBoxMetrics` with `scrollWidth`, `scrollHeight`, `clientWidth`, `clientHeight`
- `ResizeObserver`-style composable (Vue makes this trivial vs React's `useLayoutEffect` + state dance)

Our `useBoxMetrics` only exposes `width/height/left/top` — adding the four
content-size fields is the obvious next step. ink is "waiting for Gemini CLI to
battle-test" before merging, leaving the door open.

## CJK / IME input — ink #759, ink-ui #18

Community-converged fix lives in forks (jacob314's Gemini fork, koshikawa-masato's
fork) but ink hasn't merged: **CURSOR_MARKER technique**. Insert a non-visual
SGR escape (`ESC[999m`) at the rendered cursor position; swap to `ESC[s` at
write time. Avoids the IME timing race entirely. Pair with East-Asian-Width
correct cursor column math.

## Multi-line `<TextInput>` / textarea — ink #676, #660, ink-ui #9

Open for years. ink-ui still doesn't ship one; users fork it (`react-ink-textarea`
et al). Belongs in `@vue-ink/components`.

## `suspendOutput()` / `resumeOutput()` on `useStdout` — ink #956

Lets users shell out to `git diff | less` or `$EDITOR` without the renderer
fighting for the screen. Small, clean QoL.

## Scrollback-safe full clears — ink #935

ink's render loop still emits `CSI 2J + CSI H` which destroys scrollback on
ConPTY/xterm.js. Audit our hot path against this. See [[../renderer/output-hot-path]].

## `<Cursor anchorRef>` ergonomics — ink #870

Current `useCursor` inherits the same "component must know its absolute
position" papercut. ink PR #872 exists but isn't shipped — we can ship the
better anchor-ref API now.

## i18n primitives — ink #779

`composeTextFragments(fragments)` + `TextFragment` type for i18n authors. Tiny.
Landed nowhere in ink.

## Free wins already in our favor

- `onMounted` runs synchronously after layout commit → ink #773 ("useLayoutEffect
  should be immediate") is a non-issue for us
- Reactivity → resize/scroll state is just `ref`s, no scheduler tricks
- No React 19 scheduler tax (ink #714 / #816 — duplicate renders on resize)

Related: [[api-tracker]], [[tracker-drift]], [[from-react-ink]].
