import type { LocalStoreAdapter, GuestSettings, GuestPassage, GuestTestRun } from './types';

export const STORAGE_KEYS = {
	SETTINGS: 'stype_guest_settings',
	CUSTOM_PASSAGES: 'stype_guest_custom_passages',
	TEST_RUNS: 'stype_guest_test_runs'
} as const;

function isBrowserWithLocalStorage(): boolean {
	return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export async function migrateFromLocalStorage(adapter: LocalStoreAdapter): Promise<boolean> {
	if (!isBrowserWithLocalStorage()) {
		return false;
	}

	const rawSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
	const rawPassages = localStorage.getItem(STORAGE_KEYS.CUSTOM_PASSAGES);
	const rawRuns = localStorage.getItem(STORAGE_KEYS.TEST_RUNS);

	if (rawSettings === null && rawPassages === null && rawRuns === null) {
		return false;
	}

	if (rawSettings !== null) {
		try {
			const parsed = JSON.parse(rawSettings);
			if (parsed && typeof parsed === 'object') {
				await adapter.saveSettings(parsed as Partial<GuestSettings>);
			}
		} catch (err) {
			console.warn('Failed to parse legacy localStorage settings during migration:', err);
		} finally {
			localStorage.removeItem(STORAGE_KEYS.SETTINGS);
		}
	}

	if (rawPassages !== null) {
		try {
			const parsed = JSON.parse(rawPassages);
			if (Array.isArray(parsed)) {
				for (const p of parsed) {
					if (p && typeof p === 'object' && typeof p.text === 'string') {
						await adapter.saveCustomPassage({
							id: typeof p.id === 'number' ? p.id : undefined,
							text: p.text,
							source: p.source ?? null,
							createdAt: typeof p.createdAt === 'string' ? p.createdAt : undefined,
							isCustom: true
						});
					}
				}
			}
		} catch (err) {
			console.warn('Failed to parse legacy localStorage custom passages during migration:', err);
		} finally {
			localStorage.removeItem(STORAGE_KEYS.CUSTOM_PASSAGES);
		}
	}

	if (rawRuns !== null) {
		try {
			const parsed = JSON.parse(rawRuns);
			if (Array.isArray(parsed)) {
				// In localStorage, runs were saved with newest first.
				// To preserve original order, iterate from oldest to newest if saving one-by-one or save in order
				const runsToMigrate = [...parsed].reverse();
				for (const r of runsToMigrate) {
					if (r && typeof r === 'object' && typeof r.passageId === 'number') {
						await adapter.saveTestRun({
							id: typeof r.id === 'number' ? r.id : undefined,
							passageId: r.passageId,
							mode: r.mode ?? 'passage',
							duration: r.duration ?? null,
							wpm: r.wpm ?? 0,
							accuracy: r.accuracy ?? 0,
							timeElapsed: r.timeElapsed ?? 0,
							correctChars: r.correctChars ?? 0,
							incorrectChars: r.incorrectChars ?? 0,
							extraChars: r.extraChars ?? 0,
							missedChars: r.missedChars ?? 0,
							timelineSnapshots: r.timelineSnapshots ?? [],
							createdAt: typeof r.createdAt === 'string' ? r.createdAt : undefined,
							passage: r.passage ?? null
						});
					}
				}
			}
		} catch (err) {
			console.warn('Failed to parse legacy localStorage test runs during migration:', err);
		} finally {
			localStorage.removeItem(STORAGE_KEYS.TEST_RUNS);
		}
	}

	return true;
}
