import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { SqliteStoreAdapter, createBetterSqliteClient } from './sqlite';
import { DEFAULT_GUEST_SETTINGS } from './indexeddb';

describe('SqliteStoreAdapter', () => {
	let rawDb: Database.Database;
	let adapter: SqliteStoreAdapter;

	beforeEach(() => {
		rawDb = new Database(':memory:');
		const client = createBetterSqliteClient(rawDb);
		adapter = new SqliteStoreAdapter({ client });
	});

	it('returns default settings initially', async () => {
		const settings = await adapter.getSettings();
		expect(settings.mode).toBe('passage');
		expect(settings.duration).toBe(30);
		expect(settings.theme).toBe('system');
	});

	it('persists updated settings and updates updatedAt', async () => {
		const updated = await adapter.saveSettings({
			mode: 'timed',
			duration: 60,
			theme: 'dark',
			zenMode: true
		});

		expect(updated.mode).toBe('timed');
		expect(updated.duration).toBe(60);
		expect(updated.theme).toBe('dark');
		expect(updated.zenMode).toBe(true);

		const fetched = await adapter.getSettings();
		expect(fetched.mode).toBe('timed');
		expect(fetched.duration).toBe(60);
		expect(fetched.theme).toBe('dark');
		expect(fetched.zenMode).toBe(true);
	});

	it('creates, updates, and soft-deletes custom passages', async () => {
		const created = await adapter.saveCustomPassage({
			text: 'Custom native passage for testing.',
			source: 'Native Unit Test'
		});

		expect(created.id).toBeDefined();
		expect(created.text).toBe('Custom native passage for testing.');
		expect(created.source).toBe('Native Unit Test');
		expect(created.isCustom).toBe(true);
		expect(created.deletedAt).toBeNull();

		// Retrieve custom passages
		const activePassages = await adapter.getCustomPassages();
		expect(activePassages).toHaveLength(1);
		expect(activePassages[0].id).toBe(created.id);

		// Update passage
		const updated = await adapter.updateCustomPassage(created.id, {
			text: 'Updated native passage text.',
			source: 'Updated Source'
		});
		expect(updated).not.toBeNull();
		expect(updated?.text).toBe('Updated native passage text.');

		// Soft delete passage
		const deleted = await adapter.deleteCustomPassage(created.id);
		expect(deleted).toBe(true);

		// Active passages should now be empty
		const afterDelete = await adapter.getCustomPassages();
		expect(afterDelete).toHaveLength(0);

		// Include deleted should show the passage with deletedAt set
		const withDeleted = await adapter.getCustomPassages(true);
		expect(withDeleted).toHaveLength(1);
		expect(withDeleted[0].deletedAt).not.toBeNull();
	});

	it('retrieves seeded passages alongside custom passages', async () => {
		const custom = await adapter.saveCustomPassage({
			text: 'Brand new passage text.',
			source: 'Custom author'
		});

		const all = await adapter.getAllPassages();
		expect(all.length).toBeGreaterThan(1);
		expect(all.some((p) => p.id === custom.id)).toBe(true);

		const foundSeeded = await adapter.getPassageById(1);
		expect(foundSeeded).not.toBeNull();
		expect(foundSeeded?.text).toContain('The quick brown fox');

		const foundCustom = await adapter.getPassageById(custom.id);
		expect(foundCustom).not.toBeNull();
		expect(foundCustom?.text).toBe('Brand new passage text.');

		const random = await adapter.getRandomPassage('short');
		expect(random).not.toBeNull();
	});

	it('persists, queries in reverse chronological order, and clears test runs', async () => {
		const run1 = await adapter.saveTestRun({
			passageId: '1',
			mode: 'passage',
			duration: null,
			wpm: 75,
			accuracy: 98,
			timeElapsed: 25.5,
			correctChars: 120,
			incorrectChars: 2,
			extraChars: 0,
			missedChars: 0,
			timelineSnapshots: [{ second: 1, wpm: 70, accuracy: 95, errors: 1 }],
			createdAt: '2026-08-30T10:00:00.000Z'
		});

		const run2 = await adapter.saveTestRun({
			passageId: '1',
			mode: 'passage',
			duration: null,
			wpm: 85,
			accuracy: 99,
			timeElapsed: 22.1,
			correctChars: 125,
			incorrectChars: 1,
			extraChars: 0,
			missedChars: 0,
			timelineSnapshots: [{ second: 1, wpm: 80, accuracy: 98, errors: 0 }],
			createdAt: '2026-08-30T10:05:00.000Z'
		});

		const runs = await adapter.getTestRuns();
		expect(runs).toHaveLength(2);
		// Newest first
		expect(runs[0].id).toBe(run2.id);
		expect(runs[0].wpm).toBe(85);
		expect(runs[0].passage?.text).toContain('The quick brown fox');
		expect(runs[0].timelineSnapshots).toHaveLength(1);
		expect(runs[0].timelineSnapshots[0].wpm).toBe(80);

		expect(runs[1].id).toBe(run1.id);
		expect(runs[1].wpm).toBe(75);

		// Clear test runs
		await adapter.clearTestRuns();
		const cleared = await adapter.getTestRuns();
		expect(cleared).toHaveLength(0);
	});

	it('persists, updates, and clears sync account info', async () => {
		expect(await adapter.getSyncAccount()).toBeNull();

		await adapter.saveSyncAccount({
			serverUrl: 'https://stype.example.com',
			token: 'test-token-xyz',
			user: {
				id: 'u-123',
				username: 'typer',
				email: 'typer@example.com'
			},
			lastSyncedAt: '2026-08-30T12:00:00.000Z'
		});

		const account = await adapter.getSyncAccount();
		expect(account).not.toBeNull();
		expect(account?.serverUrl).toBe('https://stype.example.com');
		expect(account?.token).toBe('test-token-xyz');
		expect(account?.user.username).toBe('typer');
		expect(account?.lastSyncedAt).toBe('2026-08-30T12:00:00.000Z');

		await adapter.clearSyncAccount();
		expect(await adapter.getSyncAccount()).toBeNull();
	});

	it('clears all guest data while resetting settings', async () => {
		await adapter.saveSettings({ theme: 'dark', mode: 'timed' });
		await adapter.saveCustomPassage({ text: 'Some custom passage' });
		await adapter.saveTestRun({
			passageId: '1',
			mode: 'passage',
			duration: null,
			wpm: 90,
			accuracy: 95,
			timeElapsed: 20,
			correctChars: 100,
			incorrectChars: 5,
			extraChars: 0,
			missedChars: 0,
			timelineSnapshots: []
		});

		const dataBefore = await adapter.getGuestData();
		expect(dataBefore.customPassages).toHaveLength(1);
		expect(dataBefore.testRuns).toHaveLength(1);
		expect(dataBefore.settings.theme).toBe('dark');

		await adapter.clearGuestData();

		const dataAfter = await adapter.getGuestData();
		expect(dataAfter.customPassages).toHaveLength(0);
		expect(dataAfter.testRuns).toHaveLength(0);
		expect(dataAfter.settings.theme).toBe('system');
		expect(dataAfter.settings.mode).toBe('passage');
	});
});
