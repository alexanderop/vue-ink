# `lefthook stage_fixed: true` can silently drop staged changes

`lefthook.yml` sets `stage_fixed: true` on the `lint` pre-commit hook.
The intent: if the linter autofixes a staged file, re-stage the fixed
version. The side effect: lefthook re-stages **only** the files the
linter touched, so any other partially-staged content can be replaced
by what's in the working tree at that moment.

Past incident: a `/push` flow where the lint hook rewrote a few files
ended up committing only the new files — `dist/` deletions, a
`.gitignore` change, and Box/Text/Transform edits had been staged but
were dropped when lefthook re-staged.

## How to apply

- Before letting `/push` run when you have a mixed-state index, do a
  full `git add -A` of everything you actually want in the commit so
  there's nothing for `stage_fixed` to "fix away."
- If a commit lands looking thinner than expected after lint, check
  `git stash list` and the reflog before retrying — the dropped content
  is still in the working tree.

## Related

- [[../principles/serialize-shared-state-mutations]] — the user and the lint hook are concurrent writers of the index; `stage_fixed` is the canonical "two actors mutating shared state" case in this repo.
