import { filterPassagesByLength, type PassageLength } from './passage-utils';
import type { CompletedTestResult } from './components/TypingEngine.svelte';
import type { TimelineSnapshot } from './server/db/schema';

export interface GuestSettings {
	mode: 'passage' | 'timed';
	duration: number;
	passageLength: 'all' | 'short' | 'medium' | 'long';
	zenMode: boolean;
	theme: 'light' | 'dark' | 'system';
}

export interface GuestPassage {
	id: number;
	text: string;
	source: string | null;
	createdAt?: string;
	isCustom?: boolean;
}

export interface GuestTestRun {
	id: number;
	passageId: number;
	mode: 'passage' | 'timed';
	duration: number | null;
	wpm: number;
	accuracy: number;
	timeElapsed: number;
	correctChars: number;
	incorrectChars: number;
	extraChars: number;
	missedChars: number;
	timelineSnapshots: TimelineSnapshot[];
	createdAt: string;
	passage?: {
		id: number;
		text: string;
		source: string | null;
	} | null;
}

export interface GuestData {
	settings: GuestSettings;
	customPassages: GuestPassage[];
	testRuns: GuestTestRun[];
}

export const STORAGE_KEYS = {
	SETTINGS: 'stype_guest_settings',
	CUSTOM_PASSAGES: 'stype_guest_custom_passages',
	TEST_RUNS: 'stype_guest_test_runs'
} as const;

export const DEFAULT_GUEST_SETTINGS: GuestSettings = {
	mode: 'passage',
	duration: 30,
	passageLength: 'all',
	zenMode: false,
	theme: 'system'
};

export const DEFAULT_PASSAGES: readonly GuestPassage[] = [
	{
		id: 1,
		text: 'The quick brown fox jumps over the lazy dog.',
		source: 'Classic English pangram'
	},
	{
		id: 2,
		text: "A wizard's job is to vex chumps quickly in fog.",
		source: 'Another pangram'
	},
	{
		id: 3,
		text: 'Hello world! This is a simple test passage for typing practice. Make sure you get the punctuation right.',
		source: 'Test Passage'
	},
	{
		id: 4,
		text: 'SvelteKit is a framework for building web applications of all sizes, with a beautiful development experience and flexible routing.',
		source: 'SvelteKit Docs'
	},
	{
		id: 5,
		text: 'In computer science, a data structure is a data organization, management, and storage format that enables efficient access and modification.',
		source: 'Wikipedia'
	},
	{
		id: 6,
		text: 'Programming is the art of telling another human being what one wants the computer to do. Clean code is not written by following a set of rules. Clean code is written by someone who has developed a sense of craftsmanship and who cares deeply about the craft. The only way to go fast, is to go well. Every time you write a function, you are expressing an idea.',
		source: 'Craftsmanship'
	},
	{
		id: 7,
		text: 'Typography is the art and technique of arranging type to make written language legible, readable and appealing when displayed. The arrangement of type involves selecting typefaces, point sizes, line lengths, line-spacing, and letter-spacing, and adjusting the space between pairs of letters. Type design is a closely related craft, sometimes considered part of typography; most typographers do not design typefaces, and some type designers do not consider themselves typographers. In modern times, typography has been put into work in print, web, television, and film, to present words in a clear and aesthetically pleasing way that enhances communication.',
		source: 'About Typography'
	}
];

function isBrowser(): boolean {
	return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function safeGetItem<T>(key: string, fallback: T): T {
	if (!isBrowser()) return fallback;
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return fallback;
		return JSON.parse(raw) as T;
	} catch {
		return fallback;
	}
}

function safeSetItem<T>(key: string, value: T): void {
	if (!isBrowser()) return;
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// Storage quota exceeded or disabled
	}
}

export function getGuestSettings(): GuestSettings {
	const stored = safeGetItem<Partial<GuestSettings>>(STORAGE_KEYS.SETTINGS, {});
	return {
		mode: stored.mode ?? DEFAULT_GUEST_SETTINGS.mode,
		duration: stored.duration ?? DEFAULT_GUEST_SETTINGS.duration,
		passageLength: stored.passageLength ?? DEFAULT_GUEST_SETTINGS.passageLength,
		zenMode: stored.zenMode ?? DEFAULT_GUEST_SETTINGS.zenMode,
		theme: stored.theme ?? DEFAULT_GUEST_SETTINGS.theme
	};
}

export function saveGuestSettings(updates: Partial<GuestSettings>): GuestSettings {
	const current = getGuestSettings();
	const merged: GuestSettings = {
		mode: updates.mode ?? current.mode,
		duration: updates.duration ?? current.duration,
		passageLength: updates.passageLength ?? current.passageLength,
		zenMode: updates.zenMode ?? current.zenMode,
		theme: updates.theme ?? current.theme
	};
	safeSetItem(STORAGE_KEYS.SETTINGS, merged);
	return merged;
}

export function getCustomPassages(): GuestPassage[] {
	const passages = safeGetItem<unknown[]>(STORAGE_KEYS.CUSTOM_PASSAGES, []);
	if (!Array.isArray(passages)) return [];
	return passages.filter(
		(p): p is GuestPassage =>
			typeof p === 'object' && p !== null && typeof (p as any).id === 'number' && typeof (p as any).text === 'string'
	);
}

export function saveCustomPassage(input: { text: string; source?: string | null }): GuestPassage {
	const current = getCustomPassages();
	const newId = Date.now() + Math.floor(Math.random() * 1000);
	const newPassage: GuestPassage = {
		id: newId,
		text: input.text.trim(),
		source: input.source?.trim() || null,
		createdAt: new Date().toISOString(),
		isCustom: true
	};

	safeSetItem(STORAGE_KEYS.CUSTOM_PASSAGES, [...current, newPassage]);
	return newPassage;
}

export function updateCustomPassage(
	id: number,
	input: { text: string; source?: string | null }
): GuestPassage | null {
	const current = getCustomPassages();
	const index = current.findIndex((p) => p.id === id);
	if (index === -1) {
		return null;
	}
	const updated: GuestPassage = {
		...current[index],
		text: input.text.trim(),
		source: input.source?.trim() || null
	};
	const next = [...current];
	next[index] = updated;
	safeSetItem(STORAGE_KEYS.CUSTOM_PASSAGES, next);
	return updated;
}

export function deleteCustomPassage(id: number): boolean {
	const current = getCustomPassages();
	const filtered = current.filter((p) => p.id !== id);
	if (filtered.length === current.length) {
		return false;
	}
	safeSetItem(STORAGE_KEYS.CUSTOM_PASSAGES, filtered);
	return true;
}

export function getAllPassages(): GuestPassage[] {
	const custom = getCustomPassages();
	return [...DEFAULT_PASSAGES, ...custom];
}

export function getRandomPassage(lengthFilter: PassageLength = 'all'): GuestPassage | null {
	const all = getAllPassages();
	const filtered = filterPassagesByLength(all, lengthFilter);
	if (filtered.length === 0) return null;
	const index = Math.floor(Math.random() * filtered.length);
	return filtered[index];
}

export function getGuestTestRuns(): GuestTestRun[] {
	const runs = safeGetItem<unknown[]>(STORAGE_KEYS.TEST_RUNS, []);
	if (!Array.isArray(runs)) return [];
	return runs.filter(
		(r): r is GuestTestRun =>
			typeof r === 'object' && r !== null && typeof (r as any).id === 'number' && typeof (r as any).wpm === 'number'
	);
}

export function saveGuestTestRun(result: CompletedTestResult): GuestTestRun {
	const currentRuns = getGuestTestRuns();
	const allPassages = getAllPassages();
	const matchedPassage = allPassages.find((p) => p.id === result.passageId) ?? null;

	const newRun: GuestTestRun = {
		id: Date.now() + Math.floor(Math.random() * 1000),
		passageId: result.passageId,
		mode: result.mode,
		duration: result.duration,
		wpm: result.wpm,
		accuracy: result.accuracy,
		timeElapsed: result.timeElapsed,
		correctChars: result.correctChars,
		incorrectChars: result.incorrectChars,
		extraChars: result.extraChars,
		missedChars: result.missedChars,
		timelineSnapshots: result.timelineSnapshots ?? [],
		createdAt: new Date().toISOString(),
		passage: matchedPassage
			? {
					id: matchedPassage.id,
					text: matchedPassage.text,
					source: matchedPassage.source
				}
			: null
	};

	safeSetItem(STORAGE_KEYS.TEST_RUNS, [newRun, ...currentRuns]);
	return newRun;
}

export function clearGuestTestRuns(): void {
	if (!isBrowser()) return;
	localStorage.removeItem(STORAGE_KEYS.TEST_RUNS);
}

export function getGuestData(): GuestData {
	return {
		settings: getGuestSettings(),
		customPassages: getCustomPassages(),
		testRuns: getGuestTestRuns()
	};
}

export function clearGuestData(): void {
	if (!isBrowser()) return;
	localStorage.removeItem(STORAGE_KEYS.SETTINGS);
	localStorage.removeItem(STORAGE_KEYS.CUSTOM_PASSAGES);
	localStorage.removeItem(STORAGE_KEYS.TEST_RUNS);
}

export const localStore = {
	getSettings: getGuestSettings,
	saveSettings: saveGuestSettings,
	getCustomPassages,
	saveCustomPassage,
	updateCustomPassage,
	deleteCustomPassage,
	getAllPassages,
	getRandomPassage,
	getTestRuns: getGuestTestRuns,
	saveTestRun: saveGuestTestRun,
	clearTestRuns: clearGuestTestRuns,
	getGuestData,
	clearGuestData
};
