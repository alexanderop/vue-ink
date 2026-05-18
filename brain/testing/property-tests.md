# Property-based tests with fast-check

Files: `*Properties.test.ts` next to the example-based suite they complement.
Currently: `InputParser`, `AnsiTokenizer`, `WrapText`, `SquashTextNodes`,
`Colorize`. Each one targets a pure function with stable invariants.

## Why they're worth their cost

Property tests are slower to write and shrink-debug than example tests, but
they pay back when the function has a wide input space and an invariant that
a human enumerator would miss. Two real bugs caught so far:

- **`wrap-text.ts` cache key collision** (May 2026) — the key
  `text + String(maxWidth) + String(wrapType)` collided between e.g.
  `wrapText('', 17, 'hard')` and `wrapText('1', 7, 'hard')` (both → `'17hard'`).
  The hard-mode content-preservation property
  (`wrapped.replace(/\n/g, '') === text`) passed in isolation and failed when
  other wrap-text tests had poisoned the cache. Fixed by switching to NUL
  separators (safe because both callers feed sanitized text — `sanitizeAnsi`
  strips NUL).
- **`ansi-tokenizer.ts` lone-ESC drop** (May 2026) — a naive
  `tokens.map(t => t.value).join('') === input` round-trip on gibberish
  inputs revealed that lone ESC bytes (ESC not followed by a known intro)
  are silently dropped by the parser. The behaviour is intentional, but the
  invariant needed to be restated: round-trip holds on a generator of
  _well-formed_ sequences, and on arbitrary input the joined values are a
  subsequence of the input.

## Patterns that recur

- **Constrain the alphabet to protocol-significant bytes.** Random Unicode
  hammers Unicode handling and misses parser-state bugs. The input-parser
  test uses `fc.constantFrom('\x1b', '[', 'm', …)`; the tokenizer test does
  the same. Fast generation, dense coverage of branch boundaries.
- **Generate well-formed inputs for round-trip; arbitrary inputs for "never
  invent bytes" / subsequence properties.** The two questions are different
  and the same generator can't answer both honestly.
- **Idempotency is a cheap, high-signal property.** `f(f(x)) === f(x)` holds
  for sanitizers, wrappers, and most pure normalisers — and when it doesn't,
  the failure usually reveals a real cache-pollution or state-leakage bug.
- **Skip "no adjacent X tokens" properties** unless the source code actively
  guarantees it. Most coalescers have escape hatches (e.g. lone-ESC skip
  re-splits a text run) that look like bugs but aren't.

## When NOT to reach for fast-check

Component rendering, layout, and side-effect tests — too many degrees of
freedom, shrinking lands on unreadable counterexamples, the example-based
trophy in [[ink-strategy]] is faster to write and more diagnostic. Save
property tests for pure functions whose contract is statable in one line.

## Related

- [[ink-strategy]] — the example-based trophy that property tests sit on top of.
- [[principles/prove-it-works]] — property tests prove a class of behaviour,
  not a point.
