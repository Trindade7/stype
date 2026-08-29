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
import { DEFAULT_GUEST_SETTINGS, DEFAULT_PASSAGES } from './indexeddb';

function generateUuid(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

let lastRunTimestamp = 0;
function getNextRunCreatedAt(specified?: string): string {
	if (specified) return specified;
	const now = Date.now();
	const timestamp = now <= lastRunTimestamp ? lastRunTimestamp + 1 : now;
	lastRunTimestamp = timestamp;
	return new Date(timestamp).toISOString();
}

let lastPassageTimestamp = 0;
function getNextPassageCreatedAt(specified?: string): string {
	if (specified) return specified;
	const now = Date.now();
	const timestamp = now <= lastPassageTimestamp ? lastPassageTimestamp + 1 : now;
	lastPassageTimestamp = timestamp;
	return new Date(timestamp).toISOString();
}

export class MemoryStoreAdapter implements LocalStoreAdapter {
	private settings: GuestSettings = { ...DEFAULT_GUEST_SETTINGS };
	private customPassages: GuestPassage[] = [];
	private testRuns: GuestTestRun[] = [];

	async getSettings(): Promise<GuestSettings> {
		return { ...this.settings };
	}

	async saveSettings(updates: Partial<GuestSettings>): Promise<GuestSettings> {
		const now = new Date().toISOString();
		this.settings = {
			mode: updates.mode ?? this.settings.mode,
			duration: updates.duration ?? this.settings.duration,
			passageLength: updates.passageLength ?? this.settings.passageLength,
			zenMode: updates.zenMode ?? this.settings.zenMode,
			theme: updates.theme ?? this.settings.theme,
			scrollMode: updates.scrollMode ?? this.settings.scrollMode,
			updatedAt: updates.updatedAt ?? now,
			deletedAt: updates.deletedAt !== undefined ? updates.deletedAt : (this.settings.deletedAt ?? null)
		};
		return { ...this.settings };
	}

	async getCustomPassages(includeDeleted = false): Promise<GuestPassage[]> {
		return this.customPassages
			.filter((p) => includeDeleted || !p.deletedAt)
			.sort((a, b) => {
				if (a.createdAt && b.createdAt) {
					const timeDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
					if (timeDiff !== 0) return timeDiff;
				}
				return 0;
			});
	}

	async saveCustomPassage(input: SaveCustomPassageInput): Promise<GuestPassage> {
		const newId = input.id !== undefined ? input.id : generateUuid();
		const createdAt = getNextPassageCreatedAt(input.createdAt);
		const updatedAt = input.updatedAt ?? createdAt;

		const newPassage: GuestPassage = {
			id: newId,
			text: input.text.trim(),
			source: input.source?.trim() || null,
			createdAt,
			updatedAt,
			deletedAt: input.deletedAt ?? null,
			isCustom: input.isCustom ?? true
		};

		this.customPassages.push(newPassage);
		return { ...newPassage };
	}

	async updateCustomPassage(
		id: string | number,
		input: { text: string; source?: string | null }
	): Promise<GuestPassage | null> {
		const index = this.customPassages.findIndex((p) => p.id === id || String(p.id) === String(id));
		if (index === -1 || this.customPassages[index].deletedAt) return null;

		const now = new Date().toISOString();
		const updated: GuestPassage = {
			...this.customPassages[index],
			text: input.text.trim(),
			source: input.source?.trim() || null,
			updatedAt: now
		};
		this.customPassages[index] = updated;
		return { ...updated };
	}

	async deleteCustomPassage(id: string | number): Promise<boolean> {
		const index = this.customPassages.findIndex((p) => p.id === id || String(p.id) === String(id));
		if (index === -1 || this.customPassages[index].deletedAt) return false;

		const now = new Date().toISOString();
		this.customPassages[index] = {
			...this.customPassages[index],
			deletedAt: now,
			updatedAt: now
		};
		return true;
	}

	async getAllPassages(includeDeleted = false): Promise<GuestPassage[]> {
		const custom = await this.getCustomPassages(includeDeleted);
		return [...DEFAULT_PASSAGES, ...custom];
	}

	async getPassageById(id: string | number, includeDeleted = false): Promise<GuestPassage | null> {
		const all = await this.getAllPassages(includeDeleted);
		return all.find((p) => p.id === id || String(p.id) === String(id)) ?? null;
	}

	async getRandomPassage(lengthFilter: PassageLength = 'all'): Promise<GuestPassage | null> {
		const all = await this.getAllPassages();
		const filtered = filterPassagesByLength(all, lengthFilter);
		if (filtered.length === 0) return null;
		const index = Math.floor(Math.random() * filtered.length);
		return filtered[index];
	}

	async getTestRuns(): Promise<GuestTestRun[]> {
		return [...this.testRuns].sort((a, b) => {
			if (a.createdAt && b.createdAt) {
				const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
				if (timeDiff !== 0) return timeDiff;
			}
			return String(b.id).localeCompare(String(a.id));
		});
	}

	async saveTestRun(result: SaveTestRunInput): Promise<GuestTestRun> {
		const newId = result.id !== undefined ? result.id : generateUuid();
		const pId = result.passageId;

		let matchedPassage = result.passage;
		if (matchedPassage === undefined) {
			const allPassages = await this.getAllPassages();
			const found = allPassages.find((p) => p.id === pId || String(p.id) === String(pId));
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
			passageId: pId,
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
			createdAt: getNextRunCreatedAt(result.createdAt),
			passage: matchedPassage
		};

		this.testRuns.unshift(newRun);
		return { ...newRun };
	}

	async clearTestRuns(): Promise<void> {
		this.testRuns = [];
	}

	async getGuestData(includeDeleted = false): Promise<GuestData> {
		return {
			settings: await this.getSettings(),
			customPassages: await this.getCustomPassages(includeDeleted),
			testRuns: await this.getTestRuns()
		};
	}

	async clearGuestData(): Promise<void> {
		this.settings = { ...DEFAULT_GUEST_SETTINGS };
		this.customPassages = [];
		this.testRuns = [];
	}
}
