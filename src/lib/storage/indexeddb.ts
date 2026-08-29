import type {
	GuestSettings,
	GuestPassage,
	GuestTestRun,
	GuestData,
	LocalStoreAdapter,
	SaveCustomPassageInput,
	SaveTestRunInput
} from './types';
import type { CompletedTestResult } from '../components/TypingEngine.svelte';
import { filterPassagesByLength, type PassageLength } from '../passage-utils';

export const DEFAULT_GUEST_SETTINGS: GuestSettings = {
	mode: 'passage',
	duration: 30,
	passageLength: 'all',
	zenMode: false,
	theme: 'system',
	scrollMode: 'center'
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

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

export interface IndexedDbOptions {
	dbName?: string;
	version?: number;
}

const SETTINGS_KEY = 'guest_settings';
const STORE_SETTINGS = 'settings';
const STORE_PASSAGES = 'custom_passages';
const STORE_TEST_RUNS = 'test_runs';

export class IndexedDbStoreAdapter implements LocalStoreAdapter {
	private dbName: string;
	private version: number;
	private dbPromise: Promise<IDBDatabase> | null = null;

	constructor(options: IndexedDbOptions = {}) {
		this.dbName = options.dbName ?? 'stype_db';
		this.version = options.version ?? 1;
	}

	private getDb(): Promise<IDBDatabase> {
		if (this.dbPromise) return this.dbPromise;

		if (typeof indexedDB === 'undefined') {
			return Promise.reject(new Error('IndexedDB is not available in this environment'));
		}

		this.dbPromise = new Promise((resolve, reject) => {
			const request = indexedDB.open(this.dbName, this.version);

			request.onupgradeneeded = () => {
				const db = request.result;
				if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
					db.createObjectStore(STORE_SETTINGS);
				}
				if (!db.objectStoreNames.contains(STORE_PASSAGES)) {
					db.createObjectStore(STORE_PASSAGES, { keyPath: 'id' });
				}
				if (!db.objectStoreNames.contains(STORE_TEST_RUNS)) {
					db.createObjectStore(STORE_TEST_RUNS, { keyPath: 'id' });
				}
			};

			request.onsuccess = () => {
				const db = request.result;
				db.onversionchange = () => {
					db.close();
					this.dbPromise = null;
				};
				resolve(db);
			};

			request.onerror = () => {
				this.dbPromise = null;
				reject(request.error);
			};
		});

		return this.dbPromise;
	}

	async getSettings(): Promise<GuestSettings> {
		try {
			const db = await this.getDb();
			const tx = db.transaction(STORE_SETTINGS, 'readonly');
			const store = tx.objectStore(STORE_SETTINGS);
			const stored = await promisifyRequest(store.get(SETTINGS_KEY));

			if (!stored || typeof stored !== 'object') {
				return { ...DEFAULT_GUEST_SETTINGS };
			}

			return {
				mode: stored.mode ?? DEFAULT_GUEST_SETTINGS.mode,
				duration: stored.duration ?? DEFAULT_GUEST_SETTINGS.duration,
				passageLength: stored.passageLength ?? DEFAULT_GUEST_SETTINGS.passageLength,
				zenMode: stored.zenMode ?? DEFAULT_GUEST_SETTINGS.zenMode,
				theme: stored.theme ?? DEFAULT_GUEST_SETTINGS.theme,
				scrollMode: stored.scrollMode ?? DEFAULT_GUEST_SETTINGS.scrollMode
			};
		} catch {
			return { ...DEFAULT_GUEST_SETTINGS };
		}
	}

	async saveSettings(updates: Partial<GuestSettings>): Promise<GuestSettings> {
		const current = await this.getSettings();
		const merged: GuestSettings = {
			mode: updates.mode ?? current.mode,
			duration: updates.duration ?? current.duration,
			passageLength: updates.passageLength ?? current.passageLength,
			zenMode: updates.zenMode ?? current.zenMode,
			theme: updates.theme ?? current.theme,
			scrollMode: updates.scrollMode ?? current.scrollMode
		};

		const db = await this.getDb();
		const tx = db.transaction(STORE_SETTINGS, 'readwrite');
		const store = tx.objectStore(STORE_SETTINGS);
		await promisifyRequest(store.put(merged, SETTINGS_KEY));
		return merged;
	}

	async getCustomPassages(): Promise<GuestPassage[]> {
		try {
			const db = await this.getDb();
			const tx = db.transaction(STORE_PASSAGES, 'readonly');
			const store = tx.objectStore(STORE_PASSAGES);
			const passages = await promisifyRequest(store.getAll());

			if (!Array.isArray(passages)) return [];
			return passages.filter(
				(p): p is GuestPassage =>
					typeof p === 'object' && p !== null && typeof p.id === 'number' && typeof p.text === 'string'
			);
		} catch {
			return [];
		}
	}

	async saveCustomPassage(input: SaveCustomPassageInput): Promise<GuestPassage> {
		let newId = input.id;
		if (newId === undefined) {
			const current = await this.getCustomPassages();
			const maxId = current.reduce((max, p) => Math.max(max, p.id), 7);
			newId = Math.max(Date.now(), maxId + 1);
		}

		const newPassage: GuestPassage = {
			id: newId,
			text: input.text.trim(),
			source: input.source?.trim() || null,
			createdAt: input.createdAt ?? new Date().toISOString(),
			isCustom: input.isCustom ?? true
		};

		const db = await this.getDb();
		const tx = db.transaction(STORE_PASSAGES, 'readwrite');
		const store = tx.objectStore(STORE_PASSAGES);
		await promisifyRequest(store.put(newPassage));
		return newPassage;
	}

	async updateCustomPassage(
		id: number,
		input: { text: string; source?: string | null }
	): Promise<GuestPassage | null> {
		const db = await this.getDb();
		const tx = db.transaction(STORE_PASSAGES, 'readwrite');
		const store = tx.objectStore(STORE_PASSAGES);
		const existing = await promisifyRequest(store.get(id));

		if (!existing) {
			return null;
		}

		const updated: GuestPassage = {
			...existing,
			text: input.text.trim(),
			source: input.source?.trim() || null
		};

		await promisifyRequest(store.put(updated));
		return updated;
	}

	async deleteCustomPassage(id: number): Promise<boolean> {
		const db = await this.getDb();
		const tx = db.transaction(STORE_PASSAGES, 'readwrite');
		const store = tx.objectStore(STORE_PASSAGES);
		const existing = await promisifyRequest(store.get(id));

		if (!existing) {
			return false;
		}

		await promisifyRequest(store.delete(id));
		return true;
	}

	async getAllPassages(): Promise<GuestPassage[]> {
		const custom = await this.getCustomPassages();
		return [...DEFAULT_PASSAGES, ...custom];
	}

	async getPassageById(id: number): Promise<GuestPassage | null> {
		const all = await this.getAllPassages();
		return all.find((p) => p.id === id) ?? null;
	}

	async getRandomPassage(lengthFilter: PassageLength = 'all'): Promise<GuestPassage | null> {
		const all = await this.getAllPassages();
		const filtered = filterPassagesByLength(all, lengthFilter);
		if (filtered.length === 0) return null;
		const index = Math.floor(Math.random() * filtered.length);
		return filtered[index];
	}

	async getTestRuns(): Promise<GuestTestRun[]> {
		try {
			const db = await this.getDb();
			const tx = db.transaction(STORE_TEST_RUNS, 'readonly');
			const store = tx.objectStore(STORE_TEST_RUNS);
			const runs = await promisifyRequest(store.getAll());

			if (!Array.isArray(runs)) return [];

			const valid = runs.filter(
				(r): r is GuestTestRun =>
					typeof r === 'object' && r !== null && typeof r.id === 'number' && typeof r.wpm === 'number'
			);

			// Newest runs first
			return valid.sort((a, b) => {
				if (a.createdAt && b.createdAt) {
					const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
					if (timeDiff !== 0) return timeDiff;
				}
				return b.id - a.id;
			});
		} catch {
			return [];
		}
	}

	async saveTestRun(result: SaveTestRunInput): Promise<GuestTestRun> {
		let newId = result.id;
		if (newId === undefined) {
			const currentRuns = await this.getTestRuns();
			const maxId = currentRuns.reduce((max, r) => Math.max(max, r.id), 0);
			newId = Math.max(Date.now(), maxId + 1);
		}

		let matchedPassage = result.passage;
		if (matchedPassage === undefined) {
			const allPassages = await this.getAllPassages();
			const found = allPassages.find((p) => p.id === result.passageId);
			matchedPassage = found
				? {
						id: found.id,
						text: found.text,
						source: found.source
					}
				: null;
		}

		const newRun: GuestTestRun = {
			id: newId,
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
			createdAt: result.createdAt ?? new Date().toISOString(),
			passage: matchedPassage
		};

		const db = await this.getDb();
		const tx = db.transaction(STORE_TEST_RUNS, 'readwrite');
		const store = tx.objectStore(STORE_TEST_RUNS);
		await promisifyRequest(store.put(newRun));
		return newRun;
	}

	async clearTestRuns(): Promise<void> {
		try {
			const db = await this.getDb();
			const tx = db.transaction(STORE_TEST_RUNS, 'readwrite');
			const store = tx.objectStore(STORE_TEST_RUNS);
			await promisifyRequest(store.clear());
		} catch {
			// Ignore if db unavailable
		}
	}

	async getGuestData(): Promise<GuestData> {
		const [settings, customPassages, testRuns] = await Promise.all([
			this.getSettings(),
			this.getCustomPassages(),
			this.getTestRuns()
		]);

		return {
			settings,
			customPassages,
			testRuns
		};
	}

	async clearGuestData(): Promise<void> {
		try {
			const db = await this.getDb();
			const tx = db.transaction([STORE_SETTINGS, STORE_PASSAGES, STORE_TEST_RUNS], 'readwrite');
			const settingsStore = tx.objectStore(STORE_SETTINGS);
			const passagesStore = tx.objectStore(STORE_PASSAGES);
			const runsStore = tx.objectStore(STORE_TEST_RUNS);

			await Promise.all([
				promisifyRequest(settingsStore.put({ ...DEFAULT_GUEST_SETTINGS }, SETTINGS_KEY)),
				promisifyRequest(passagesStore.clear()),
				promisifyRequest(runsStore.clear())
			]);
		} catch {
			// Ignore if db unavailable
		}
	}
}
