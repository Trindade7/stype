import { describe, it, expect } from 'vitest';
import { getPassageLength, filterPassagesByLength } from './passage-utils';

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
});
