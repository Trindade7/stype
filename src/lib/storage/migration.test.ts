import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryStoreAdapter } from './memory';
import { migrateFromLocalStorage } from './migration';
import { STORAGE_KEYS } from '../localStore';
import type { GuestSettings, GuestPassage, GuestTestRun } from './types';

describe('migrateFromLocalStorage', () => {
	let adapter: MemoryStoreAdapter;

	beforeEach(() => {
		localStorage.clear();
		adapter = new MemoryStoreAdapter();
		vi.restoreAllMocks();
	});

	it('returns false and changes nothing when no legacy keys exist', async () => {
		const migrated = await migrateFromLocalStorage(adapter);
		expect(migrated).toBe(false);

		const settings = await adapter.getSettings();
		const passages = await adapter.getCustomPassages();
		const runs = await adapter.getTestRuns();

		expect(passages).toEqual([]);
		expect(runs).toEqual([]);
	});

	it('migrates settings, custom passages, and test runs from localStorage and removes legacy keys', async () => {
		const legacySettings: GuestSettings = {
			mode: 'timed',
			duration: 60,
			passageLength: 'short',
			zenMode: true,
			theme: 'dark',
			scrollMode: 'step'
		};

		const legacyPassages: GuestPassage[] = [
			{
				id: 101,
				text: 'Migrated custom passage text.',
				source: 'Old localStorage Source',
				createdAt: '2025-01-01T00:00:00Z',
				isCustom: true
			}
		];

		const legacyRuns: GuestTestRun[] = [
			{
				id: 201,
				passageId: 1,
				mode: 'passage',
				duration: null,
				wpm: 84,
				accuracy: 98,
				timeElapsed: 14,
				correctChars: 50,
				incorrectChars: 1,
				extraChars: 0,
				missedChars: 0,
				timelineSnapshots: [],
				createdAt: '2025-01-01T00:00:00Z',
				passage: { id: 1, text: 'Text', source: 'Source' }
			}
		];

		localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(legacySettings));
		localStorage.setItem(STORAGE_KEYS.CUSTOM_PASSAGES, JSON.stringify(legacyPassages));
		localStorage.setItem(STORAGE_KEYS.TEST_RUNS, JSON.stringify(legacyRuns));

		const migrated = await migrateFromLocalStorage(adapter);
		expect(migrated).toBe(true);

		// Verified in target store adapter
		const settings = await adapter.getSettings();
		expect(settings.mode).toBe('timed');
		expect(settings.duration).toBe(60);
		expect(settings.zenMode).toBe(true);
		expect(settings.scrollMode).toBe('step');

		const passages = await adapter.getCustomPassages();
		expect(passages).toHaveLength(1);
		expect(passages[0].id).toBe(101);
		expect(passages[0].text).toBe('Migrated custom passage text.');

		const runs = await adapter.getTestRuns();
		expect(runs).toHaveLength(1);
		expect(runs[0].id).toBe(201);
		expect(runs[0].wpm).toBe(84);

		// Obsolete localStorage keys are cleaned up
		expect(localStorage.getItem(STORAGE_KEYS.SETTINGS)).toBeNull();
		expect(localStorage.getItem(STORAGE_KEYS.CUSTOM_PASSAGES)).toBeNull();
		expect(localStorage.getItem(STORAGE_KEYS.TEST_RUNS)).toBeNull();
	});

	it('handles corrupted JSON in legacy keys gracefully without aborting remaining migrations', async () => {
		const legacyPassages: GuestPassage[] = [
			{
				id: 555,
				text: 'Valid passage alongside corrupted settings',
				source: 'Valid'
			}
		];

		localStorage.setItem(STORAGE_KEYS.SETTINGS, 'invalid{{{json');
		localStorage.setItem(STORAGE_KEYS.CUSTOM_PASSAGES, JSON.stringify(legacyPassages));
		localStorage.setItem(STORAGE_KEYS.TEST_RUNS, 'bad-runs-data');

		const migrated = await migrateFromLocalStorage(adapter);
		expect(migrated).toBe(true);

		// Settings falls back to default
		const settings = await adapter.getSettings();
		expect(settings.mode).toBe('passage');

		// Valid passages migrated
		const passages = await adapter.getCustomPassages();
		expect(passages).toHaveLength(1);
		expect(passages[0].id).toBe(555);

		// Test runs empty
		const runs = await adapter.getTestRuns();
		expect(runs).toHaveLength(0);

		// Corrupted keys were still cleaned up
		expect(localStorage.getItem(STORAGE_KEYS.SETTINGS)).toBeNull();
		expect(localStorage.getItem(STORAGE_KEYS.CUSTOM_PASSAGES)).toBeNull();
		expect(localStorage.getItem(STORAGE_KEYS.TEST_RUNS)).toBeNull();
	});

	it('does not throw when window or localStorage is undefined', async () => {
		const originalWindow = globalThis.window;
		try {
			// @ts-expect-error simulating non-browser
			delete globalThis.window;
			const migrated = await migrateFromLocalStorage(adapter);
			expect(migrated).toBe(false);
		} finally {
			globalThis.window = originalWindow;
		}
	});
});
