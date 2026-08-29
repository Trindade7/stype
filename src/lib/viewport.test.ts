import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	isNarrowViewport,
	getVisualViewportHeight,
	viewportLayout,
	MOBILE_BREAKPOINT
} from './viewport';

describe('Viewport layout controller', () => {
	const originalInnerWidth = window.innerWidth;
	const originalInnerHeight = window.innerHeight;
	const originalVisualViewport = window.visualViewport;

	beforeEach(() => {
		viewportLayout.reset();
		Object.defineProperty(window, 'innerWidth', {
			writable: true,
			configurable: true,
			value: 1024
		});
		Object.defineProperty(window, 'innerHeight', {
			writable: true,
			configurable: true,
			value: 768
		});
		Object.defineProperty(window, 'visualViewport', {
			writable: true,
			configurable: true,
			value: null
		});
	});

	afterEach(() => {
		viewportLayout.reset();
		Object.defineProperty(window, 'innerWidth', {
			writable: true,
			configurable: true,
			value: originalInnerWidth
		});
		Object.defineProperty(window, 'innerHeight', {
			writable: true,
			configurable: true,
			value: originalInnerHeight
		});
		Object.defineProperty(window, 'visualViewport', {
			writable: true,
			configurable: true,
			value: originalVisualViewport
		});
	});

	it('identifies viewports below 640px as narrow viewports', () => {
		expect(MOBILE_BREAKPOINT).toBe(640);
		expect(isNarrowViewport(375)).toBe(true);
		expect(isNarrowViewport(639)).toBe(true);
		expect(isNarrowViewport(640)).toBe(false);
		expect(isNarrowViewport(1024)).toBe(false);
	});

	it('reads visual viewport height from window.visualViewport when available', () => {
		Object.defineProperty(window, 'visualViewport', {
			writable: true,
			configurable: true,
			value: { height: 420, width: 375 }
		});

		expect(getVisualViewportHeight()).toBe(420);
	});

	it('falls back to window.innerHeight when window.visualViewport is unavailable', () => {
		Object.defineProperty(window, 'visualViewport', {
			writable: true,
			configurable: true,
			value: null
		});
		Object.defineProperty(window, 'innerHeight', {
			writable: true,
			configurable: true,
			value: 800
		});

		expect(getVisualViewportHeight()).toBe(800);
	});

	it('activates compact mode only when viewport is narrow and typing input is focused', () => {
		let state = { isCompact: false, isNarrow: false, isInputFocused: false, isTestFinished: false };
		const unsubscribe = viewportLayout.subscribe((val) => {
			state = val;
		});

		// Default state on wide viewport
		expect(state.isCompact).toBe(false);

		// Narrow viewport, not focused yet
		viewportLayout.setViewportDimensions(375, 667);
		expect(state.isNarrow).toBe(true);
		expect(state.isCompact).toBe(false);

		// Focus typing input on narrow viewport
		viewportLayout.setTypingFocus(true);
		expect(state.isInputFocused).toBe(true);
		expect(state.isCompact).toBe(true);

		// Blur typing input on narrow viewport restores normal layout
		viewportLayout.setTypingFocus(false);
		expect(state.isInputFocused).toBe(false);
		expect(state.isCompact).toBe(false);

		unsubscribe();
	});

	it('deactivates compact mode when test run is completed', () => {
		let state = { isCompact: false, isNarrow: false, isInputFocused: false, isTestFinished: false };
		const unsubscribe = viewportLayout.subscribe((val) => {
			state = val;
		});

		viewportLayout.setViewportDimensions(375, 667);
		viewportLayout.setTypingFocus(true);
		expect(state.isCompact).toBe(true);

		// Test completes
		viewportLayout.setTestFinished(true);
		expect(state.isTestFinished).toBe(true);
		expect(state.isCompact).toBe(false);

		// Restart test resets finished state
		viewportLayout.setTestFinished(false);
		expect(state.isCompact).toBe(true);

		unsubscribe();
	});

	it('keeps compact mode disabled on desktop viewports even when focused', () => {
		let state = { isCompact: false, isNarrow: false, isInputFocused: false, isTestFinished: false };
		const unsubscribe = viewportLayout.subscribe((val) => {
			state = val;
		});

		viewportLayout.setViewportDimensions(1024, 768);
		expect(state.isNarrow).toBe(false);

		viewportLayout.setTypingFocus(true);
		expect(state.isInputFocused).toBe(true);
		expect(state.isCompact).toBe(false);

		unsubscribe();
	});

	it('listens to visualViewport resize events and updates height and dimensions dynamically', () => {
		const listeners: Record<string, (() => void)[]> = {};
		const mockVisualViewport = {
			width: 375,
			height: 667,
			addEventListener: vi.fn((event: string, cb: () => void) => {
				listeners[event] = listeners[event] || [];
				listeners[event].push(cb);
			}),
			removeEventListener: vi.fn((event: string, cb: () => void) => {
				listeners[event] = (listeners[event] || []).filter((fn) => fn !== cb);
			})
		};

		Object.defineProperty(window, 'visualViewport', {
			writable: true,
			configurable: true,
			value: mockVisualViewport
		});

		const cleanup = viewportLayout.initViewportController();

		let currentHeight: number | null = null;
		const unsubscribe = viewportLayout.subscribe((s) => {
			currentHeight = s.visualViewportHeight;
		});

		expect(currentHeight).toBe(667);

		// Simulate virtual keyboard opening (shrinking visual viewport height to 380px)
		mockVisualViewport.height = 380;
		for (const cb of listeners['resize'] || []) {
			cb();
		}

		expect(currentHeight).toBe(380);

		cleanup();
		unsubscribe();
		expect(mockVisualViewport.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
	});
});
