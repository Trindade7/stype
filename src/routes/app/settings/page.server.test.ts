import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initializeDatabase } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { randomUUID } from 'node:crypto';
import { load, actions } from './+page.server';
import * as dbModule from '$lib/server/db';
import { getUserSettings } from '$lib/server/db/settings';

describe('/settings page.server', () => {
	let testDb: ReturnType<typeof initializeDatabase>['db'];

	beforeEach(() => {
		const { db } = initializeDatabase(':memory:');
		testDb = db;
		vi.spyOn(dbModule, 'db', 'get').mockReturnValue(testDb);
	});

	it('redirects unauthenticated users to /app/login', async () => {
		await expect(load({ locals: {} } as any)).rejects.toThrow();
	});

	it('loads user and settings for authenticated user', async () => {
		const userId = randomUUID();
		testDb.insert(users).values({
			id: userId,
			username: 'bob',
			passwordHash: 'hash',
			createdAt: new Date()
		}).run();

		const result = await load({ locals: { user: { id: userId, username: 'bob' } } } as any);
		expect(result).toEqual({
			user: { id: userId, username: 'bob' },
			settings: expect.objectContaining({
				userId,
				mode: 'passage',
				duration: 30,
				passageLength: 'all',
				zenMode: false,
				theme: 'system',
				scrollMode: 'center'
			})
		});
	});

	it('updates settings on save action', async () => {
		const userId = randomUUID();
		testDb.insert(users).values({
			id: userId,
			username: 'bob',
			passwordHash: 'hash',
			createdAt: new Date()
		}).run();

		const formData = new FormData();
		formData.set('mode', 'timed');
		formData.set('duration', '60');
		formData.set('passageLength', 'medium');
		formData.set('zenMode', 'on');
		formData.set('theme', 'dark');
		formData.set('scrollMode', 'step');

		const request = new Request('http://localhost/app/settings', {
			method: 'POST',
			body: formData
		});

		const result = await actions.save({
			request,
			locals: { user: { id: userId, username: 'bob' } }
		} as any);

		expect(result).toEqual({ success: true });

		const updated = await getUserSettings(testDb, userId);
		expect(updated.mode).toBe('timed');
		expect(updated.duration).toBe(60);
		expect(updated.passageLength).toBe('medium');
		expect(updated.zenMode).toBe(true);
		expect(updated.theme).toBe('dark');
		expect(updated.scrollMode).toBe('step');
	});

	it('validates invalid settings input', async () => {
		const userId = randomUUID();
		testDb.insert(users).values({
			id: userId,
			username: 'bob',
			passwordHash: 'hash',
			createdAt: new Date()
		}).run();

		const formData = new FormData();
		formData.set('mode', 'invalid_mode');

		const request = new Request('http://localhost/app/settings', {
			method: 'POST',
			body: formData
		});

		const result = await actions.save({
			request,
			locals: { user: { id: userId, username: 'bob' } }
		} as any);

		expect(result).toHaveProperty('status', 400);
	});

	it('validates invalid scroll mode input', async () => {
		const userId = randomUUID();
		testDb.insert(users).values({
			id: userId,
			username: 'bob',
			passwordHash: 'hash',
			createdAt: new Date()
		}).run();

		const formData = new FormData();
		formData.set('scrollMode', 'invalid_scroll_mode');

		const request = new Request('http://localhost/app/settings', {
			method: 'POST',
			body: formData
		});

		const result = await actions.save({
			request,
			locals: { user: { id: userId, username: 'bob' } }
		} as any);

		expect(result).toHaveProperty('status', 400);
		expect(result).toHaveProperty('data', { error: 'Invalid scroll mode' });
	});
});
