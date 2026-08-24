import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initializeDatabase } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { randomUUID } from 'node:crypto';
import { PATCH } from './+server';
import * as dbModule from '$lib/server/db';
import { getUserSettings } from '$lib/server/db/settings';

describe('API /api/settings', () => {
	let testDb: ReturnType<typeof initializeDatabase>['db'];

	beforeEach(() => {
		const { db } = initializeDatabase(':memory:');
		testDb = db;
		vi.spyOn(dbModule, 'db', 'get').mockReturnValue(testDb);
	});

	it('rejects unauthorized requests with 401', async () => {
		const request = new Request('http://localhost/api/settings', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ theme: 'dark' })
		});

		const response = await PATCH({ request, locals: {} } as any);
		expect(response.status).toBe(401);
	});

	it('updates settings via PATCH and returns updated settings', async () => {
		const userId = randomUUID();
		testDb.insert(users).values({
			id: userId,
			username: 'charlie',
			passwordHash: 'hash',
			createdAt: new Date()
		}).run();

		const request = new Request('http://localhost/api/settings', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				theme: 'dark',
				zenMode: true,
				mode: 'timed',
				duration: 15,
				passageLength: 'short'
			})
		});

		const response = await PATCH({
			request,
			locals: { user: { id: userId, username: 'charlie' } }
		} as any);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.theme).toBe('dark');
		expect(data.zenMode).toBe(true);
		expect(data.mode).toBe('timed');
		expect(data.duration).toBe(15);
		expect(data.passageLength).toBe('short');

		const saved = await getUserSettings(testDb, userId);
		expect(saved.theme).toBe('dark');
		expect(saved.zenMode).toBe(true);
	});
});
