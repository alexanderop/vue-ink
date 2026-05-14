// Adapted from ink (MIT) — https://github.com/vadimdemedes/ink
import Yoga, {type Node as YogaNode} from 'yoga-layout';

const getMaxWidth = (yogaNode: YogaNode): number =>
	yogaNode.getComputedWidth() -
	yogaNode.getComputedPadding(Yoga.EDGE_LEFT) -
	yogaNode.getComputedPadding(Yoga.EDGE_RIGHT);

export default getMaxWidth;
