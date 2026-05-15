/**
 * vue-ink in ~80 lines — a learning reference.
 *
 * No dependencies. Just node:process. Demonstrates that the whole stack is:
 *
 *   1. ANSI escape codes on stdout
 *   2. A "frame" = string of lines you overwrite each tick
 *   3. A toy layout step (real vue-ink uses Yoga)
 *   4. Raw-mode stdin → key events
 *
 * Run:
 *   pnpm tsx learning/from-scratch.ts
 *
 * Then: space increments the counter, ↑/↓ moves the selection, q quits.
 *
 * Mapping back to the real codebase (see brain/renderer/how-it-works.md):
 *
 *   POC piece               Real vue-ink
 *   ─────────────────────── ──────────────────────────────────────────────
 *   Box / Text types        ink-box / ink-text in packages/core/src/dom.ts
 *   layout()                Yoga.calculateLayout + text measure functions
 *   paint()                 Output.get() + Renderer.write()
 *   cursorUp(prev)          rewind step in packages/renderer/src/render.ts
 *   stdin.on('data')        input pipeline (parser → keypress → dispatch)
 *   mutate state + render() Vue reactivity flushing the schedule queue
 */

import { stdin, stdout } from 'node:process'

// ─── 1. ANSI helpers ─────────────────────────────────────────────────────────
// The terminal is a byte stream. "Rich" behavior (color, cursor movement) is
// just special byte sequences the terminal interprets instead of printing.
const ESC = '\x1b'
const cursorUp = (n: number) => (n > 0 ? `${ESC}[${n}A` : '')
const clearLine = `${ESC}[2K`
const hideCursor = `${ESC}[?25l`
const showCursor = `${ESC}[?25h`
const fg = (code: number, s: string) => `${ESC}[${code}m${s}${ESC}[0m`
const red = (s: string) => fg(31, s)
const green = (s: string) => fg(32, s)
const dim = (s: string) => fg(2, s)

// ─── 2. Tiny "DOM" ───────────────────────────────────────────────────────────
// Real vue-ink has a custom node tree in packages/core/src/dom.ts. Here we
// collapse it to two node types: a Box (container) and Text (leaf).
type Box = { kind: 'box', dir: 'row' | 'col', children: Node[] }
type Text = { kind: 'text', value: string, color?: 'red' | 'green' }
type Node = Box | Text

const box = (dir: 'row' | 'col', ...children: Node[]): Box => ({ kind: 'box', dir, children })
const text = (value: string, color?: 'red' | 'green'): Text => ({ kind: 'text', value, color })

// ─── 3. Layout (the "Yoga" step, dumbed way down) ────────────────────────────
// Real vue-ink hands the tree to Yoga (WASM flexbox) which fills in
// {x, y, width, height} for every node. Here: vertical stacks = newlines,
// horizontal rows = concatenate (assuming each child is one line).
const layout = (node: Node): string[] => {
  if (node.kind === 'text') {
    const colored = node.color === 'red'
      ? red(node.value)
      : node.color === 'green'
        ? green(node.value)
        : node.value
    return [colored]
  }
  const childLines = node.children.map(layout)
  if (node.dir === 'col') return childLines.flat()
  return [childLines.map(c => c[0] ?? '').join(' ')]
}

// ─── 4. The frame trick ──────────────────────────────────────────────────────
// Every paint we rewind the cursor over the previous N lines and overwrite
// them. From the outside it looks like a "live updating" screen; it's really
// just repeated overwrites of the same lines. This is what Renderer.write()
// does in packages/renderer/src/renderer.ts.
let prevLineCount = 0
const paint = (root: Node): void => {
  const lines = layout(root)
  let out = cursorUp(prevLineCount)
  for (const line of lines) out += `${clearLine + line  }\n`
  stdout.write(out)
  prevLineCount = lines.length
}

// ─── 5. State + render loop ──────────────────────────────────────────────────
// Real vue-ink has Vue reactivity here: `ref(0).value++` schedules a flush,
// and the renderer rebuilds the frame. Here we mutate plain locals and call
// render() by hand — same idea, no scheduler.
let counter = 0
let selected: 'a' | 'b' = 'a'

const render = (): void => {
  paint(
    box('col',
      text('— vue-ink in 80 lines —', 'green'),
      text(`counter: ${counter}`),
      box('row',
        text(selected === 'a' ? '> A' : '  A', selected === 'a' ? 'red' : undefined),
        text(selected === 'b' ? '> B' : '  B', selected === 'b' ? 'red' : undefined),
      ),
      text(dim('↑/↓ select   space ++   q quit')),
    ),
  )
}

// ─── 6. Raw-mode stdin → key events ──────────────────────────────────────────
// By default Node buffers stdin until newline. setRawMode(true) gives us
// every keystroke as it arrives. Arrow keys come through as ANSI escapes
// (e.g. up = "\x1b[A") — same encoding as the output side.
// Real vue-ink has a three-layer parser (see brain/renderer/input-pipeline.md)
// to handle kitty, paste, multi-byte unicode, etc. This is the toy version.
if (!stdin.isTTY) {
  console.error('This demo needs an interactive terminal — run it directly, not piped.')
  process.exit(1)
}
stdin.setRawMode(true)
stdin.resume()
stdout.write(hideCursor)

stdin.on('data', (buf) => {
  const s = buf.toString()
  if (s === 'q' || s === '\x03') {
    stdout.write(`${showCursor  }\n`)
    process.exit(0)
  }
  if (s === ' ') counter += 1
  if (s === '\x1b[A') selected = 'a'
  if (s === '\x1b[B') selected = 'b'
  render()
})

render()
