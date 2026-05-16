import { type Node as YogaNode } from 'yoga-layout';
import { type Styles } from './styles.ts';
import { type OutputTransformer } from './render-node-to-output.ts';
type InkNode = {
    parentNode: DOMElement | undefined;
    yogaNode?: YogaNode;
    style: Styles;
};
export type LayoutListener = () => void;
export type AccessibilityRole = 'button' | 'checkbox' | 'combobox' | 'list' | 'listbox' | 'listitem' | 'menu' | 'menuitem' | 'option' | 'progressbar' | 'radio' | 'radiogroup' | 'tab' | 'tablist' | 'table' | 'textbox' | 'timer' | 'toolbar';
export type AccessibilityState = {
    readonly busy?: boolean;
    readonly checked?: boolean;
    readonly disabled?: boolean;
    readonly expanded?: boolean;
    readonly multiline?: boolean;
    readonly multiselectable?: boolean;
    readonly readonly?: boolean;
    readonly required?: boolean;
    readonly selected?: boolean;
};
export type AccessibilityInfo = {
    /** Announced in place of the subtree when set. */
    readonly label?: string;
    /** Skip this subtree entirely in the screen-reader walk. */
    readonly hidden?: boolean;
    readonly role?: AccessibilityRole;
    readonly state?: AccessibilityState;
};
export type TextName = '#text';
export type ElementNames = 'ink-root' | 'ink-box' | 'ink-text' | 'ink-virtual-text' | 'ink-comment';
export type NodeNames = ElementNames | TextName;
export type DOMElement = {
    nodeName: ElementNames;
    attributes: Record<string, DOMNodeAttribute>;
    childNodes: DOMNode[];
    internal_transform?: OutputTransformer;
    /**
     * Marks a subtree as scrollback-safe history (rendered above the live
     * frame and never repainted). Set by the {@link Static} component.
     */
    internal_static?: boolean;
    /**
     * ARIA metadata for the screen-reader render path. Lives on the DOM node
     * so it survives across paints without re-running setup. Read by
     * {@link renderNodeToScreenReaderOutput}; ignored by the regular paint
     * (regular output never reads role/state — visual UI uses the chalk
     * pipeline instead).
     */
    internal_accessibility?: AccessibilityInfo;
    onComputeLayout?: () => void;
    onRender?: () => void;
    /**
     * Layout-commit subscribers attached to the root node. Fired by the
     * renderer after every paint so composables (e.g. `useBoxMetrics`) can
     * re-read Yoga-computed metrics without having to rerender themselves.
     */
    internal_layoutListeners?: Set<LayoutListener>;
} & InkNode;
export type TextNode = {
    nodeName: TextName;
    nodeValue: string;
} & InkNode;
export type DOMNode<T = {
    nodeName: NodeNames;
}> = T extends {
    nodeName: infer U;
} ? U extends '#text' ? TextNode : DOMElement : never;
export type DOMNodeAttribute = boolean | string | number;
export declare const createNode: (nodeName: ElementNames) => DOMElement;
export declare const appendChildNode: (node: DOMElement, childNode: DOMNode) => void;
export declare const insertBeforeNode: (node: DOMElement, newChildNode: DOMNode, beforeChildNode: DOMNode) => void;
export declare const removeChildNode: (node: DOMElement, removeNode: DOMNode) => void;
export declare const setAttribute: (node: DOMElement, key: string, value: DOMNodeAttribute) => void;
export declare const setStyle: (node: DOMNode, style?: Styles) => void;
export declare const createTextNode: (text: string) => TextNode;
export declare const setTextNodeValue: (node: TextNode, text: string) => void;
/**
 * Subscribe to layout commits on the root node. The listener fires after
 * the renderer finishes each paint. Returns a disposer. No-op (with a
 * no-op disposer) for any node that isn't `ink-root`.
 */
export declare const addLayoutListener: (rootNode: DOMElement, listener: LayoutListener) => (() => void);
/**
 * Fire every layout listener registered on `rootNode`. Renderer calls this
 * once per commit, after Yoga has finished computing the new layout.
 */
export declare const emitLayoutListeners: (rootNode: DOMElement) => void;
export {};
//# sourceMappingURL=dom.d.ts.map