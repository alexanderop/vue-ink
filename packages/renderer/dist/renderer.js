// Vue host renderer that emits Ink DOM nodes via Yoga.
import { createRenderer, queuePostFlushCb } from '@vue/runtime-core';
import { appendChildNode, applyStyles, createNode, createTextNode, insertBeforeNode, removeChildNode, setAttribute, setStyle, setTextNodeValue, } from '@vue-ink/core';
const findRoot = (node) => {
    // `?? undefined` coerces null to undefined to satisfy the loop's type;
    // Vue's runtime never passes null here in practice.
    /* v8 ignore next */
    let cur = node ?? undefined;
    while (cur) {
        if (cur.nodeName === 'ink-root')
            return cur;
        cur = cur.parentNode;
    }
    return undefined;
};
const renderJobs = new WeakMap();
// Each root gets a stable scheduler-job function. `queuePostFlushCb` dedups
// queued jobs by identity, so the same root only triggers a single render
// per scheduler flush even if many props/children change in one tick.
const getRenderJob = (root) => {
    let job = renderJobs.get(root);
    if (!job) {
        job = () => {
            root.onComputeLayout?.();
            root.onRender?.();
        };
        renderJobs.set(root, job);
    }
    return job;
};
const scheduleRender = (node) => {
    const root = findRoot(node);
    if (!root)
        return;
    queuePostFlushCb(getRenderJob(root));
};
const setProp = (node, key, value) => {
    if (key === 'style') {
        setStyle(node, value);
        if (node.yogaNode)
            applyStyles(node.yogaNode, value ?? {});
        return;
    }
    if (key === 'internal_transform') {
        node.internal_transform = value;
        return;
    }
    if (key === 'internal_static') {
        node.internal_static = Boolean(value);
        return;
    }
    if (key === 'internal_accessibility') {
        // `undefined` clears the slot so unsetting aria-* props on rerender
        // stops them from leaking into subsequent screen-reader walks.
        node.internal_accessibility = value;
        return;
    }
    // Vue still passes `key` and `ref` to patchProp for components with
    // runtime-rendered slots; they are framework metadata and must not reach
    // the host DOM. Branch coverage only exercises one side at a time.
    /* v8 ignore next */
    if (key === 'key' || key === 'ref')
        return;
    setAttribute(node, key, value);
};
const knownTypes = [
    'ink-root',
    'ink-box',
    'ink-text',
    'ink-virtual-text',
    'ink-comment',
];
const { createApp } = createRenderer({
    createElement(type) {
        if (!knownTypes.includes(type)) {
            throw new Error(`vue-ink: unknown host element <${type}>. ` +
                `Only <Box>, <Text>, and Vue comments are renderable to the terminal. ` +
                `Did you mean to wrap text in <Text>?`);
        }
        return createNode(type);
    },
    createText(text) {
        return createTextNode(text);
    },
    createComment(_text) {
        return createNode('ink-comment');
    },
    setText(node, text) {
        if (node.nodeName === '#text') {
            setTextNodeValue(node, text);
            scheduleRender(node);
        }
    },
    setElementText(el, text) {
        while (el.childNodes.length > 0) {
            removeChildNode(el, el.childNodes[0]);
        }
        if (text.length > 0) {
            appendChildNode(el, createTextNode(text));
        }
        scheduleRender(el);
    },
    parentNode(node) {
        return node.parentNode ?? null;
    },
    nextSibling(node) {
        const parent = node.parentNode;
        if (!parent)
            return null;
        const index = parent.childNodes.indexOf(node);
        // Defensive: an attached node is always findable in its parent's
        // childNodes; the negative-index path is unreachable through Vue.
        /* v8 ignore next */
        if (index < 0)
            return null;
        return parent.childNodes[index + 1] ?? null;
    },
    insert(child, parent, anchor) {
        if (anchor) {
            insertBeforeNode(parent, child, anchor);
        }
        else {
            appendChildNode(parent, child);
        }
        scheduleRender(parent);
    },
    remove(child) {
        const parent = child.parentNode;
        if (parent) {
            removeChildNode(parent, child);
            scheduleRender(parent);
        }
    },
    patchProp(el, key, prevValue, nextValue) {
        // Vue's reactivity already deduplicates equal patches in most paths,
        // so this guard is defensive against direct patcher callers.
        /* v8 ignore next */
        if (prevValue === nextValue)
            return;
        if (key === 'style') {
            // Surface keys that disappeared since the last render as explicit
            // `undefined` so applyStyles can reset the corresponding Yoga
            // property instead of leaking the old value.
            const prev = (prevValue ?? {});
            const next = { ...(nextValue ?? {}) };
            for (const prevKey of Object.keys(prev)) {
                if (!(prevKey in next))
                    next[prevKey] = undefined;
            }
            setProp(el, key, next);
            scheduleRender(el);
            return;
        }
        setProp(el, key, nextValue);
        scheduleRender(el);
    },
});
export { createApp };
//# sourceMappingURL=renderer.js.map