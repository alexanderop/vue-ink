import { type DOMElement } from './dom.ts';
import type Output from './output.ts';
export type OutputTransformer = (s: string, index: number) => string;
/**
 * Walk the tree producing a plain-text rendering for screen readers.
 *
 * - Row layouts join children with a single space; column layouts join with
 *   a newline. Matches ink's heuristic — screen readers don't have a 2D
 *   model, so spatial structure has to collapse to a 1D string.
 * - `aria-state` keys with truthy values prefix `(busy, checked)`-style
 *   parentheticals.
 * - `aria-role` prefixes `role:` unless the parent already announced the
 *   same role.
 * - Nodes with `display: none` and (optionally) `internal_static` subtrees
 *   are skipped entirely.
 */
export declare const renderNodeToScreenReaderOutput: (node: DOMElement, options?: {
    parentRole?: string;
    skipStaticElements?: boolean;
}) => string;
declare const renderNodeToOutput: (node: DOMElement, output: Output, options: {
    offsetX?: number;
    offsetY?: number;
    transformers?: OutputTransformer[];
    /**
     * When true, subtrees marked `internal_static` are skipped during the
     * walk. The renderer paints those separately above the live frame so
     * they survive as scrollback history.
     */
    skipStaticElements?: boolean;
}) => void;
export default renderNodeToOutput;
//# sourceMappingURL=render-node-to-output.d.ts.map