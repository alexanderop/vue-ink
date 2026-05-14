# Error boundary + error overview

## Why
Today, a thrown render error is caught by `app.config.errorHandler` and the app unmounts with the stack dumped to stderr. Ink instead renders a structured `<ErrorOverview>` (file + line + code frame) above a half-painted frame and keeps stderr clean. Helps users debug their own components.

## Scope
- Implement `ErrorOverview` component in `@vue-ink/components` rendering: error name+message, source frame (read via `node:fs`), stack lines. Match `repos/ink/src/components/ErrorOverview.tsx` output.
- Wrap the user component in `render.ts` with `<ErrorBoundary>` (Vue equivalent: `onErrorCaptured` on a wrapper component). On catch, swap the rendered tree to `<ErrorOverview :error="..." />`.
- Continue to call `app.config.errorHandler` for telemetry but do not unmount automatically.
- `useApp().exit(err)` from inside the boundary should still tear down.

## Acceptance criteria
- A child component that throws on render shows ErrorOverview, app stays alive.
- `Ctrl+C` exits cleanly.
- `waitUntilExit()` rejects with the error if `exit(err)` is called.

## References
- Ink source: `repos/ink/src/components/ErrorBoundary.tsx`, `ErrorOverview.tsx`
- Vue equivalent of `componentDidCatch`: `onErrorCaptured` (composable).
