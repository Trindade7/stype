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
			id: 'p1',
			text: 'Hello world',
			source: 'Test',
			userId: null,
			createdAt: new Date()
		}).run();

		const result = await load({ locals: {} } as any);
		expect(result).toEqual(expect.objectContaining({
			user: undefined,
			passage: expect.objectContaining({ id: 'p1', text: 'Hello world' }),
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
				id: 'p1',
				text: 'Short passage text.',
				source: 'Short Source',
				userId: null,
				createdAt: new Date()
			},
			{
				id: 'p2',
				text: Array(120).fill('word').join(' '),
				source: 'Long Source',
				userId: null,
				createdAt: new Date()
			}
		]).run();

		await updateUserSettings(testDb, userId, {
			passageLength: 'long'
		});

		const result = (await load({ locals: { user: { id: userId, username: 'alice' } }, url: new URL('http://localhost/app') } as any)) as any;
		expect(result.passage?.id).toBe('p2');
		expect(result.settings.passageLength).toBe('long');
	});

	it('loads specified seeded passage when passageId is provided in URL', async () => {
		const userId = randomUUID();
		testDb.insert(users).values({
			id: userId,
			username: 'alice',
			passwordHash: 'hash',
			createdAt: new Date()
		}).run();

		testDb.insert(passages).values([
			{ id: 'p1', text: 'First passage text.', source: 'Source 1', userId: null, createdAt: new Date() },
			{ id: 'p2', text: 'Second passage text.', source: 'Source 2', userId: null, createdAt: new Date() }
		]).run();

		const result = (await load({
			locals: { user: { id: userId, username: 'alice' } },
			url: new URL('http://localhost/app?passageId=p2')
		} as any)) as any;

		expect(result.passage?.id).toBe('p2');
	});

	it('loads custom passage owned by the authenticated user when passageId is provided in URL', async () => {
		const userId = randomUUID();
		testDb.insert(users).values({
			id: userId,
			username: 'alice',
			passwordHash: 'hash',
			createdAt: new Date()
		}).run();

		testDb.insert(passages).values([
			{ id: 'p1', text: 'Seeded passage.', source: 'Seeded', userId: null, createdAt: new Date() },
			{ id: 'p10', text: 'Alice custom passage.', source: 'Alice', userId, createdAt: new Date() }
		]).run();

		const result = (await load({
			locals: { user: { id: userId, username: 'alice' } },
			url: new URL('http://localhost/app?passageId=p10')
		} as any)) as any;

		expect(result.passage?.id).toBe('p10');
	});

	it('falls back to random passage when passageId belongs to another user (unpermitted)', async () => {
		const aliceId = randomUUID();
		const bobId = randomUUID();
		testDb.insert(users).values([
			{ id: aliceId, username: 'alice', passwordHash: 'hash', createdAt: new Date() },
			{ id: bobId, username: 'bob', passwordHash: 'hash', createdAt: new Date() }
		]).run();

		testDb.insert(passages).values([
			{ id: 'p1', text: 'Seeded passage.', source: 'Seeded', userId: null, createdAt: new Date() },
			{ id: 'p20', text: 'Bob custom passage.', source: 'Bob', userId: bobId, createdAt: new Date() }
		]).run();

		const result = (await load({
			locals: { user: { id: aliceId, username: 'alice' } },
			url: new URL('http://localhost/app?passageId=p20')
		} as any)) as any;

		// Should fall back to seeded passage 1 and NOT return bob's passage 20
		expect(result.passage?.id).toBe('p1');
	});

	it('falls back to random passage when passageId is invalid or non-existent', async () => {
		testDb.insert(passages).values({
			id: 'p1',
			text: 'Seeded passage text.',
			source: 'Seeded',
			userId: null,
			createdAt: new Date()
		}).run();

		const resultInvalid = (await load({
			locals: {},
			url: new URL('http://localhost/app?passageId=invalid')
		} as any)) as any;
		expect(resultInvalid.passage?.id).toBe('p1');

		const resultNonExistent = (await load({
			locals: {},
			url: new URL('http://localhost/app?passageId=9999')
		} as any)) as any;
		expect(resultNonExistent.passage?.id).toBe('p1');
	});

	it('filters out soft-deleted passages from eligible selection', async () => {
		const userId = randomUUID();
		testDb.insert(users).values({
			id: userId,
			username: 'alice',
			passwordHash: 'hash',
			createdAt: new Date()
		}).run();

		const now = new Date();
		testDb.insert(passages).values([
			{
				id: 'p-deleted',
				text: 'Deleted passage',
				source: 'Deleted',
				userId,
				createdAt: now,
				updatedAt: now,
				deletedAt: now
			},
			{
				id: 'p-active',
				text: 'Active passage',
				source: 'Active',
				userId,
				createdAt: now,
				updatedAt: now,
				deletedAt: null
			}
		]).run();

		const result = (await load({
			locals: { user: { id: userId, username: 'alice' } },
			url: new URL('http://localhost/app')
		} as any)) as any;

		expect(result.passage?.id).toBe('p-active');
	});
});
