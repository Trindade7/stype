import type { Passage } from './server/db/schema';

export type PassageLength = 'short' | 'medium' | 'long' | 'all';

export function countWords(text: string): number {
	const trimmed = text.trim();
	if (!trimmed) return 0;
	return trimmed.split(/\s+/).length;
}

export function getPassageLength(text: string): 'short' | 'medium' | 'long' {
	const words = countWords(text);
	if (words < 50) return 'short';
	if (words <= 100) return 'medium';
	return 'long';
}

export function filterPassagesByLength<T extends { text: string }>(
	passagesList: T[],
	preferredLength: PassageLength
): T[] {
	if (preferredLength === 'all' || passagesList.length === 0) {
		return passagesList;
	}

	const filtered = passagesList.filter(
		(p) => getPassageLength(p.text) === preferredLength
	);

	if (filtered.length === 0) {
		return passagesList;
	}

	return filtered;
}
