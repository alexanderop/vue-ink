---
name: text-outside-text-silently-dropped
description: vue-ink's createText returns an unattached host text node — a raw string inside <Box> produces empty output rather than ink's invariant error.
metadata:
  type: project
---

# Raw text outside `<Text>` is silently dropped

Ink throws when a text node lives outside a `<Text>` wrapper (dev-safety
invariant). Vue-ink does not — `createText` in
`packages/renderer/src/renderer.ts` returns a host text node and Yoga
never measures it, so the string vanishes and `renderToString` returns
`""` instead of erroring.

```vue
<Box>raw text</Box>
<!-- empty output, no warning -->
```

`packages/vue-ink/test/RenderToString.test.ts` asserts the current
behavior with a divergence comment ("does not throw when raw text
appears outside a <Text> wrapper").

## Why the divergence

Vue's host config splits node creation across `createElement` and
`createText`; the parent host isn't available at `createText` time the
way `hostContext.isInsideText` is in ink's reconciler. Throwing inside
`appendChild` once we know the parent is possible but would need a
runtime guard on every host insertion.

## How to apply

- Don't assume `renderToString` will throw on stray strings — write
  assertions against `stripAnsi(output)` instead of `expect(() =>
…).toThrow()`.
- When porting an ink test that asserts on the invariant error,
  invert it (see the RenderToString.test.ts comment as a template).
- If you ever fix the source, the lift is: pass parent-host context
  through the `appendChild` / `insert` paths and throw there, not in
  `createText`. Don't try to do it in `createText` itself — Vue
  doesn't expose the parent yet.

## Related

- [[nested-text-must-be-virtual]] — the related "text node lives
  inside Text" rewrite that runs at the component layer for the same
  reason (parent host isn't available in `createElement`).
- [[../porting/from-react-ink]] — reconciler landmines section.
