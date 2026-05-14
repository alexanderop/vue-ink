import { inject, type InjectionKey } from 'vue';

export const requireContext = <T>(key: InjectionKey<T>, callSite: string): T => {
	const ctx = inject(key);
	if (!ctx) {
		throw new Error(
			`${callSite} must be called inside a component mounted via vue-ink render().`,
		);
	}
	return ctx;
};
