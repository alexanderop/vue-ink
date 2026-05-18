---
name: Bug report
about: Report a problem with vue-ink (rendering glitches, crashes, unexpected output)
title: 'bug: '
labels: bug
assignees: ''
---

### Environment

- **vue-ink version**: <!-- e.g. 0.0.1 (run `npm ls vueink`) -->
- **Node version**: <!-- e.g. 22.5.0 (run `node -v`) -->
- **OS**: <!-- e.g. macOS 14.5, Ubuntu 24.04, Windows 11 -->
- **Terminal emulator**: <!-- e.g. iTerm2 3.5, Kitty 0.36, Windows Terminal 1.20, VS Code integrated terminal, Alacritty -->
- **`process.stdout.isTTY`**: <!-- true / false / undefined -->
- **`process.env.TERM`**: <!-- e.g. xterm-256color, xterm-kitty, screen, dumb -->

### Pre-flight checklist

- [ ] I searched [existing issues](https://github.com/alexanderop/vue-ink/issues?q=is%3Aissue) and didn't find a duplicate.
- [ ] I tried reproducing on the latest `vueink` release.
- [ ] If the bug only appears in CI or a non-TTY environment, I've noted that below.
- [ ] If this is upstream Ink behaviour we intentionally mirror, I've checked [ink](https://github.com/vadimdemedes/ink/issues) too.

### Minimal reproduction

<!--
Provide a minimal, self-contained reproduction. One of:
- A link to a Codesandbox / StackBlitz / GitHub repo
- A short script (ideally < 30 lines) pasted below

Reproductions that depend on a private codebase or large app are very hard to debug — please trim.
-->

```ts
// paste minimal repro here
```

### Expected output

<!-- What did you expect to see in the terminal? A screenshot, ANSI dump, or plain-text mockup is great. -->

### Actual output

<!-- What did you actually see? Screenshot, terminal recording (asciinema), or pasted output. If output contains escape codes, pasting the raw bytes (e.g. `xxd`) often helps. -->

### Additional context

<!-- Stack traces, related issues, anything else worth knowing. -->
