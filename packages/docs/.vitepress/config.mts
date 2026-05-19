import { defineConfig } from "vitepress";

export default defineConfig({
  lang: "en-US",
  title: "vue-ink",
  description: "Vue 3 port of Ink — render Vue components to the terminal.",
  base: "/vue-ink/",
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ["link", { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" }],
    ["meta", { name: "theme-color", content: "#42b883" }],
  ],
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/getting-started", activeMatch: "/guide/" },
      { text: "API", link: "/api/render", activeMatch: "/api/" },
      { text: "Parity", link: "/reference/ink-parity" },
      { text: "Playground", link: "/playground/", target: "_self" },
      {
        text: "Packages",
        items: [
          { text: "vueink (umbrella)", link: "https://www.npmjs.com/package/vueink" },
          {
            text: "@vue-ink/components",
            link: "https://www.npmjs.com/package/@vue-ink/components",
          },
          { text: "@vue-ink/renderer", link: "https://www.npmjs.com/package/@vue-ink/renderer" },
          { text: "@vue-ink/core", link: "https://www.npmjs.com/package/@vue-ink/core" },
          {
            text: "@vue-ink/testing-library",
            link: "https://www.npmjs.com/package/@vue-ink/testing-library",
          },
        ],
      },
    ],
    sidebar: {
      "/guide/": [
        {
          text: "Introduction",
          items: [
            { text: "Getting Started", link: "/guide/getting-started" },
            { text: "How it works", link: "/guide/how-it-works" },
          ],
        },
        {
          text: "Recipes",
          items: [
            { text: "SFC setup", link: "/guide/sfc-setup" },
            { text: "Common patterns", link: "/guide/recipes" },
            { text: "Testing", link: "/guide/testing" },
            { text: "Vue DevTools", link: "/guide/devtools" },
            { text: "Migrating from Ink", link: "/guide/migrating-from-ink" },
          ],
        },
      ],
      "/api/": [
        {
          text: "Top-level",
          items: [
            { text: "render", link: "/api/render" },
            { text: "renderToString", link: "/api/render-to-string" },
            { text: "measureElement", link: "/api/measure-element" },
          ],
        },
        {
          text: "Components",
          items: [
            { text: "Box", link: "/api/components#box" },
            { text: "Text", link: "/api/components#text" },
            { text: "Newline", link: "/api/components#newline" },
            { text: "Spacer", link: "/api/components#spacer" },
            { text: "Static", link: "/api/components#static" },
            { text: "Transform", link: "/api/components#transform" },
          ],
          link: "/api/components",
        },
        {
          text: "Composables",
          items: [
            { text: "useInput", link: "/api/composables#useinput" },
            { text: "usePaste", link: "/api/composables#usepaste" },
            { text: "useApp", link: "/api/composables#useapp" },
            { text: "useStdin / useStdout / useStderr", link: "/api/composables#stdio" },
            { text: "useFocus / useFocusManager", link: "/api/composables#focus" },
            { text: "useWindowSize", link: "/api/composables#usewindowsize" },
            { text: "useBoxMetrics", link: "/api/composables#useboxmetrics" },
            { text: "useCursor", link: "/api/composables#usecursor" },
            { text: "useAnimation", link: "/api/composables#useanimation" },
            { text: "useIsScreenReaderEnabled", link: "/api/composables#screen-reader" },
          ],
          link: "/api/composables",
        },
      ],
      "/reference/": [
        {
          text: "Reference",
          items: [{ text: "Ink → vue-ink parity", link: "/reference/ink-parity" }],
        },
      ],
    },
    socialLinks: [{ icon: "github", link: "https://github.com/alexanderop/vue-ink" }],
    editLink: {
      pattern: "https://github.com/alexanderop/vue-ink/edit/main/packages/docs/:path",
      text: "Edit this page on GitHub",
    },
    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2026-present Alexander Opalic",
    },
    search: {
      provider: "local",
    },
    outline: { level: [2, 3], label: "On this page" },
  },
});
