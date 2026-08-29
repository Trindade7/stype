import { writable } from 'svelte/store';

export const MOBILE_BREAKPOINT = 640;

export function isNarrowViewport(width?: number): boolean {
	if (width !== undefined) {
		return width < MOBILE_BREAKPOINT;
	}
	if (typeof window === 'undefined') {
		return false;
	}
	const currentWidth = window.visualViewport?.width ?? window.innerWidth;
	return currentWidth < MOBILE_BREAKPOINT;
}

export function getVisualViewportHeight(): number {
	if (typeof window === 'undefined') {
		return 0;
	}
	return window.visualViewport?.height ?? window.innerHeight;
}

export interface ViewportLayoutState {
	isNarrow: boolean;
	isCompact: boolean;
	isInputFocused: boolean;
	isTestFinished: boolean;
	visualViewportHeight: number | null;
}

function createViewportLayoutStore() {
	const initialNarrow = isNarrowViewport();
	const initialHeight = typeof window !== 'undefined' ? getVisualViewportHeight() : null;

	let state: ViewportLayoutState = {
		isNarrow: initialNarrow,
		isCompact: false,
		isInputFocused: false,
		isTestFinished: false,
		visualViewportHeight: initialHeight
	};

	const { subscribe, set } = writable<ViewportLayoutState>(state);

	function updateState(updates: Partial<ViewportLayoutState>) {
		const next = { ...state, ...updates };
		next.isCompact = next.isNarrow && next.isInputFocused && !next.isTestFinished;
		state = next;
		set(state);

		if (typeof document !== 'undefined' && state.visualViewportHeight !== null) {
			document.documentElement.style.setProperty(
				'--visual-viewport-height',
				`${state.visualViewportHeight}px`
			);
		}
	}

	function refreshFromWindow() {
		if (typeof window === 'undefined') return;
		const width = window.visualViewport?.width ?? window.innerWidth;
		const height = getVisualViewportHeight();
		updateState({
			isNarrow: width < MOBILE_BREAKPOINT,
			visualViewportHeight: height
		});
	}

	return {
		subscribe,
		setTypingFocus(focused: boolean) {
			updateState({ isInputFocused: focused });
		},
		setTestFinished(finished: boolean) {
			updateState({ isTestFinished: finished });
		},
		setViewportDimensions(width: number, height: number) {
			if (typeof window !== 'undefined') {
				try {
					Object.defineProperty(window, 'innerWidth', {
						writable: true,
						configurable: true,
						value: width
					});
					Object.defineProperty(window, 'innerHeight', {
						writable: true,
						configurable: true,
						value: height
					});
					if (window.visualViewport) {
						Object.defineProperty(window.visualViewport, 'width', {
							writable: true,
							configurable: true,
							value: width
						});
						Object.defineProperty(window.visualViewport, 'height', {
							writable: true,
							configurable: true,
							value: height
						});
					}
				} catch {
					// Ignore if window properties cannot be redefined
				}
			}
			updateState({
				isNarrow: width < MOBILE_BREAKPOINT,
				visualViewportHeight: height
			});
		},
		initViewportController(): () => void {
			if (typeof window === 'undefined') {
				return () => {};
			}

			refreshFromWindow();

			const handleResize = () => {
				refreshFromWindow();
			};

			window.addEventListener('resize', handleResize);

			const vv = window.visualViewport;
			if (vv) {
				vv.addEventListener('resize', handleResize);
				vv.addEventListener('scroll', handleResize);
			}

			return () => {
				window.removeEventListener('resize', handleResize);
				if (vv) {
					vv.removeEventListener('resize', handleResize);
					vv.removeEventListener('scroll', handleResize);
				}
			};
		},
		reset() {
			const narrow = isNarrowViewport();
			const height = typeof window !== 'undefined' ? getVisualViewportHeight() : null;
			state = {
				isNarrow: narrow,
				isCompact: false,
				isInputFocused: false,
				isTestFinished: false,
				visualViewportHeight: height
			};
			set(state);
			if (typeof document !== 'undefined') {
				document.documentElement.style.removeProperty('--visual-viewport-height');
			}
		}
	};
}

export const viewportLayout = createViewportLayoutStore();
