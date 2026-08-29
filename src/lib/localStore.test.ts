import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	localStore,
	DEFAULT_GUEST_SETTINGS,
	DEFAULT_PASSAGES,
	STORAGE_KEYS,
	getGuestSettings,
	saveGuestSettings,
	getCustomPassages,
	saveCustomPassage,
	updateCustomPassage,
	deleteCustomPassage,
	getAllPassages,
	getRandomPassage,
	getGuestTestRuns,
	saveGuestTestRun,
	clearGuestTestRuns,
	getGuestData,
	clearGuestData
} from './localStore';
import { setAdapter, resetMigrationStatus } from './storage';

describe('localStore utility', () => {
	beforeEach(async () => {
		localStorage.clear();
		resetMigrationStatus();
		if (typeof indexedDB !== 'undefined') {
			await new Promise<void>((resolve, reject) => {
				const req = indexedDB.deleteDatabase('stype_db');
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
				req.onblocked = () => resolve();
			});
		}
		setAdapter(null);
		vi.restoreAllMocks();
	});

	describe('Settings', () => {
		it('returns default settings when storage is empty', async () => {
			const settings = await getGuestSettings();
			expect(settings).toEqual(DEFAULT_GUEST_SETTINGS);
			expect(settings.mode).toBe('passage');
			expect(settings.duration).toBe(30);
			expect(settings.passageLength).toBe('all');
			expect(settings.zenMode).toBe(false);
			expect(settings.theme).toBe('system');
			expect(settings.scrollMode).toBe('center');
		});

		it('saves and merges updated settings asynchronously', async () => {
			const updated = await saveGuestSettings({
				mode: 'timed',
				duration: 60,
				zenMode: true,
				scrollMode: 'step'
			});

			expect(updated.mode).toBe('timed');
			expect(updated.duration).toBe(60);
			expect(updated.zenMode).toBe(true);
			expect(updated.passageLength).toBe('all');
			expect(updated.theme).toBe('system');
			expect(updated.scrollMode).toBe('step');

			// Re-reading reflects saved settings
			expect(await getGuestSettings()).toEqual(updated);
		});

		it('migrates legacy localStorage settings and falls back to defaults when corrupted', async () => {
			localStorage.setItem(STORAGE_KEYS.SETTINGS, 'invalid-json{{{');
			const settings = await getGuestSettings();
			expect(settings).toEqual(DEFAULT_GUEST_SETTINGS);
			expect(localStorage.getItem(STORAGE_KEYS.SETTINGS)).toBeNull();
		});
	});

	describe('Passages', () => {
		it('returns built-in default passages when no custom passages are stored', async () => {
			const all = await getAllPassages();
			expect(all.length).toBe(DEFAULT_PASSAGES.length);
			expect(all[0].text).toBe(DEFAULT_PASSAGES[0].text);
		});

		it('saves a new custom passage with generated id and createdAt', async () => {
			const custom = await saveCustomPassage({
				text: 'Custom practice sentence for typing test.',
				source: 'User Note'
			});

			expect(custom.id).toBeDefined();
			expect(custom.text).toBe('Custom practice sentence for typing test.');
			expect(custom.source).toBe('User Note');
			expect(custom.isCustom).toBe(true);
			expect(custom.createdAt).toBeDefined();

			const customList = await getCustomPassages();
			expect(customList).toHaveLength(1);
			expect(customList[0].text).toBe('Custom practice sentence for typing test.');

			const all = await getAllPassages();
			expect(all.length).toBe(DEFAULT_PASSAGES.length + 1);
		});

		it('deletes a custom passage by id', async () => {
			const passage1 = await saveCustomPassage({ text: 'Passage 1', source: 'Source 1' });
			const passage2 = await saveCustomPassage({ text: 'Passage 2', source: 'Source 2' });

			expect(await getCustomPassages()).toHaveLength(2);

			const deleted = await deleteCustomPassage(passage1.id);
			expect(deleted).toBe(true);

			const remaining = await getCustomPassages();
			expect(remaining).toHaveLength(1);
			expect(remaining[0].id).toBe(passage2.id);
		});

		it('updates a custom passage by id', async () => {
			const passage = await saveCustomPassage({ text: 'Original text', source: 'Original source' });
			const updated = await updateCustomPassage(passage.id, {
				text: 'Updated text',
				source: 'Updated source'
			});

			expect(updated).not.toBeNull();
			expect(updated?.text).toBe('Updated text');
			expect(updated?.source).toBe('Updated source');

			const customList = await getCustomPassages();
			expect(customList[0].text).toBe('Updated text');
			expect(customList[0].source).toBe('Updated source');
		});

		it('returns null when updating non-existent passage id', async () => {
			const updated = await updateCustomPassage(999999, {
				text: 'Non existent',
				source: 'None'
			});
			expect(updated).toBeNull();
		});

		it('returns false when deleting a non-existent passage id', async () => {
			const deleted = await deleteCustomPassage(999999);
			expect(deleted).toBe(false);
		});

		it('picks a random passage matching length filter', async () => {
			const shortPassage = await getRandomPassage('short');
			expect(shortPassage).not.toBeNull();
			expect(shortPassage?.text).toBeDefined();

			const allPassage = await getRandomPassage('all');
			expect(allPassage).not.toBeNull();
		});

		it('migrates legacy custom passages from localStorage', async () => {
			localStorage.setItem(
				STORAGE_KEYS.CUSTOM_PASSAGES,
				JSON.stringify([
					{
						id: 77,
						text: 'Passage from localStorage',
						source: 'Legacy'
					}
				])
			);

			const passages = await getCustomPassages();
			expect(passages).toHaveLength(1);
			expect(passages[0].id).toBe(77);
			expect(passages[0].text).toBe('Passage from localStorage');
			expect(localStorage.getItem(STORAGE_KEYS.CUSTOM_PASSAGES)).toBeNull();
		});

		it('gets a passage by id from seeded or custom passages', async () => {
			// Seeded passage
			const seeded = await localStore.getPassageById(DEFAULT_PASSAGES[1].id);
			expect(seeded).toEqual(DEFAULT_PASSAGES[1]);

			// Custom passage
			const custom = await saveCustomPassage({
				text: 'Specific custom passage for ID lookup',
				source: 'ID Lookup Test'
			});
			const foundCustom = await localStore.getPassageById(custom.id);
			expect(foundCustom).toEqual(custom);

			// Non-existent passage
			expect(await localStore.getPassageById(999999)).toBeNull();
		});
	});

	describe('Test Runs', () => {
		it('returns empty array when no test runs exist', async () => {
			expect(await getGuestTestRuns()).toEqual([]);
		});

		it('saves completed test run with passage lookup and timestamp', async () => {
			const passage = DEFAULT_PASSAGES[0];
			const completedResult = {
				passageId: passage.id,
				mode: 'passage' as const,
				duration: null,
				wpm: 85,
				accuracy: 98,
				timeElapsed: 12,
				correctChars: 45,
				incorrectChars: 1,
				extraChars: 0,
				missedChars: 0,
				timelineSnapshots: [
					{ second: 1, wpm: 70, accuracy: 100 },
					{ second: 2, wpm: 85, accuracy: 98 }
				]
			};

			const saved = await saveGuestTestRun(completedResult);

			expect(saved.id).toBeDefined();
			expect(saved.wpm).toBe(85);
			expect(saved.accuracy).toBe(98);
			expect(saved.passageId).toBe(passage.id);
			expect(saved.passage?.text).toBe(passage.text);
			expect(saved.passage?.source).toBe(passage.source);
			expect(saved.createdAt).toBeDefined();

			const runs = await getGuestTestRuns();
			expect(runs).toHaveLength(1);
			expect(runs[0].id).toBe(saved.id);
			expect(runs[0].wpm).toBe(85);
		});

		it('prepends newest test runs to the beginning of the list', async () => {
			await saveGuestTestRun({
				passageId: DEFAULT_PASSAGES[0].id,
				mode: 'passage',
				duration: null,
				wpm: 60,
				accuracy: 95,
				timeElapsed: 15,
				correctChars: 40,
				incorrectChars: 2,
				extraChars: 0,
				missedChars: 0,
				timelineSnapshots: []
			});

			await saveGuestTestRun({
				passageId: DEFAULT_PASSAGES[0].id,
				mode: 'passage',
				duration: null,
				wpm: 90,
				accuracy: 99,
				timeElapsed: 10,
				correctChars: 45,
				incorrectChars: 0,
				extraChars: 0,
				missedChars: 0,
				timelineSnapshots: []
			});

			const runs = await getGuestTestRuns();
			expect(runs).toHaveLength(2);
			expect(runs[0].wpm).toBe(90);
			expect(runs[1].wpm).toBe(60);
		});

		it('clears all guest test runs', async () => {
			await saveGuestTestRun({
				passageId: DEFAULT_PASSAGES[0].id,
				mode: 'passage',
				duration: null,
				wpm: 75,
				accuracy: 97,
				timeElapsed: 12,
				correctChars: 45,
				incorrectChars: 1,
				extraChars: 0,
				missedChars: 0,
				timelineSnapshots: []
			});

			expect(await getGuestTestRuns()).toHaveLength(1);
			await clearGuestTestRuns();
			expect(await getGuestTestRuns()).toHaveLength(0);
		});

		it('migrates legacy test runs from localStorage', async () => {
			localStorage.setItem(
				STORAGE_KEYS.TEST_RUNS,
				JSON.stringify([
					{
						id: 999,
						passageId: 1,
						mode: 'passage',
						duration: null,
						wpm: 100,
						accuracy: 100,
						timeElapsed: 10,
						correctChars: 50,
						incorrectChars: 0,
						extraChars: 0,
						missedChars: 0,
						timelineSnapshots: [],
						createdAt: '2025-01-01T00:00:00Z'
					}
				])
			);

			const runs = await getGuestTestRuns();
			expect(runs).toHaveLength(1);
			expect(runs[0].id).toBe(999);
			expect(runs[0].wpm).toBe(100);
			expect(localStorage.getItem(STORAGE_KEYS.TEST_RUNS)).toBeNull();
		});
	});

	describe('Full Data Sync & Reset', () => {
		it('aggregates all guest data via getGuestData', async () => {
			await saveGuestSettings({ mode: 'timed', duration: 15 });
			await saveCustomPassage({ text: 'Custom text' });
			await saveGuestTestRun({
				passageId: DEFAULT_PASSAGES[0].id,
				mode: 'timed',
				duration: 15,
				wpm: 80,
				accuracy: 96,
				timeElapsed: 15,
				correctChars: 50,
				incorrectChars: 2,
				extraChars: 0,
				missedChars: 0,
				timelineSnapshots: []
			});

			const guestData = await getGuestData();
			expect(guestData.settings.mode).toBe('timed');
			expect(guestData.customPassages).toHaveLength(1);
			expect(guestData.testRuns).toHaveLength(1);
		});

		it('clears all guest data when clearGuestData is invoked', async () => {
			await saveGuestSettings({ mode: 'timed' });
			await saveCustomPassage({ text: 'Passage' });
			await saveGuestTestRun({
				passageId: DEFAULT_PASSAGES[0].id,
				mode: 'passage',
				duration: null,
				wpm: 80,
				accuracy: 100,
				timeElapsed: 10,
				correctChars: 40,
				incorrectChars: 0,
				extraChars: 0,
				missedChars: 0,
				timelineSnapshots: []
			});

			await clearGuestData();

			expect(await getCustomPassages()).toEqual([]);
			expect(await getGuestTestRuns()).toEqual([]);
			expect(await getGuestSettings()).toEqual(DEFAULT_GUEST_SETTINGS);
		});
	});

	describe('Environment resilience & SSR safety', () => {
		it('safely handles non-browser environment when window is undefined', async () => {
			const originalWindow = globalThis.window;
			try {
				// @ts-expect-error simulating non-browser environment
				delete globalThis.window;
				setAdapter(null); // Forces MemoryStoreAdapter fallback

				expect(await getGuestSettings()).toEqual(DEFAULT_GUEST_SETTINGS);
				expect(await getCustomPassages()).toEqual([]);
				expect(await getGuestTestRuns()).toEqual([]);
				const passages = await getAllPassages();
				expect(passages.length).toBe(DEFAULT_PASSAGES.length);
				expect(await getRandomPassage('short')).not.toBeNull();

				// Mutations should not throw
				await expect(saveGuestSettings({ mode: 'timed' })).resolves.toBeDefined();
				await expect(saveCustomPassage({ text: 'No crash' })).resolves.toBeDefined();
				await expect(clearGuestTestRuns()).resolves.toBeUndefined();
				await expect(clearGuestData()).resolves.toBeUndefined();
			} finally {
				globalThis.window = originalWindow;
				setAdapter(null);
			}
		});
	});

	describe('localStore object wrapper', () => {
		it('exposes all methods on the localStore namespace object as async functions', async () => {
			expect(await localStore.getSettings()).toEqual(DEFAULT_GUEST_SETTINGS);
			expect(typeof localStore.saveSettings).toBe('function');
			expect(typeof localStore.getAllPassages).toBe('function');
			expect(typeof localStore.getRandomPassage).toBe('function');
			expect(typeof localStore.getTestRuns).toBe('function');
			expect(typeof localStore.saveTestRun).toBe('function');
			expect(typeof localStore.getGuestData).toBe('function');
			expect(typeof localStore.clearGuestData).toBe('function');
		});
	});
});
