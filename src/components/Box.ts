import {defineComponent, h, type PropType} from 'vue';
import {type Styles} from '../styles.ts';

export type BoxProps = Omit<Styles, 'textWrap'>;

const Box = defineComponent({
	name: 'Box',
	props: {
		width: {type: [Number, String] as PropType<number | string | undefined>, default: undefined},
		height: {type: [Number, String] as PropType<number | string | undefined>, default: undefined},
		minWidth: {type: [Number, String] as PropType<number | string | undefined>, default: undefined},
		minHeight: {type: [Number, String] as PropType<number | string | undefined>, default: undefined},
		maxWidth: {type: [Number, String] as PropType<number | string | undefined>, default: undefined},
		maxHeight: {type: [Number, String] as PropType<number | string | undefined>, default: undefined},

		padding: {type: Number as PropType<number | undefined>, default: undefined},
		paddingX: {type: Number as PropType<number | undefined>, default: undefined},
		paddingY: {type: Number as PropType<number | undefined>, default: undefined},
		paddingTop: {type: Number as PropType<number | undefined>, default: undefined},
		paddingBottom: {type: Number as PropType<number | undefined>, default: undefined},
		paddingLeft: {type: Number as PropType<number | undefined>, default: undefined},
		paddingRight: {type: Number as PropType<number | undefined>, default: undefined},

		margin: {type: Number as PropType<number | undefined>, default: undefined},
		marginX: {type: Number as PropType<number | undefined>, default: undefined},
		marginY: {type: Number as PropType<number | undefined>, default: undefined},
		marginTop: {type: Number as PropType<number | undefined>, default: undefined},
		marginBottom: {type: Number as PropType<number | undefined>, default: undefined},
		marginLeft: {type: Number as PropType<number | undefined>, default: undefined},
		marginRight: {type: Number as PropType<number | undefined>, default: undefined},

		flexGrow: {type: Number as PropType<number | undefined>, default: undefined},
		flexShrink: {type: Number as PropType<number | undefined>, default: undefined},
		flexBasis: {type: [Number, String] as PropType<number | string | undefined>, default: undefined},
		flexDirection: {
			type: String as PropType<Styles['flexDirection']>,
			default: undefined,
		},
		flexWrap: {
			type: String as PropType<Styles['flexWrap']>,
			default: undefined,
		},
		alignItems: {
			type: String as PropType<Styles['alignItems']>,
			default: undefined,
		},
		alignSelf: {
			type: String as PropType<Styles['alignSelf']>,
			default: undefined,
		},
		justifyContent: {
			type: String as PropType<Styles['justifyContent']>,
			default: undefined,
		},

		gap: {type: Number as PropType<number | undefined>, default: undefined},
		columnGap: {type: Number as PropType<number | undefined>, default: undefined},
		rowGap: {type: Number as PropType<number | undefined>, default: undefined},

		display: {
			type: String as PropType<Styles['display']>,
			default: undefined,
		},
		overflow: {
			type: String as PropType<Styles['overflow']>,
			default: undefined,
		},
		overflowX: {
			type: String as PropType<Styles['overflow']>,
			default: undefined,
		},
		overflowY: {
			type: String as PropType<Styles['overflow']>,
			default: undefined,
		},
	},
	setup(props, {slots}) {
		return () => {
			const style: Styles = {
				flexWrap: 'nowrap',
				flexDirection: 'row',
				flexGrow: 0,
				flexShrink: 1,
			};
			for (const key of Object.keys(props) as Array<keyof typeof props>) {
				const value = props[key];
				if (value !== undefined) {
					(style as Record<string, unknown>)[key as string] = value;
				}
			}
			(style as Record<string, unknown>)['overflowX'] =
				props.overflowX ?? props.overflow ?? 'visible';
			(style as Record<string, unknown>)['overflowY'] =
				props.overflowY ?? props.overflow ?? 'visible';

			return h('ink-box', {style}, slots.default?.());
		};
	},
});

export default Box;
