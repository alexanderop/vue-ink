import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import PipelineComparison from './components/PipelineComparison.vue'
import GridComparison from './components/GridComparison.vue'

export default {
	extends: DefaultTheme,
	enhanceApp({ app }) {
		app.component('PipelineComparison', PipelineComparison)
		app.component('GridComparison', GridComparison)
	},
} satisfies Theme
