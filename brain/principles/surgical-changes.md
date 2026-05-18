# Surgical Changes

Every changed line must trace directly to the requested task. Touch only what you must; clean up only the mess your own change created.

**Why:** Drive-by edits inflate diffs, mask the real change in review, and break orthogonal code the editor didn't fully understand. Unrequested "improvements" are the most common source of regressions in otherwise correct PRs.

**Pattern:**

- Don't refactor adjacent code, reformat, or "improve" comments that weren't part of the task
- Match existing style even if you'd write it differently — style debates belong in their own PR
- If you notice unrelated dead code or a latent bug, surface it; don't silently delete or fix it
- Remove imports, variables, and helpers that _your_ change orphaned — leave pre-existing dead code alone unless asked
- When a refactor seems necessary to land the change cleanly, name it and ask first

**The Test:** For every hunk in the diff, can you point to the line in the user's request that required it? If not, revert that hunk.

**Tension with [[subtract-before-you-add]]:** Subtract-first applies when _planning_ a change (delete dead weight before building on it). Surgical-changes applies when _executing_ a scoped task (don't expand scope on the way through). When in doubt, propose the deletion separately rather than smuggling it into an unrelated PR.
