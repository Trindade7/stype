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

export class MemoryStoreAdapter implements LocalStoreAdapter {
	private settings: GuestSettings = { ...DEFAULT_GUEST_SETTINGS };
	private customPassages: GuestPassage[] = [];
	private testRuns: GuestTestRun[] = [];

	async getSettings(): Promise<GuestSettings> {
		return { ...this.settings };
	}

	async saveSettings(updates: Partial<GuestSettings>): Promise<GuestSettings> {
		this.settings = {
			mode: updates.mode ?? this.settings.mode,
			duration: updates.duration ?? this.settings.duration,
			passageLength: updates.passageLength ?? this.settings.passageLength,
			zenMode: updates.zenMode ?? this.settings.zenMode,
			theme: updates.theme ?? this.settings.theme,
			scrollMode: updates.scrollMode ?? this.settings.scrollMode
		};
		return { ...this.settings };
	}

	async getCustomPassages(): Promise<GuestPassage[]> {
		return [...this.customPassages];
	}

	async saveCustomPassage(input: SaveCustomPassageInput): Promise<GuestPassage> {
		let newId = input.id;
		if (newId === undefined) {
			const maxId = this.customPassages.reduce((max, p) => Math.max(max, p.id), 7);
			newId = Math.max(Date.now(), maxId + 1);
		}

		const newPassage: GuestPassage = {
			id: newId,
			text: input.text.trim(),
			source: input.source?.trim() || null,
			createdAt: input.createdAt ?? new Date().toISOString(),
			isCustom: input.isCustom ?? true
		};

		this.customPassages.push(newPassage);
		return { ...newPassage };
	}

	async updateCustomPassage(
		id: number,
		input: { text: string; source?: string | null }
	): Promise<GuestPassage | null> {
		const index = this.customPassages.findIndex((p) => p.id === id);
		if (index === -1) return null;

		const updated: GuestPassage = {
			...this.customPassages[index],
			text: input.text.trim(),
			source: input.source?.trim() || null
		};
		this.customPassages[index] = updated;
		return { ...updated };
	}

	async deleteCustomPassage(id: number): Promise<boolean> {
		const index = this.customPassages.findIndex((p) => p.id === id);
		if (index === -1) return false;
		this.customPassages.splice(index, 1);
		return true;
	}

	async getAllPassages(): Promise<GuestPassage[]> {
		return [...DEFAULT_PASSAGES, ...this.customPassages];
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
		return [...this.testRuns].sort((a, b) => {
			if (a.createdAt && b.createdAt) {
				const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
				if (timeDiff !== 0) return timeDiff;
			}
			return b.id - a.id;
		});
	}

	async saveTestRun(result: SaveTestRunInput): Promise<GuestTestRun> {
		let newId = result.id;
		if (newId === undefined) {
			const maxId = this.testRuns.reduce((max, r) => Math.max(max, r.id), 0);
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

		this.testRuns.unshift(newRun);
		return { ...newRun };
	}

	async clearTestRuns(): Promise<void> {
		this.testRuns = [];
	}

	async getGuestData(): Promise<GuestData> {
		return {
			settings: await this.getSettings(),
			customPassages: await this.getCustomPassages(),
			testRuns: await this.getTestRuns()
		};
	}

	async clearGuestData(): Promise<void> {
		this.settings = { ...DEFAULT_GUEST_SETTINGS };
		this.customPassages = [];
		this.testRuns = [];
	}
}
