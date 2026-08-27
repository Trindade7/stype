import type { Passage } from './server/db/schema';
import { replaceState } from '$app/navigation';

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

export function getPassageIdFromUrl(
	target?: string | URL | URLSearchParams | null
): number | null {
	let searchParams: URLSearchParams | null = null;

	if (target instanceof URLSearchParams) {
		searchParams = target;
	} else if (target instanceof URL) {
		searchParams = target.searchParams;
	} else if (typeof target === 'string') {
		if (target.includes('?')) {
			const query = target.slice(target.indexOf('?') + 1);
			searchParams = new URLSearchParams(query);
		} else if (target.includes('=')) {
			searchParams = new URLSearchParams(target);
		} else {
			searchParams = new URLSearchParams();
		}
	} else if (target === undefined && typeof window !== 'undefined') {
		searchParams = new URLSearchParams(window.location.search);
	}

	if (!searchParams) return null;

	const idStr = searchParams.get('passageId');
	if (!idStr) return null;

	if (!/^\d+$/.test(idStr.trim())) return null;

	const parsed = parseInt(idStr.trim(), 10);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return null;
	}

	return parsed;
}

export function clearPassageQuery(): void {
	if (typeof window === 'undefined') return;

	const currentUrl = new URL(window.location.href);
	if (!currentUrl.searchParams.has('passageId')) {
		return;
	}

	currentUrl.searchParams.delete('passageId');
	const search = currentUrl.searchParams.toString();
	const newUrl = currentUrl.pathname + (search ? `?${search}` : '') + currentUrl.hash;

	try {
		replaceState(newUrl, {});
	} catch {
		window.history.replaceState(window.history.state, '', newUrl);
	}
}

