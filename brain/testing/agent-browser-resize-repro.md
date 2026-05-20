# Reproducing resize bugs via agent-browser

`agent-browser` (the CLI used to drive the playground for visual bug
reproduction) has two non-obvious idioms that bit a session:

1. **The verb is `set viewport`, not `viewport`.** `agent-browser viewport
390 844` silently no-ops; check `agent-browser --help` and look for
   `set <prop>`-style commands.
2. **`set viewport` after `open` triggers a real resize event** in the
   open page. That's the only way to reproduce width-change bugs from the
   CLI — calling it before `open` just sets the initial size.

Canonical pattern for reproducing the playground "duplicate terminal" /
wrapped-frame symptom (see [[renderer/resize-reflow-erase]]):

```bash
agent-browser set viewport 1200 900
agent-browser open http://localhost:5173/
agent-browser wait --load networkidle
sleep 4              # let the embedded TerminalPreview paint
agent-browser screenshot /tmp/wide.png

agent-browser set viewport 390 844   # fires window.resize → xterm reflow
sleep 3
agent-browser screenshot /tmp/narrow.png
```

The `sleep` waits matter — the playground's REPL/Worker pipeline takes a
second or two after the page settles before the terminal is repainted.
`networkidle` alone fires too early.

## Related

- [[renderer/resize-reflow-erase]] — the bug this idiom reproduces.
- [[apps/playground-dual-execution]] — why the paint lags the page load.
