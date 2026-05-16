<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'

const COLS = 12
const ROWS = 6
const TICK_MS = 2600

interface Cell {
	char: string
	isCounter: boolean
}

const buildCells = (): Cell[] => {
	const cells: Cell[] = []
	for (let r = 0; r < ROWS; r += 1) {
		for (let c = 0; c < COLS; c += 1) {
			if (r === 0) {
				const labels = ['c', 'o', 'u', 'n', 't', ':', ' ', '5', '', '', '', '']
				cells.push({ char: labels[c] ?? '', isCounter: c === 7 })
			} else if (c < 5) {
				const labels = ['r', 'o', 'w', ' ', String(r - 1)]
				cells.push({ char: labels[c] ?? '', isCounter: false })
			} else {
				cells.push({ char: '', isCounter: false })
			}
		}
	}
	return cells
}

const browserCells = ref<Cell[]>(buildCells())
const vueinkCells = ref<Cell[]>(buildCells())
const counter = ref(5)

const browserGrid = useTemplateRef<HTMLDivElement>('browserGrid')
const vueinkGrid = useTemplateRef<HTMLDivElement>('vueinkGrid')
const root = useTemplateRef<HTMLDivElement>('root')

let intervalId: ReturnType<typeof setInterval> | undefined
let observer: IntersectionObserver | undefined
let visible = false

const retrigger = (el: Element, className: string) => {
	el.classList.remove(className)
	void (el as HTMLElement).offsetWidth
	el.classList.add(className)
}

const tick = () => {
	counter.value += 1
	const digit = String(counter.value).slice(-1)

	browserCells.value = browserCells.value.map((cell) =>
		cell.isCounter ? { ...cell, char: digit } : cell,
	)
	vueinkCells.value = vueinkCells.value.map((cell) =>
		cell.isCounter ? { ...cell, char: digit } : cell,
	)

	requestAnimationFrame(() => {
		const bCells = browserGrid.value?.querySelectorAll('.cell')
		if (bCells) {
			for (const el of bCells) {
				if (el.classList.contains('counter')) retrigger(el, 'flash-good')
			}
		}

		const vCells = vueinkGrid.value?.querySelectorAll('.cell')
		if (vCells) {
			for (const [i, el] of [...vCells].entries()) {
				setTimeout(() => retrigger(el, 'flash-bad'), i * 3)
			}
		}
	})
}

const start = () => {
	if (intervalId) return
	tick()
	intervalId = setInterval(tick, TICK_MS)
}

const stop = () => {
	if (intervalId) {
		clearInterval(intervalId)
		intervalId = undefined
	}
}

onMounted(() => {
	if (!root.value) return

	observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting && !visible) {
					visible = true
					start()
				} else if (!entry.isIntersecting && visible) {
					visible = false
					stop()
				}
			}
		},
		{ threshold: 0.15 },
	)
	observer.observe(root.value)
})

onBeforeUnmount(() => {
	stop()
	observer?.disconnect()
})
</script>

<template>
	<div ref="root" class="grid-wrap">
		<div class="side good">
			<h4>Browser-style incremental paint</h4>
			<div ref="browserGrid" class="grid">
				<div
					v-for="(cell, i) in browserCells"
					:key="i"
					class="cell"
					:class="{ counter: cell.isCounter }"
				>
					{{ cell.char }}
				</div>
			</div>
			<p class="caption">Only cells that actually changed get repainted.</p>
			<span class="stat good">work per tick: ~1 cell</span>
		</div>

		<div class="side bad">
			<h4>Current vue-ink paint</h4>
			<div ref="vueinkGrid" class="grid">
				<div
					v-for="(cell, i) in vueinkCells"
					:key="i"
					class="cell"
					:class="{ counter: cell.isCounter }"
				>
					{{ cell.char }}
				</div>
			</div>
			<p class="caption">Every cell is rewritten, stringified, and emitted.</p>
			<span class="stat bad">work per tick: every cell</span>
		</div>
	</div>
</template>

<style scoped>
.grid-wrap {
	margin: 24px 0;
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 20px;
}

.side {
	background: var(--vp-c-bg-soft);
	border: 1px solid var(--vp-c-divider);
	border-radius: 10px;
	padding: 20px;
}

.side h4 {
	margin: 0 0 14px;
	font-size: 14px;
	font-weight: 600;
	border: none;
	padding: 0;
}

.side.good h4 {
	color: var(--vp-c-green-1);
}

.side.bad h4 {
	color: var(--vp-c-red-1);
}

.grid {
	display: grid;
	grid-template-columns: repeat(12, 1fr);
	gap: 3px;
	font-family: var(--vp-font-family-mono);
	font-size: 11px;
	padding: 8px;
	background: var(--vp-c-bg);
	border-radius: 6px;
	border: 1px solid var(--vp-c-divider);
}

.cell {
	aspect-ratio: 1 / 1.3;
	background: var(--vp-c-default-soft);
	border-radius: 2px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--vp-c-text-3);
	transition: all 120ms ease-out;
}

.cell.flash-good {
	animation: flash-good 900ms ease-out;
}

.cell.flash-bad {
	animation: flash-bad 750ms ease-out;
}

@keyframes flash-good {
	0% {
		background: #fff;
		color: #000;
		transform: scale(1.18);
		box-shadow: 0 0 24px rgb(94, 234, 212);
	}
	40% {
		background: rgb(94, 234, 212);
		color: #000;
	}
	100% {
		background: rgba(94, 234, 212, 0.1);
		color: var(--vp-c-green-1);
		transform: scale(1);
		box-shadow: none;
	}
}

@keyframes flash-bad {
	0% {
		background: rgb(248, 113, 113);
		color: #000;
		transform: scale(1.06);
	}
	100% {
		background: var(--vp-c-default-soft);
		color: var(--vp-c-text-3);
		transform: scale(1);
	}
}

.caption {
	margin-top: 12px;
	font-size: 13px;
	color: var(--vp-c-text-2);
}

.stat {
	font-family: var(--vp-font-family-mono);
	font-size: 12px;
	margin-top: 4px;
	padding: 5px 10px;
	border-radius: 4px;
	display: inline-block;
}

.stat.good {
	color: var(--vp-c-green-1);
	background: rgba(74, 222, 128, 0.18);
}

.stat.bad {
	color: var(--vp-c-red-1);
	background: rgba(248, 113, 113, 0.18);
}

@media (prefers-reduced-motion: reduce) {
	.cell {
		animation: none !important;
	}
}

@media (max-width: 760px) {
	.grid-wrap {
		grid-template-columns: 1fr;
	}
	.grid {
		grid-template-columns: repeat(10, 1fr);
	}
}
</style>
