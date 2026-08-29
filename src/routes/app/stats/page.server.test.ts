import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initializeDatabase } from '$lib/server/db';
import { users, passages, testRuns } from '$lib/server/db/schema';
import { randomUUID } from 'node:crypto';
import { load } from './+page.server';
import * as dbModule from '$lib/server/db';

describe('/app/stats page.server', () => {
	let testDb: ReturnType<typeof initializeDatabase>['db'];

	beforeEach(() => {
		const { db } = initializeDatabase(':memory:');
		testDb = db;
		vi.spyOn(dbModule, 'db', 'get').mockReturnValue(testDb);
	});

	it('redirects unauthenticated users to /app/login', async () => {
		await expect(load({ locals: {} } as any)).rejects.toThrow();
	});

	it('loads aggregated stats and empty runs array when user has no test runs', async () => {
		const userId = randomUUID();
		testDb.insert(users).values({
			id: userId,
			username: 'alice',
			passwordHash: 'hash',
			createdAt: new Date()
		}).run();

		const result = (await load({ locals: { user: { id: userId, username: 'alice' } } } as any)) as any;
		expect(result).toEqual({
			stats: {
				totalTests: 0,
				averageWpm: 0,
				peakWpm: 0,
				averageAccuracy: 0
			},
			runs: []
		});
	});

	it('loads aggregated stats and historical test runs for authenticated user', async () => {
		const userId = randomUUID();
		testDb.insert(users).values({
			id: userId,
			username: 'alice',
			passwordHash: 'hash',
			createdAt: new Date()
		}).run();

		testDb.insert(passages).values({
			id: 'p-1',
			text: 'Test passage text',
			source: 'Source',
			userId: null,
			createdAt: new Date()
		}).run();

		testDb.insert(testRuns).values([
			{
				id: 'run-1',
				userId,
				passageId: 'p-1',
				mode: 'passage',
				duration: null,
				wpm: 60,
				accuracy: 95,
				timeElapsed: 25,
				correctChars: 50,
				incorrectChars: 2,
				extraChars: 0,
				missedChars: 0,
				timelineSnapshots: [],
				createdAt: new Date('2025-01-01T10:00:00Z')
			},
			{
				id: 'run-2',
				userId,
				passageId: 'p-1',
				mode: 'timed',
				duration: 30,
				wpm: 80,
				accuracy: 100,
				timeElapsed: 30,
				correctChars: 70,
				incorrectChars: 0,
				extraChars: 0,
				missedChars: 0,
				timelineSnapshots: [],
				createdAt: new Date('2025-01-02T10:00:00Z')
			}
		]).run();

		const result = (await load({ locals: { user: { id: userId, username: 'alice' } } } as any)) as any;
		expect(result.stats).toEqual({
			totalTests: 2,
			averageWpm: 70,
			peakWpm: 80,
			averageAccuracy: 97.5
		});
		expect(result.runs).toHaveLength(2);
		expect(result.runs[0]).toEqual(
			expect.objectContaining({
				id: 'run-1',
				mode: 'passage',
				wpm: 60,
				accuracy: 95
			})
		);
		expect(result.runs[1]).toEqual(
			expect.objectContaining({
				id: 'run-2',
				mode: 'timed',
				wpm: 80,
				accuracy: 100
			})
		);
	});
});
