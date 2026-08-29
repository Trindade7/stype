import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	getPassageLength,
	filterPassagesByLength,
	getPassageIdFromUrl,
	clearPassageQuery
} from './passage-utils';

describe('passage-utils', () => {
	it('categorizes word counts into short, medium, and long', () => {
		const shortText = 'The quick brown fox jumps over the lazy dog.';
		expect(getPassageLength(shortText)).toBe('short');

		const fiftyWords = Array(50).fill('word').join(' ');
		expect(getPassageLength(fiftyWords)).toBe('medium');

		const hundredWords = Array(100).fill('word').join(' ');
		expect(getPassageLength(hundredWords)).toBe('medium');

		const hundredOneWords = Array(101).fill('word').join(' ');
		expect(getPassageLength(hundredOneWords)).toBe('long');
	});

	it('filters a list of passages by preferred length', () => {
		const shortPassage = { id: 1, text: 'Hello world', source: null, userId: null, createdAt: new Date() };
		const mediumPassage = { id: 2, text: Array(60).fill('word').join(' '), source: null, userId: null, createdAt: new Date() };
		const longPassage = { id: 3, text: Array(120).fill('word').join(' '), source: null, userId: null, createdAt: new Date() };

		const list = [shortPassage, mediumPassage, longPassage];

		expect(filterPassagesByLength(list, 'all')).toEqual(list);
		expect(filterPassagesByLength(list, 'short')).toEqual([shortPassage]);
		expect(filterPassagesByLength(list, 'medium')).toEqual([mediumPassage]);
		expect(filterPassagesByLength(list, 'long')).toEqual([longPassage]);
	});

	it('returns all passages if none match the target length', () => {
		const shortPassage = { id: 1, text: 'Hello world', source: null, userId: null, createdAt: new Date() };
		const list = [shortPassage];

		expect(filterPassagesByLength(list, 'long')).toEqual([shortPassage]);
	});

	describe('getPassageIdFromUrl', () => {
		it('extracts valid positive integer passageId from URL or search string', () => {
			expect(getPassageIdFromUrl('https://example.com/?passageId=42')).toBe(42);
			expect(getPassageIdFromUrl('/app?passageId=7')).toBe(7);
			expect(getPassageIdFromUrl('?passageId=10')).toBe(10);
			expect(getPassageIdFromUrl(new URL('https://example.com/?passageId=3'))).toBe(3);
			expect(getPassageIdFromUrl(new URLSearchParams('passageId=99'))).toBe(99);
		});

		it('extracts valid UUID passageId from URL or search string', () => {
			const uuid = '123e4567-e89b-12d3-a456-426614174000';
			expect(getPassageIdFromUrl(`https://example.com/?passageId=${uuid}`)).toBe(uuid);
			expect(getPassageIdFromUrl(`/app?passageId=${uuid}`)).toBe(uuid);
			expect(getPassageIdFromUrl(`?passageId=${uuid}`)).toBe(uuid);
		});

		it('returns null when passageId is missing, empty, or invalid', () => {
			expect(getPassageIdFromUrl('https://example.com/')).toBeNull();
			expect(getPassageIdFromUrl('?passageId=')).toBeNull();
			expect(getPassageIdFromUrl('?passageId=abc')).toBeNull();
			expect(getPassageIdFromUrl('?passageId=0')).toBeNull();
			expect(getPassageIdFromUrl('?passageId=-5')).toBeNull();
			expect(getPassageIdFromUrl('?passageId=NaN')).toBeNull();
			expect(getPassageIdFromUrl(null)).toBeNull();
		});

		it('reads from window.location when no argument is supplied', () => {
			window.history.pushState({}, '', '/?passageId=15');
			expect(getPassageIdFromUrl()).toBe(15);

			window.history.pushState({}, '', '/');
			expect(getPassageIdFromUrl()).toBeNull();
		});
	});

	describe('clearPassageQuery', () => {
		it('removes passageId parameter from URL using state replacement while preserving other params', () => {
			window.history.pushState({}, '', '/app?passageId=42&mode=timed#section');
			clearPassageQuery();

			expect(window.location.pathname).toBe('/app');
			expect(window.location.search).toBe('?mode=timed');
			expect(window.location.hash).toBe('#section');
		});

		it('clears query string completely if passageId was the only parameter', () => {
			window.history.pushState({}, '', '/?passageId=42');
			clearPassageQuery();

			expect(window.location.pathname).toBe('/');
			expect(window.location.search).toBe('');
		});

		it('does nothing when passageId is not in the URL', () => {
			const replaceSpy = vi.spyOn(window.history, 'replaceState');
			window.history.pushState({}, '', '/app?mode=timed');

			clearPassageQuery();
			expect(replaceSpy).not.toHaveBeenCalled();
			expect(window.location.search).toBe('?mode=timed');
		});
	});
});
