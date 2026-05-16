import { type OutputTransformer } from './render-node-to-output.ts';
type Options = {
    width: number;
    height: number;
};
type Clip = {
    x1: number | undefined;
    x2: number | undefined;
    y1: number | undefined;
    y2: number | undefined;
};
export default class Output {
    width: number;
    height: number;
    private readonly operations;
    private readonly caches;
    constructor(options: Options);
    write(x: number, y: number, text: string, options: {
        transformers: OutputTransformer[];
    }): void;
    clip(clip: Clip): void;
    unclip(): void;
    get(): {
        output: string;
        height: number;
    };
}
export {};
//# sourceMappingURL=output.d.ts.map