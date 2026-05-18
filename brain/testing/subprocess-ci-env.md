# Subprocess fixtures must DELETE CI vars, not override them

`render()` chooses interactive vs non-interactive via `isCiEnv()` in
`packages/renderer/src/render.ts`. After [[../renderer/ci-detection]] was
tightened, `CI=false` parses correctly — but `BUILD_NUMBER` and `RUN_ID`
are still **presence-only**: any value (including `'false'`) flips the
renderer to non-interactive. PTY fixtures then see no `<Static>` output and
no raw-mode input handling, and assertions silently fail.

When spawning a fixture (see `packages/vue-ink/test/fixtures/runFixture.ts`),
**delete** the four vars from the child env instead of overriding them:

```ts
const env = { ...process.env };
delete env["CI"];
delete env["CONTINUOUS_INTEGRATION"];
delete env["BUILD_NUMBER"];
delete env["RUN_ID"];
```

This trap is the reason `exit.tsx`'s `<Static>` cases were the last test
gap closed.

## Related

- [[ink-strategy]] — the broader PTY-fixture pattern
- [[../porting/test-port-status]] — where this trap was first hit
