<script setup lang="ts">
interface Stage {
	label: string
	work: string
}

const browserStages: Stage[] = [
	{ label: 'Your code', work: 'count = 6' },
	{ label: 'Vue', work: 'patch 1 VNode' },
	{ label: 'Browser', work: 'repaint 1 line' },
	{ label: 'Screen', work: 'pixels updated' },
]

const vueinkStages: Stage[] = [
	{ label: 'Your code', work: 'count = 6' },
	{ label: 'Vue', work: 'patch 1 node' },
	{ label: 'vue-ink paint', work: 'rebuild every cell' },
	{ label: 'Terminal', work: 'prints bytes' },
]
</script>

<template>
	<div class="pipeline-wrap">
		<div class="pipeline browser">
			<h4>
				Browser
				<span class="tag good">incremental end-to-end</span>
			</h4>
			<div class="stages">
				<template v-for="(stage, i) in browserStages" :key="stage.label">
					<div class="stage good" :style="{ '--delay': `${i * 1.1}s` }">
						<div class="label">{{ stage.label }}</div>
						<div class="work">{{ stage.work }}</div>
					</div>
					<div v-if="i < browserStages.length - 1" class="arrow">→</div>
				</template>
			</div>
		</div>

		<div class="pipeline vueink">
			<h4>
				vue-ink today
				<span class="tag warn">incremental, then NOT</span>
			</h4>
			<div class="stages">
				<template v-for="(stage, i) in vueinkStages" :key="stage.label">
					<div
						class="stage"
						:class="i === 2 ? 'heavy' : 'good'"
						:style="{ '--delay': `${i * 1.1}s` }"
					>
						<div class="label">{{ stage.label }}</div>
						<div class="work">{{ stage.work }}</div>
					</div>
					<div v-if="i < vueinkStages.length - 1" class="arrow">→</div>
				</template>
			</div>
		</div>
	</div>
</template>

<style scoped>
.pipeline-wrap {
	margin: 24px 0;
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.pipeline {
	background: var(--vp-c-bg-soft);
	border: 1px solid var(--vp-c-divider);
	border-radius: 10px;
	padding: 20px 24px;
}

.pipeline h4 {
	margin: 0 0 18px;
	font-size: 15px;
	font-weight: 600;
	display: flex;
	align-items: center;
	gap: 10px;
	border: none;
	padding: 0;
}

.tag {
	display: inline-block;
	font-size: 11px;
	font-family: var(--vp-font-family-mono);
	padding: 3px 10px;
	border-radius: 999px;
	font-weight: 500;
	letter-spacing: 0.02em;
}

.tag.good {
	background: rgba(74, 222, 128, 0.12);
	color: var(--vp-c-green-1);
	border: 1px solid rgba(74, 222, 128, 0.3);
}

.tag.warn {
	background: rgba(248, 113, 113, 0.12);
	color: var(--vp-c-red-1);
	border: 1px solid rgba(248, 113, 113, 0.35);
}

.stages {
	display: grid;
	grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr;
	align-items: stretch;
	gap: 0;
}

.stage {
	padding: 14px 12px;
	background: var(--vp-c-bg);
	border: 1px solid var(--vp-c-divider);
	border-radius: 8px;
	text-align: center;
	font-size: 13px;
	transition:
		background 250ms,
		border-color 250ms,
		box-shadow 250ms;
	animation-duration: 4.4s;
	animation-timing-function: ease-in-out;
	animation-iteration-count: infinite;
	animation-delay: var(--delay, 0s);
}

.stage.good {
	animation-name: stage-good;
}

.stage.heavy {
	animation-name: stage-heavy;
}

.stage .label {
	font-weight: 600;
	margin-bottom: 4px;
	color: var(--vp-c-text-1);
}

.stage .work {
	color: var(--vp-c-text-2);
	font-family: var(--vp-font-family-mono);
	font-size: 11px;
	line-height: 1.4;
}

.arrow {
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--vp-c-text-3);
	padding: 0 10px;
	font-size: 18px;
}

@keyframes stage-good {
	0%,
	22%,
	100% {
		background: var(--vp-c-bg);
		border-color: var(--vp-c-divider);
		box-shadow: none;
	}
	6%,
	16% {
		background: rgba(94, 234, 212, 0.18);
		border-color: rgb(94, 234, 212);
		box-shadow: 0 0 24px rgba(94, 234, 212, 0.25);
	}
}

@keyframes stage-heavy {
	0%,
	22%,
	100% {
		background: var(--vp-c-bg);
		border-color: var(--vp-c-divider);
		box-shadow: none;
	}
	6%,
	16% {
		background: rgba(248, 113, 113, 0.2);
		border-color: rgb(248, 113, 113);
		box-shadow: 0 0 30px rgba(248, 113, 113, 0.4);
	}
}

@media (prefers-reduced-motion: reduce) {
	.stage {
		animation: none;
	}
}

@media (max-width: 760px) {
	.stages {
		grid-template-columns: 1fr;
		gap: 8px;
	}
	.arrow {
		display: none;
	}
}
</style>
