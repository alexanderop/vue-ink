import process from 'node:process';
import Yoga from 'yoga-layout';
import ansiEscapes from 'ansi-escapes';
import {type Component} from 'vue';
import {createApp} from './renderer.ts';
import {createNode, type DOMElement} from './dom.ts';
import renderNodeToOutput from './render-node-to-output.ts';
import Output from './output.ts';

export type RenderOptions = {
	stdout?: NodeJS.WriteStream;
	debug?: boolean;
};

export type Instance = {
	rerender: (component: Component) => void;
	unmount: () => void;
	waitUntilExit: () => Promise<void>;
	clear: () => void;
};

const renderTree = (rootNode: DOMElement, terminalWidth: number): {output: string; height: number} => {
	rootNode.yogaNode!.setWidth(terminalWidth);
	rootNode.yogaNode!.calculateLayout(undefined, undefined, Yoga.DIRECTION_LTR);

	const output = new Output({
		width: rootNode.yogaNode!.getComputedWidth(),
		height: rootNode.yogaNode!.getComputedHeight(),
	});
	renderNodeToOutput(rootNode, output, {});
	const {output: text, height} = output.get();
	return {output: text, height};
};

const render = (component: Component, options: RenderOptions = {}): Instance => {
	const stdout = options.stdout ?? process.stdout;
	const debug = options.debug ?? false;
	const isTTY = Boolean((stdout as NodeJS.WriteStream).isTTY);

	const rootNode = createNode('ink-root');
	const app = createApp(component);

	let lastOutput = '';
	let lastLineCount = 0;
	let exitResolve: () => void = () => {};
	const exitPromise = new Promise<void>(resolve => {
		exitResolve = resolve;
	});
	let unmounted = false;

	const getTerminalWidth = (): number => {
		const cols = (stdout as NodeJS.WriteStream).columns;
		return typeof cols === 'number' && cols > 0 ? cols : 80;
	};

	const doRender = (): void => {
		if (unmounted) return;
		const {output: text} = renderTree(rootNode, getTerminalWidth());

		if (debug) {
			(stdout as NodeJS.WriteStream).write(text + '\n');
			return;
		}

		if (text === lastOutput) return;

		if (isTTY) {
			const erase = lastLineCount > 0 ? ansiEscapes.eraseLines(lastLineCount + 1) : '';
			(stdout as NodeJS.WriteStream).write(erase + text + '\n');
		} else {
			(stdout as NodeJS.WriteStream).write(text + '\n');
		}

		lastOutput = text;
		lastLineCount = text.split('\n').length;
	};

	rootNode.onRender = doRender;
	rootNode.onComputeLayout = () => {
		rootNode.yogaNode!.setWidth(getTerminalWidth());
	};

	app.mount(rootNode);
	doRender();

	const unmount = (): void => {
		if (unmounted) return;
		unmounted = true;
		app.unmount();
		exitResolve();
	};

	const rerender = (newComponent: Component): void => {
		// Vue doesn't support swapping the root component on the fly without remount;
		// for MVP, unmount and remount.
		app.unmount();
		const next = createApp(newComponent);
		next.mount(rootNode);
		doRender();
	};

	return {
		rerender,
		unmount,
		waitUntilExit: () => exitPromise,
		clear() {
			if (isTTY && lastLineCount > 0) {
				(stdout as NodeJS.WriteStream).write(
					ansiEscapes.eraseLines(lastLineCount + 1),
				);
				lastOutput = '';
				lastLineCount = 0;
			}
		},
	};
};

export default render;
