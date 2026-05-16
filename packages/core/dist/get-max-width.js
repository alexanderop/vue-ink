// Adapted from ink (MIT) — https://github.com/vadimdemedes/ink
import Yoga from 'yoga-layout';
const getMaxWidth = (yogaNode) => yogaNode.getComputedWidth() -
    yogaNode.getComputedPadding(Yoga.EDGE_LEFT) -
    yogaNode.getComputedPadding(Yoga.EDGE_RIGHT);
export default getMaxWidth;
//# sourceMappingURL=get-max-width.js.map