import { describe, it, expect } from 'vitest';
import { h, defineComponent, ref } from 'vue';
import { render, Text } from '../src/index.ts';
import { createCaptureStream, flush } from './helpers.ts';

const BSU = '\x1b[?2026h';
const ESU = '\x1b[?2026l';

describe('synchronized output (DEC 2026)', () => {
	it('brackets every interactive frame with the synchronized-update sequences', async () => {
		const stdout = createCaptureStream(20);
		const counter = ref(0);
		const App = defineComponent({
			setup: () => () => h(Text, null, () => `n=${counter.value}`),
		});
		const instance = render(App, { stdout, interactive: true });
		await flush();
		counter.value = 1;
		await flush();
		instance.unmount();

		const joined = stdout.frames.join('');
		const opens = joined.split(BSU).length - 1;
		const closes = joined.split(ESU).length - 1;
		expect(opens).toBeGreaterThan(0);
		expect(opens).toBe(closes);
	});

	it('does not emit the synchronized-update sequences when non-interactive', async () => {
		const stdout = createCaptureStream(20);
		const App = defineComponent({
			setup: () => () => h(Text, null, () => 'hi'),
		});
		const instance = render(App, { stdout, interactive: false });
		await flush();
		instance.unmount();

		const joined = stdout.frames.join('');
		expect(joined).not.toContain(BSU);
		expect(joined).not.toContain(ESU);
	});
});
