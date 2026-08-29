import { describe, it, expect, beforeEach } from 'vitest';
import { IndexedDbStoreAdapter } from './indexeddb';
import { migrateFromLocalStorage, STORAGE_KEYS } from './migration';
import { DEFAULT_GUEST_SETTINGS, DEFAULT_PASSAGES } from '../localStore';

describe('IndexedDbStoreAdapter', () => {
	let adapter: IndexedDbStoreAdapter;
	const DB_NAME = 'stype_test_db';

	beforeEach(async () => {
		// Clear IndexedDB databases between tests
		if (typeof indexedDB !== 'undefined') {
			await new Promise<void>((resolve, reject) => {
				const req = indexedDB.deleteDatabase(DB_NAME);
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
				req.onblocked = () => resolve();
			});
		}
		adapter = new IndexedDbStoreAdapter({ dbName: DB_NAME });
	});

	describe('Settings', () => {
		it('returns default settings when store is newly initialized', async () => {
			const settings = await adapter.getSettings();
			expect(settings).toEqual(DEFAULT_GUEST_SETTINGS);
		});

		it('saves and merges partial settings updates', async () => {
			const updated = await adapter.saveSettings({
				mode: 'timed',
				duration: 60,
				zenMode: true
			});

			expect(updated.mode).toBe('timed');
			expect(updated.duration).toBe(60);
			expect(updated.zenMode).toBe(true);
			expect(updated.scrollMode).toBe('center');

			const fetched = await adapter.getSettings();
			expect(fetched).toEqual(updated);
		});
	});

	describe('Custom Passages', () => {
		it('returns empty array when no custom passages are stored', async () => {
			const passages = await adapter.getCustomPassages();
			expect(passages).toEqual([]);
		});

		it('saves a custom passage and generates id and timestamp', async () => {
			const created = await adapter.saveCustomPassage({
				text: 'Custom IndexedDB test passage.',
				source: 'IDB Unit Test'
			});

			expect(created.id).toBeDefined();
			expect(created.text).toBe('Custom IndexedDB test passage.');
			expect(created.source).toBe('IDB Unit Test');
			expect(created.isCustom).toBe(true);
			expect(created.createdAt).toBeDefined();

			const list = await adapter.getCustomPassages();
			expect(list).toHaveLength(1);
			expect(list[0]).toEqual(created);
		});

		it('updates a custom passage by id', async () => {
			const created = await adapter.saveCustomPassage({
				text: 'Before edit',
				source: 'Source 1'
			});

			const updated = await adapter.updateCustomPassage(created.id, {
				text: 'After edit',
				source: 'Source Updated'
			});

			expect(updated).not.toBeNull();
			expect(updated?.text).toBe('After edit');
			expect(updated?.source).toBe('Source Updated');

			const list = await adapter.getCustomPassages();
			expect(list[0].text).toBe('After edit');
		});

		it('returns null when updating a non-existent passage', async () => {
			const res = await adapter.updateCustomPassage(99999, { text: 'None' });
			expect(res).toBeNull();
		});

		it('deletes a custom passage by id', async () => {
			const p1 = await adapter.saveCustomPassage({ text: 'One' });
			const p2 = await adapter.saveCustomPassage({ text: 'Two' });

			const deleted = await adapter.deleteCustomPassage(p1.id);
			expect(deleted).toBe(true);

			const list = await adapter.getCustomPassages();
			expect(list).toHaveLength(1);
			expect(list[0].id).toBe(p2.id);

			const deletedAgain = await adapter.deleteCustomPassage(p1.id);
			expect(deletedAgain).toBe(false);
		});
	});

	describe('Test Runs', () => {
		it('returns empty array when no test runs exist', async () => {
			const runs = await adapter.getTestRuns();
			expect(runs).toEqual([]);
		});

		it('persists completed test runs and prepends newest first', async () => {
			const passage = DEFAULT_PASSAGES[0];
			const run1 = await adapter.saveTestRun({
				passageId: passage.id,
				mode: 'passage',
				duration: null,
				wpm: 75,
				accuracy: 96,
				timeElapsed: 15,
				correctChars: 50,
				incorrectChars: 2,
				extraChars: 0,
				missedChars: 0,
				timelineSnapshots: []
			});

			const run2 = await adapter.saveTestRun({
				passageId: passage.id,
				mode: 'timed',
				duration: 30,
				wpm: 92,
				accuracy: 99,
				timeElapsed: 30,
				correctChars: 80,
				incorrectChars: 1,
				extraChars: 0,
				missedChars: 0,
				timelineSnapshots: []
			});

			const runs = await adapter.getTestRuns();
			expect(runs).toHaveLength(2);
			expect(runs[0].id).toBe(run2.id);
			expect(runs[0].wpm).toBe(92);
			expect(runs[1].id).toBe(run1.id);
			expect(runs[1].wpm).toBe(75);
		});

		it('clears all test runs', async () => {
			await adapter.saveTestRun({
				passageId: DEFAULT_PASSAGES[0].id,
				mode: 'passage',
				duration: null,
				wpm: 80,
				accuracy: 98,
				timeElapsed: 20,
				correctChars: 60,
				incorrectChars: 1,
				extraChars: 0,
				missedChars: 0,
				timelineSnapshots: []
			});

			expect(await adapter.getTestRuns()).toHaveLength(1);
			await adapter.clearTestRuns();
			expect(await adapter.getTestRuns()).toHaveLength(0);
		});
	});

	describe('Passage lookups and random selection', () => {
		it('combines seeded and custom passages with getAllPassages', async () => {
			const initial = await adapter.getAllPassages();
			expect(initial.length).toBe(DEFAULT_PASSAGES.length);

			await adapter.saveCustomPassage({ text: 'Custom 1' });
			const after = await adapter.getAllPassages();
			expect(after.length).toBe(DEFAULT_PASSAGES.length + 1);
		});

		it('retrieves passage by id from both seeded and custom', async () => {
			const seeded = await adapter.getPassageById(DEFAULT_PASSAGES[0].id);
			expect(seeded).toEqual(DEFAULT_PASSAGES[0]);

			const custom = await adapter.saveCustomPassage({ text: 'Custom lookup test' });
			const foundCustom = await adapter.getPassageById(custom.id);
			expect(foundCustom).toEqual(custom);

			const nonExistent = await adapter.getPassageById(999999);
			expect(nonExistent).toBeNull();
		});

		it('selects a random passage matching length filter', async () => {
			const short = await adapter.getRandomPassage('short');
			expect(short).not.toBeNull();

			const all = await adapter.getRandomPassage('all');
			expect(all).not.toBeNull();
		});
	});

	describe('Guest Data & Reset', () => {
		it('aggregates all guest data', async () => {
			await adapter.saveSettings({ mode: 'timed', duration: 15 });
			await adapter.saveCustomPassage({ text: 'Custom data test' });
			await adapter.saveTestRun({
				passageId: DEFAULT_PASSAGES[0].id,
				mode: 'timed',
				duration: 15,
				wpm: 85,
				accuracy: 97,
				timeElapsed: 15,
				correctChars: 50,
				incorrectChars: 1,
				extraChars: 0,
				missedChars: 0,
				timelineSnapshots: []
			});

			const data = await adapter.getGuestData();
			expect(data.settings.mode).toBe('timed');
			expect(data.settings.duration).toBe(15);
			expect(data.customPassages).toHaveLength(1);
			expect(data.testRuns).toHaveLength(1);
		});

		it('clears all guest data and resets settings to default', async () => {
			await adapter.saveSettings({ mode: 'timed' });
			await adapter.saveCustomPassage({ text: 'Custom' });
			await adapter.saveTestRun({
				passageId: DEFAULT_PASSAGES[0].id,
				mode: 'passage',
				duration: null,
				wpm: 90,
				accuracy: 100,
				timeElapsed: 10,
				correctChars: 40,
				incorrectChars: 0,
				extraChars: 0,
				missedChars: 0,
				timelineSnapshots: []
			});

			await adapter.clearGuestData();

			expect(await adapter.getCustomPassages()).toEqual([]);
			expect(await adapter.getTestRuns()).toEqual([]);
			expect(await adapter.getSettings()).toEqual(DEFAULT_GUEST_SETTINGS);
		});
	});

	describe('Legacy localStorage Migration to IndexedDB', () => {
		it('migrates full legacy payload from localStorage into IndexedDB and cleans up keys', async () => {
			localStorage.setItem(
				STORAGE_KEYS.SETTINGS,
				JSON.stringify({
					mode: 'timed',
					duration: 45,
					scrollMode: 'step',
					zenMode: true
				})
			);

			localStorage.setItem(
				STORAGE_KEYS.CUSTOM_PASSAGES,
				JSON.stringify([
					{
						id: 301,
						text: 'Passage migrated into IndexedDB',
						source: 'Legacy Store'
					}
				])
			);

			localStorage.setItem(
				STORAGE_KEYS.TEST_RUNS,
				JSON.stringify([
					{
						id: 401,
						passageId: 301,
						mode: 'timed',
						duration: 45,
						wpm: 95,
						accuracy: 99,
						timeElapsed: 45,
						correctChars: 120,
						incorrectChars: 1,
						extraChars: 0,
						missedChars: 0,
						timelineSnapshots: [],
						createdAt: '2025-01-10T12:00:00Z'
					}
				])
			);

			const migrated = await migrateFromLocalStorage(adapter);
			expect(migrated).toBe(true);

			const settings = await adapter.getSettings();
			expect(settings.mode).toBe('timed');
			expect(settings.duration).toBe(45);
			expect(settings.scrollMode).toBe('step');
			expect(settings.zenMode).toBe(true);

			const passages = await adapter.getCustomPassages();
			expect(passages).toHaveLength(1);
			expect(passages[0].id).toBe(301);
			expect(passages[0].text).toBe('Passage migrated into IndexedDB');

			const runs = await adapter.getTestRuns();
			expect(runs).toHaveLength(1);
			expect(runs[0].id).toBe(401);
			expect(runs[0].wpm).toBe(95);

			expect(localStorage.getItem(STORAGE_KEYS.SETTINGS)).toBeNull();
			expect(localStorage.getItem(STORAGE_KEYS.CUSTOM_PASSAGES)).toBeNull();
			expect(localStorage.getItem(STORAGE_KEYS.TEST_RUNS)).toBeNull();
		});
	});
});
