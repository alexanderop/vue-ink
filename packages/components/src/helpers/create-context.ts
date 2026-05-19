import { inject, provide, type InjectionKey } from "vue";

/**
 * Pair a typed `InjectionKey` with `[useFoo, provideFoo]` accessors. Mirrors
 * the ergonomics of `createContext` in reka-ui / shadcn-vue: one call yields
 * both sides of the provide/inject pair, the symbol stays private, and the
 * call site reads as a normal composable.
 *
 * Pass `{ global: true }` to seed the underlying symbol via
 * `Symbol.for(name)` so multiple packages can share identity through Node's
 * global symbol registry (used by `[[accessibility-context]]` between
 * `@vue-ink/components` and `@vue-ink/renderer`). Without the flag a fresh
 * local `Symbol(name)` is generated.
 *
 * The returned `useFoo()` returns `T | undefined` — every current consumer
 * has a sensible fallback when no provider is mounted. A required variant
 * lives next to `requireContext` in the renderer package.
 */
export const createContext = <T>(
  name: string,
  options: { global?: boolean } = {},
): readonly [() => T | undefined, (value: T) => void] => {
  const key = (options.global ? Symbol.for(name) : Symbol(name)) as InjectionKey<T>;
  // Pass `undefined` as the default so Vue suppresses the "injection not
  // found" warning when a consumer mounts outside any provider. Every
  // current consumer has its own `?? fallback`, so the runtime behaviour is
  // identical to `inject(key)` — only the warning differs.
  return [() => inject(key, undefined), (value: T) => provide(key, value)] as const;
};
