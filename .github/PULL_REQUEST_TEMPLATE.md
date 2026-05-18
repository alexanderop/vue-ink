<!--
Thanks for sending a PR to vue-ink! A few quick notes:
- Keep the PR focused — one logical change per PR makes review (and revert) much easier.
- If this is your first PR here, glance at AGENTS.md / CLAUDE.md for the repo conventions.
-->

### Linked issue

Fixes #

<!-- If there's no issue, briefly say why (e.g. trivial typo, infra) so reviewers don't have to ask. -->

### Summary

<!-- What does this change do, and why? A short paragraph is fine. If the diff is large, point at the load-bearing files. -->

### Test plan

- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` succeeds
- [ ] Added or updated tests covering the new behaviour (or explained why no test is feasible)
- [ ] Manually exercised the affected component / hook in an example app or `learning/from-scratch.ts`

### Changeset

- [ ] I ran `pnpm changeset` for any user-visible change (new feature, bug fix, breaking change, public API tweak).
- [ ] No changeset needed — this PR is internal-only (refactor, tests, CI, docs, brain notes).

<!-- If you added a changeset, link the file here, e.g. `.changeset/witty-pandas-jump.md` -->

### Terminal / PTY verification

<!--
vue-ink is a terminal renderer. Anything that touches stdin, stdout, raw mode, ANSI output, the node-pty path, or CI/non-TTY detection should be verified on a real terminal.

Tick at least one for PTY-affecting changes. If this PR doesn't touch terminal I/O, write "N/A".
-->

- [ ] macOS Terminal.app
- [ ] iTerm2
- [ ] Linux pty (e.g. GNOME Terminal, Konsole, Alacritty, Kitty)
- [ ] Windows Terminal
- [ ] N/A — this PR does not affect terminal I/O

### Additional notes

<!-- Screenshots, asciinema recordings, follow-up work, anything reviewers should know. -->
