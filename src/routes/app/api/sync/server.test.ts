import { describe, expect, it, beforeEach } from 'vitest';
import { POST } from './+server';
import { initializeDatabase } from '$lib/server/db';
import { testRuns, users, passages, userSettings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import * as dbModule from '$lib/server/db';
import { vi } from 'vitest';

vi.mock('$lib/server/db', async () => {
	const actual = await vi.importActual<typeof import('$lib/server/db')>('$lib/server/db');
	return {
		...actual,
		db: undefined
	};
});

describe('POST /app/api/sync', () => {
	let dbInstance: any;

	beforeEach(async () => {
		const { db } = initializeDatabase(':memory:');
		dbInstance = db;
		(dbModule as any).db = db;
		
		await db.insert(users).values({
			id: 'user-1',
			username: 'testuser',
			passwordHash: 'hash',
			createdAt: new Date()
		});

		// Insert existing settings so merge works correctly
		await db.insert(userSettings).values({
			userId: 'user-1',
			mode: 'passage',
			duration: 30,
			passageLength: 'all',
			zenMode: false,
			theme: 'system',
			createdAt: new Date(),
			updatedAt: new Date()
		});

		await db.insert(passages).values({
			id: 'p-default',
			text: 'Default Passage',
			source: 'Test',
			createdAt: new Date()
		});
	});

	it('returns 401 if not authenticated', async () => {
		const req = new Request('http://localhost/app/api/sync', {
			method: 'POST',
			body: JSON.stringify({})
		});
		
		const response = await POST({ request: req, locals: { user: null, session: null } } as any);
		expect(response.status).toBe(401);
	});

	it('syncs settings, custom passages, and test runs idempotently', async () => {
		const payload = {
			settings: {
				mode: 'timed',
				duration: 60,
				passageLength: 'short',
				zenMode: true,
				theme: 'dark',
				scrollMode: 'step'
			},
			customPassages: [
				{
					id: 'c1111111-1111-4111-8111-111111111111',
					text: 'Custom text here',
					source: 'me',
					createdAt: new Date().toISOString()
				}
			],
			testRuns: [
				{
					id: 'r1111111-1111-4111-8111-111111111111',
					passageId: 'c1111111-1111-4111-8111-111111111111',
					mode: 'timed',
					duration: 60,
					wpm: 120,
					accuracy: 99,
					timeElapsed: 60,
					correctChars: 600,
					incorrectChars: 0,
					extraChars: 0,
					missedChars: 0,
					timelineSnapshots: [],
					createdAt: new Date().toISOString(),
					passage: {
						id: 'c1111111-1111-4111-8111-111111111111',
						text: 'Custom text here',
						source: 'me'
					}
				}
			]
		};

		const req = new Request('http://localhost/app/api/sync', {
			method: 'POST',
			body: JSON.stringify(payload)
		});

		const response = await POST({
			request: req,
			locals: { user: { id: 'user-1' }, session: {} }
		} as any);

		expect(response.status).toBe(200);
		const json = await response.json();
		expect(json.success).toBe(true);

		// Check settings
		const settings = await dbInstance.select().from(userSettings).where(eq(userSettings.userId, 'user-1')).get();
		expect(settings.theme).toBe('dark');
		expect(settings.mode).toBe('timed');
		expect(settings.zenMode).toBe(true);
		expect(settings.scrollMode).toBe('step');

		// Check custom passages
		const allPassages = await dbInstance.select().from(passages).all();
		expect(allPassages.length).toBe(2);
		const customP = allPassages.find((p: any) => p.text === 'Custom text here');
		expect(customP).toBeDefined();

		// Check test runs
		const runs = await dbInstance.select().from(testRuns).all();
		expect(runs.length).toBe(1);
		expect(runs[0].wpm).toBe(120);
		expect(runs[0].passageId).toBe(customP.id);

		// Now simulate syncing again with the EXACT same payload (idempotency check)
		const req2 = new Request('http://localhost/app/api/sync', {
			method: 'POST',
			body: JSON.stringify(payload)
		});

		const response2 = await POST({
			request: req2,
			locals: { user: { id: 'user-1' }, session: {} }
		} as any);

		expect(response2.status).toBe(200);

		// Passages should still be 2 (no duplicate 'Custom text here')
		const allPassagesAfter = await dbInstance.select().from(passages).all();
		expect(allPassagesAfter.length).toBe(2);

		// Test runs should still be 1 (no duplicate run with same wpm and createdAt)
		const runsAfter = await dbInstance.select().from(testRuns).all();
		expect(runsAfter.length).toBe(1);
	});

	it('syncs soft-deleted custom passage tombstone', async () => {
		const passageId = 'c2222222-2222-4222-8222-222222222222';
		const deletedTimestamp = new Date().toISOString();

		const payload = {
			customPassages: [
				{
					id: passageId,
					text: 'Tombstoned passage',
					source: 'Tombstone',
					createdAt: new Date(Date.now() - 10000).toISOString(),
					updatedAt: deletedTimestamp,
					deletedAt: deletedTimestamp
				}
			]
		};

		const req = new Request('http://localhost/app/api/sync', {
			method: 'POST',
			body: JSON.stringify(payload)
		});

		const response = await POST({
			request: req,
			locals: { user: { id: 'user-1' }, session: {} }
		} as any);

		expect(response.status).toBe(200);

		const passage = await dbInstance.select().from(passages).where(eq(passages.id, passageId)).get();
		expect(passage).toBeDefined();
		expect(passage?.deletedAt).toBeDefined();
		expect(passage?.deletedAt).toBeInstanceOf(Date);
	});
});
