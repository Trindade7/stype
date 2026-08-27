export type ScrollMode = 'manual' | 'center' | 'step';

export interface ScrollParams {
	scrollMode: ScrollMode;
	containerHeight: number;
	currentScrollTop: number;
	activeTop: number;
	activeBottom: number;
	lineHeight?: number;
	maxScrollTop?: number;
}

/**
 * Calculates the target scroll position for a passage container given the current active line position.
 *
 * All coordinates (activeTop, activeBottom) are relative to the top edge of the visible container viewport.
 */
export function calculateTargetScrollTop({
	scrollMode,
	containerHeight,
	currentScrollTop,
	activeTop,
	activeBottom,
	lineHeight: explicitLineHeight,
	maxScrollTop
}: ScrollParams): number {
	if (containerHeight <= 0) {
		return currentScrollTop;
	}

	const lineHeight = explicitLineHeight && explicitLineHeight > 0
		? explicitLineHeight
		: Math.max(1, activeBottom - activeTop);

	let targetScrollTop = currentScrollTop;

	if (scrollMode === 'manual') {
		targetScrollTop = currentScrollTop;
	} else if (scrollMode === 'center') {
		const activeCenter = (activeTop + activeBottom) / 2;
		const containerCenter = containerHeight / 2;
		const delta = activeCenter - containerCenter;
		targetScrollTop = currentScrollTop + delta;
	} else if (scrollMode === 'step') {
		const bottomThreshold = containerHeight - lineHeight;

		if (activeBottom > bottomThreshold) {
			const stepSize = lineHeight * 2;
			targetScrollTop = currentScrollTop + (activeBottom - bottomThreshold) + stepSize;
		} else if (activeTop < 0) {
			targetScrollTop = currentScrollTop + activeTop - lineHeight;
		} else {
			targetScrollTop = currentScrollTop;
		}
	}

	targetScrollTop = Math.max(0, targetScrollTop);

	if (maxScrollTop !== undefined && maxScrollTop >= 0) {
		targetScrollTop = Math.min(maxScrollTop, targetScrollTop);
	}

	return targetScrollTop;
}

/**
 * Applies scroll position to an element, preferring smooth scrolling when available.
 */
export function applyScroll(
	container: HTMLElement,
	targetTop: number,
	smooth: boolean = true
): void {
	if (typeof container.scrollTo === 'function') {
		try {
			container.scrollTo({
				top: targetTop,
				behavior: smooth ? 'smooth' : 'auto'
			});
		} catch {
			container.scrollTop = targetTop;
		}
	} else {
		container.scrollTop = targetTop;
	}
}
