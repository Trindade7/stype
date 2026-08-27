import { describe, it, expect, beforeEach } from 'vitest';
import { initializeDatabase } from './index';
import { users, userSettings } from './schema';
import { getUserSettings, updateUserSettings } from './settings';
import { randomUUID } from 'node:crypto';

describe('userSettings database operations', () => {
	let testDb: ReturnType<typeof initializeDatabase>['db'];

	beforeEach(() => {
		const { db } = initializeDatabase(':memory:');
		testDb = db;
	});

	it('returns default settings when no settings exist for user', async () => {
		const userId = randomUUID();
		testDb.insert(users).values({
			id: userId,
			username: 'testuser',
			passwordHash: 'hash',
			createdAt: new Date()
		}).run();

		const settings = await getUserSettings(testDb, userId);
		expect(settings).toEqual(expect.objectContaining({
			userId,
			mode: 'passage',
			duration: 30,
			passageLength: 'all',
			zenMode: false,
			theme: 'system',
			scrollMode: 'center'
		}));
	});

	it('persists and updates user settings', async () => {
		const userId = randomUUID();
		testDb.insert(users).values({
			id: userId,
			username: 'testuser2',
			passwordHash: 'hash',
			createdAt: new Date()
		}).run();

		const updated = await updateUserSettings(testDb, userId, {
			mode: 'timed',
			duration: 60,
			passageLength: 'short',
			zenMode: true,
			theme: 'dark',
			scrollMode: 'step'
		});

		expect(updated).toEqual(expect.objectContaining({
			userId,
			mode: 'timed',
			duration: 60,
			passageLength: 'short',
			zenMode: true,
			theme: 'dark',
			scrollMode: 'step'
		}));

		const fetched = await getUserSettings(testDb, userId);
		expect(fetched.mode).toBe('timed');
		expect(fetched.duration).toBe(60);
		expect(fetched.passageLength).toBe('short');
		expect(fetched.zenMode).toBe(true);
		expect(fetched.theme).toBe('dark');
		expect(fetched.scrollMode).toBe('step');
	});

	it('cascades deletion when user is deleted', async () => {
		const userId = randomUUID();
		testDb.insert(users).values({
			id: userId,
			username: 'testuser3',
			passwordHash: 'hash',
			createdAt: new Date()
		}).run();

		await updateUserSettings(testDb, userId, {
			zenMode: true
		});

		testDb.delete(users).where(undefined).run(); // delete users
		const rows = testDb.select().from(userSettings).all();
		expect(rows.length).toBe(0);
	});
});
