import { describe, it, expect } from 'vitest';
import { calculateTargetScrollTop } from './scroll-utils';

describe('calculateTargetScrollTop', () => {
	const containerHeight = 300;
	const lineHeight = 30;

	describe('manual mode', () => {
		it('returns currentScrollTop regardless of active element position', () => {
			const result = calculateTargetScrollTop({
				scrollMode: 'manual',
				containerHeight,
				currentScrollTop: 50,
				activeTop: 280,
				activeBottom: 310,
				lineHeight
			});
			expect(result).toBe(50);
		});
	});

	describe('center mode', () => {
		it('keeps scroll at 0 when active line is above the vertical midpoint', () => {
			// Center of container is 150px.
			// Active line from 20 to 50 has center at 35px.
			const result = calculateTargetScrollTop({
				scrollMode: 'center',
				containerHeight,
				currentScrollTop: 0,
				activeTop: 20,
				activeBottom: 50,
				lineHeight
			});
			expect(result).toBe(0);
		});

		it('centers active line vertically once it advances past the midpoint', () => {
			// Center of container is 150px.
			// Active line from 185 to 215 has center at 200px.
			// Delta is 200 - 150 = +50px.
			const result = calculateTargetScrollTop({
				scrollMode: 'center',
				containerHeight,
				currentScrollTop: 0,
				activeTop: 185,
				activeBottom: 215,
				lineHeight
			});
			expect(result).toBe(50);
		});

		it('maintains current scroll position if active line is already centered', () => {
			// Container is scrolled to 50px.
			// Active line center is currently at 150px (e.g. 135 to 165).
			const result = calculateTargetScrollTop({
				scrollMode: 'center',
				containerHeight,
				currentScrollTop: 50,
				activeTop: 135,
				activeBottom: 165,
				lineHeight
			});
			expect(result).toBe(50);
		});

		it('adjusts scroll backward when backspacing to an earlier line', () => {
			// Container was at 100px.
			// User backspaced up, active line is now at 85 to 115 (center 100px).
			// Delta is 100 - 150 = -50px.
			// Target is 100 - 50 = 50px.
			const result = calculateTargetScrollTop({
				scrollMode: 'center',
				containerHeight,
				currentScrollTop: 100,
				activeTop: 85,
				activeBottom: 115,
				lineHeight
			});
			expect(result).toBe(50);
		});

		it('clamps target scroll to 0 if backspaced all the way back to the start', () => {
			const result = calculateTargetScrollTop({
				scrollMode: 'center',
				containerHeight,
				currentScrollTop: 80,
				activeTop: 10,
				activeBottom: 40,
				lineHeight
			});
			expect(result).toBe(0);
		});
	});

	describe('step mode', () => {
		it('does not scroll when active line is comfortably within visible boundaries', () => {
			// Container height 300, bottomThreshold = 300 - 30 = 270.
			// Active line is at 100 to 130.
			const result = calculateTargetScrollTop({
				scrollMode: 'step',
				containerHeight,
				currentScrollTop: 0,
				activeTop: 100,
				activeBottom: 130,
				lineHeight
			});
			expect(result).toBe(0);
		});

		it('scrolls down in stepped increment when cursor approaches the bottom boundary', () => {
			// Container height 300, lineHeight 30. bottomThreshold = 270.
			// Active line reaches 270 to 300.
			const result = calculateTargetScrollTop({
				scrollMode: 'step',
				containerHeight,
				currentScrollTop: 0,
				activeTop: 270,
				activeBottom: 300,
				lineHeight
			});
			expect(result).toBeGreaterThanOrEqual(60);
		});

		it('scrolls up to keep active line visible when backspacing above top boundary', () => {
			// Active line has moved above visible container: activeTop = -15, activeBottom = 15.
			// Current scrollTop is 120.
			const result = calculateTargetScrollTop({
				scrollMode: 'step',
				containerHeight,
				currentScrollTop: 120,
				activeTop: -15,
				activeBottom: 15,
				lineHeight
			});
			expect(result).toBeLessThan(120);
			expect(result).toBeGreaterThanOrEqual(0);
		});
	});

	describe('edge cases', () => {
		it('returns currentScrollTop if containerHeight is 0 or negative', () => {
			const result = calculateTargetScrollTop({
				scrollMode: 'center',
				containerHeight: 0,
				currentScrollTop: 42,
				activeTop: 100,
				activeBottom: 130
			});
			expect(result).toBe(42);
		});

		it('respects maxScrollTop when provided', () => {
			const result = calculateTargetScrollTop({
				scrollMode: 'center',
				containerHeight: 300,
				currentScrollTop: 0,
				activeTop: 500,
				activeBottom: 530,
				lineHeight: 30,
				maxScrollTop: 250
			});
			expect(result).toBe(250);
		});
	});
});
