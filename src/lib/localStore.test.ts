import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	localStore,
	DEFAULT_GUEST_SETTINGS,
	DEFAULT_PASSAGES,
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

describe('localStore utility', () => {
	beforeEach(() => {
		localStorage.clear();
		vi.restoreAllMocks();
	});

	describe('Settings', () => {
		it('returns default settings when storage is empty', () => {
			const settings = getGuestSettings();
			expect(settings).toEqual(DEFAULT_GUEST_SETTINGS);
			expect(settings.mode).toBe('passage');
			expect(settings.duration).toBe(30);
			expect(settings.passageLength).toBe('all');
			expect(settings.zenMode).toBe(false);
			expect(settings.theme).toBe('system');
		});

		it('saves and merges updated settings into localStorage', () => {
			const updated = saveGuestSettings({
				mode: 'timed',
				duration: 60,
				zenMode: true
			});

			expect(updated.mode).toBe('timed');
			expect(updated.duration).toBe(60);
			expect(updated.zenMode).toBe(true);
			expect(updated.passageLength).toBe('all');
			expect(updated.theme).toBe('system');

			const stored = JSON.parse(localStorage.getItem('stype_guest_settings') || '{}');
			expect(stored.mode).toBe('timed');
			expect(stored.duration).toBe(60);
			expect(stored.zenMode).toBe(true);

			// Re-reading reflects saved settings
			expect(getGuestSettings()).toEqual(updated);
		});

		it('handles corrupted JSON in localStorage gracefully with fallback to defaults', () => {
			localStorage.setItem('stype_guest_settings', 'invalid-json{{{');
			const settings = getGuestSettings();
			expect(settings).toEqual(DEFAULT_GUEST_SETTINGS);
		});
	});

	describe('Passages', () => {
		it('returns built-in default passages when no custom passages are stored', () => {
			const all = getAllPassages();
			expect(all.length).toBe(DEFAULT_PASSAGES.length);
			expect(all[0].text).toBe(DEFAULT_PASSAGES[0].text);
		});

		it('saves a new custom passage with generated id and createdAt', () => {
			const custom = saveCustomPassage({
				text: 'Custom practice sentence for typing test.',
				source: 'User Note'
			});

			expect(custom.id).toBeDefined();
			expect(custom.text).toBe('Custom practice sentence for typing test.');
			expect(custom.source).toBe('User Note');
			expect(custom.isCustom).toBe(true);
			expect(custom.createdAt).toBeDefined();

			const customList = getCustomPassages();
			expect(customList).toHaveLength(1);
			expect(customList[0].text).toBe('Custom practice sentence for typing test.');

			const all = getAllPassages();
			expect(all.length).toBe(DEFAULT_PASSAGES.length + 1);
		});

		it('deletes a custom passage by id', () => {
			const passage1 = saveCustomPassage({ text: 'Passage 1', source: 'Source 1' });
			const passage2 = saveCustomPassage({ text: 'Passage 2', source: 'Source 2' });

			expect(getCustomPassages()).toHaveLength(2);

			const deleted = deleteCustomPassage(passage1.id);
			expect(deleted).toBe(true);

			const remaining = getCustomPassages();
			expect(remaining).toHaveLength(1);
			expect(remaining[0].id).toBe(passage2.id);
		});

		it('updates a custom passage by id', () => {
			const passage = saveCustomPassage({ text: 'Original text', source: 'Original source' });
			const updated = updateCustomPassage(passage.id, {
				text: 'Updated text',
				source: 'Updated source'
			});

			expect(updated).not.toBeNull();
			expect(updated?.text).toBe('Updated text');
			expect(updated?.source).toBe('Updated source');

			const customList = getCustomPassages();
			expect(customList[0].text).toBe('Updated text');
			expect(customList[0].source).toBe('Updated source');
		});

		it('returns null when updating non-existent passage id', () => {
			const updated = updateCustomPassage(999999, {
				text: 'Non existent',
				source: 'None'
			});
			expect(updated).toBeNull();
		});

		it('returns false when deleting a non-existent passage id', () => {
			const deleted = deleteCustomPassage(999999);
			expect(deleted).toBe(false);
		});

		it('picks a random passage matching length filter', () => {
			const shortPassage = getRandomPassage('short');
			expect(shortPassage).not.toBeNull();
			expect(shortPassage?.text).toBeDefined();

			const allPassage = getRandomPassage('all');
			expect(allPassage).not.toBeNull();
		});

		it('handles corrupted passages in localStorage gracefully', () => {
			localStorage.setItem('stype_guest_custom_passages', 'corrupt-data');
			expect(getCustomPassages()).toEqual([]);
			expect(getAllPassages().length).toBe(DEFAULT_PASSAGES.length);
		});
	});

	describe('Test Runs', () => {
		it('returns empty array when no test runs exist', () => {
			expect(getGuestTestRuns()).toEqual([]);
		});

		it('saves completed test run with passage lookup and timestamp', () => {
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

			const saved = saveGuestTestRun(completedResult);

			expect(saved.id).toBeDefined();
			expect(saved.wpm).toBe(85);
			expect(saved.accuracy).toBe(98);
			expect(saved.passageId).toBe(passage.id);
			expect(saved.passage?.text).toBe(passage.text);
			expect(saved.passage?.source).toBe(passage.source);
			expect(saved.createdAt).toBeDefined();

			const runs = getGuestTestRuns();
			expect(runs).toHaveLength(1);
			expect(runs[0].id).toBe(saved.id);
			expect(runs[0].wpm).toBe(85);
		});

		it('prepends newest test runs to the beginning of the list', () => {
			saveGuestTestRun({
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

			saveGuestTestRun({
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

			const runs = getGuestTestRuns();
			expect(runs).toHaveLength(2);
			expect(runs[0].wpm).toBe(90);
			expect(runs[1].wpm).toBe(60);
		});

		it('clears all guest test runs', () => {
			saveGuestTestRun({
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

			expect(getGuestTestRuns()).toHaveLength(1);
			clearGuestTestRuns();
			expect(getGuestTestRuns()).toHaveLength(0);
		});

		it('handles corrupted test runs in localStorage gracefully', () => {
			localStorage.setItem('stype_guest_test_runs', 'bad JSON');
			expect(getGuestTestRuns()).toEqual([]);
		});
	});

	describe('Full Data Sync & Reset', () => {
		it('aggregates all guest data via getGuestData', () => {
			saveGuestSettings({ mode: 'timed', duration: 15 });
			saveCustomPassage({ text: 'Custom text' });
			saveGuestTestRun({
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

			const guestData = getGuestData();
			expect(guestData.settings.mode).toBe('timed');
			expect(guestData.customPassages).toHaveLength(1);
			expect(guestData.testRuns).toHaveLength(1);
		});

		it('clears all guest keys when clearGuestData is invoked', () => {
			saveGuestSettings({ mode: 'timed' });
			saveCustomPassage({ text: 'Passage' });
			saveGuestTestRun({
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

			clearGuestData();

			expect(getCustomPassages()).toEqual([]);
			expect(getGuestTestRuns()).toEqual([]);
			expect(getGuestSettings()).toEqual(DEFAULT_GUEST_SETTINGS);
		});
	});

	describe('Environment resilience & SSR safety', () => {
		it('safely handles non-browser environment when window is undefined', () => {
			const originalWindow = globalThis.window;
			try {
				// @ts-expect-error simulating non-browser environment
				delete globalThis.window;

				expect(getGuestSettings()).toEqual(DEFAULT_GUEST_SETTINGS);
				expect(getCustomPassages()).toEqual([]);
				expect(getGuestTestRuns()).toEqual([]);
				expect(getAllPassages().length).toBe(DEFAULT_PASSAGES.length);
				expect(getRandomPassage('short')).not.toBeNull();

				// Mutations should not throw
				expect(() => saveGuestSettings({ mode: 'timed' })).not.toThrow();
				expect(() => saveCustomPassage({ text: 'No crash' })).not.toThrow();
				expect(() => clearGuestTestRuns()).not.toThrow();
				expect(() => clearGuestData()).not.toThrow();
			} finally {
				globalThis.window = originalWindow;
			}
		});
	});

	describe('localStore object wrapper', () => {
		it('exposes all methods on the localStore namespace object', () => {
			expect(localStore.getSettings()).toEqual(DEFAULT_GUEST_SETTINGS);
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
