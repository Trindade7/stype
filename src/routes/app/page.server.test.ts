import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initializeDatabase } from '$lib/server/db';
import { users, passages, userSettings } from '$lib/server/db/schema';
import { randomUUID } from 'node:crypto';
import { load } from './+page.server';
import * as dbModule from '$lib/server/db';
import { updateUserSettings } from '$lib/server/db/settings';

describe('+page.server.ts load', () => {
	let testDb: ReturnType<typeof initializeDatabase>['db'];

	beforeEach(() => {
		const { db } = initializeDatabase(':memory:');
		testDb = db;
		vi.spyOn(dbModule, 'db', 'get').mockReturnValue(testDb);
	});

	it('loads user, settings, and random passage for anonymous user', async () => {
		testDb.insert(passages).values({
			id: 1,
			text: 'Hello world',
			source: 'Test',
			userId: null,
			createdAt: new Date()
		}).run();

		const result = await load({ locals: {} } as any);
		expect(result).toEqual(expect.objectContaining({
			user: undefined,
			passage: expect.objectContaining({ id: 1, text: 'Hello world' }),
			settings: expect.objectContaining({
				mode: 'passage',
				duration: 30,
				passageLength: 'all',
				zenMode: false,
				theme: 'system'
			})
		}));
	});

	it('respects user preferred passage length', async () => {
		const userId = randomUUID();
		testDb.insert(users).values({
			id: userId,
			username: 'alice',
			passwordHash: 'hash',
			createdAt: new Date()
		}).run();

		// Insert a short passage (< 50 words) and a long passage (> 100 words)
		testDb.insert(passages).values([
			{
				id: 1,
				text: 'Short passage text.',
				source: 'Short Source',
				userId: null,
				createdAt: new Date()
			},
			{
				id: 2,
				text: Array(120).fill('word').join(' '),
				source: 'Long Source',
				userId: null,
				createdAt: new Date()
			}
		]).run();

		await updateUserSettings(testDb, userId, {
			passageLength: 'long'
		});

		const result = (await load({ locals: { user: { id: userId, username: 'alice' } } } as any)) as any;
		expect(result.passage?.id).toBe(2);
		expect(result.settings.passageLength).toBe('long');
	});
});
