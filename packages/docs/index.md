---
layout: home

hero:
  name: vue-ink
  text: Vue components, in the terminal.
  tagline: A Vue 3 port of Ink. Build interactive CLIs with the framework you already know — Yoga flexbox, ANSI, raw-mode stdin, all hidden behind <Box> and <Text>.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: How it works
      link: /guide/how-it-works
    - theme: alt
      text: View on GitHub
      link: https://github.com/alexanderop/vue-ink

features:
  - title: Familiar Vue
    details: SFCs, reactivity, composables, devtools. If you can build a Vue app, you can build a TUI.
  - title: Flexbox layout
    details: <Box> and <Text> are powered by Yoga — the same flexbox engine Ink and React Native use.
  - title: Ink parity
    details: All components, composables, and render() options from React Ink are ported. See the parity table.
  - title: Reactive re-renders
    details: Vue's scheduler drives frame updates. Coalesced bursts paint once; the hot path is character-cell diffing, not layout.
  - title: Testing-ready
    details: '@vue-ink/testing-library mirrors ink-testing-library — lastFrame(), frames, fake stdin/stdout.'
  - title: Screen-reader aware
    details: aria-label, aria-hidden, aria-role, aria-state on Box and Text feed a separate accessibility walker.
---

## Quick install

```sh
npm install vueink vue
```

```ts
import { render, Text } from 'vueink'
import { defineComponent, h } from 'vue'

const App = defineComponent({
	setup() {
		return () => h(Text, { color: 'green' }, () => 'Hello world')
	},
})

render(App)
```

> Requires Node.js `>=22`. The package is published as `vueink` on npm (the `vue-ink` name was taken). The project is still called vue-ink everywhere else.
