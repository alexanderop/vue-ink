# Subprocess fixtures must DELETE `CI`, not set it to `'false'`

`render()` decides between interactive and non-interactive mode via
`isCiEnv()` in `packages/renderer/src/render.ts` — an inlined copy of the
`is-in-ci` package. It's a plain `Boolean()` over four env vars:

```ts
Boolean(env['CI'] || env['CONTINUOUS_INTEGRATION'] || env['BUILD_NUMBER'] || env['RUN_ID'])
```

`Boolean('false') === true`. So passing `CI: 'false'` to a child process
**puts the renderer in non-interactive mode** — `<Static>` doesn't emit,
input handlers don't bind the way they would on a real TTY, and PTY-based
fixture assertions silently fail because the renderer never reached the
code path under test.

When spawning a fixture (see `packages/vue-ink/test/fixtures/runFixture.ts`),
**delete** the four vars from the child env instead of overriding them:

```ts
const env = { ...process.env };
delete env['CI'];
delete env['CONTINUOUS_INTEGRATION'];
delete env['BUILD_NUMBER'];
delete env['RUN_ID'];
```

This trap is the reason `exit.tsx`'s `<Static>` cases were the last test
gap closed — the fixture ran, the assertions failed, and the bug was a
single truthy string deep inside the parent env.

A follow-up worth doing: tighten `isCiEnv()` so the string `'false'`,
`'0'`, and `''` parse as not-in-CI. Until then, the delete-don't-set rule
is the contract every subprocess fixture needs to honour.

## Related

- [[ink-strategy]] — the broader PTY-fixture pattern
- [[../porting/test-port-status]] — where this trap was first hit
