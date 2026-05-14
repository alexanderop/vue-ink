import { Writable } from 'node:stream';

export const createCaptureStream = (
	columns = 80,
): NodeJS.WriteStream & {
	frames: string[];
} => {
	const frames: string[] = [];
	const stream = new Writable({
		write(chunk, _enc, cb) {
			frames.push(chunk.toString());
			cb();
		},
	}) as Writable & {
		columns: number;
		isTTY: boolean;
		frames: string[];
	};

	stream.columns = columns;
	stream.isTTY = false;
	stream.frames = frames;
	return stream as unknown as NodeJS.WriteStream & { frames: string[] };
};
