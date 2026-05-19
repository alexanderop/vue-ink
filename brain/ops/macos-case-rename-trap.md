# PascalCase renames on macOS need a two-step `git mv`

macOS's case-insensitive default filesystem treats `foo.ts` and `Foo.ts`
as the same path. A direct `git mv foo.ts Foo.ts` lets git track the
rename but **the on-disk file isn't propagated** — both names end up
indexed simultaneously, and CI (case-sensitive Linux) sees a duplicate.

Pattern that actually moves the file:

```bash
git mv foo.ts foo.ts.tmp
git mv foo.ts.tmp Foo.ts
```

Recurs whenever someone normalises a test or component to PascalCase
(see [[../../memory/feedback_test_file_naming|test naming convention]]).
Catches us roughly once per rename sweep.

## Related

- [[../testing/file-per-concept]] — test layout cleanup that triggers most of these renames
- [[agent-hooks]] — the lint/format hooks that run on renamed files
