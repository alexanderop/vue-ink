# @vue-ink/testing-library

Test utilities for [vue-ink](https://github.com/alexanderop/vue-ink). Port of [ink-testing-library](https://github.com/vadimdemedes/ink-testing-library): `render()`, `lastFrame()`, `frames`, fake stdin/stdout/stderr.

```ts
import { render } from '@vue-ink/testing-library';
import App from './App.vue';

const { lastFrame, stdin, rerender, unmount } = render(App);
stdin.write('q');
expect(lastFrame()).toBe('bye');
```

## License

MIT — see the [LICENSE](./LICENSE).
