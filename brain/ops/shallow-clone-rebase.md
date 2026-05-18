# Shallow clone breaks rebase diagnostics

The local checkout of `vue-ink` is a **shallow clone** (`git rev-parse --is-shallow-repository` → `true`). When a PR's commit sits at or near the shallow boundary, git misreports its history and rebases produce nonsense:

- `git rev-list --parents -n 1 <sha>` returns the commit with **no parent**
- `git show --stat <sha>` reports the entire shallow snapshot as the commit (e.g. 2947 files, 400k insertions for what is actually a 5-file bench addition)
- Rebasing onto `origin/main` produces enormous `add/add` conflicts in every file, because git sees the PR commit as a tree-from-nothing

**Fix:** `git fetch --unshallow` before doing any rebase or `git show` on PR branches. The shallow boundary file (`.git/shallow`) lists exactly which commits are the orphans.

**Why this matters:** the fake-huge diff almost prompted invasive surgery (cherry-picking specific files, rewriting commits) when the real problem was just "I cannot see the parent." Always check `--is-shallow-repository` when a single commit appears suspiciously large or parentless.

## Bonus: rebase auto-drops duplicate commits via patch-id

PR branches in this repo often carry 2–3 `test(ci): …` commits that were also cherry-picked onto main with different SHAs. A plain `git rebase origin/main` drops them automatically with `warning: skipped previously applied commit <sha>` — don't manually resolve those as conflicts.

## Related

- [[../principles/fix-root-causes]] — investigate the observation tool before assuming the system is broken
