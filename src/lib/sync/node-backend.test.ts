import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NodeSyncBackend } from './node-backend';
import type { SyncAccount, SyncPayload } from './types';

describe('NodeSyncBackend', () => {
	let backend: NodeSyncBackend;

	beforeEach(() => {
		backend = new NodeSyncBackend();
		vi.restoreAllMocks();
	});

	it('identifies as node backend', () => {
		expect(backend.name).toBe('node');
	});

	describe('login', () => {
		it('authenticates and returns SyncAccount with trimmed server URL', async () => {
			const mockUser = { id: 'u-1', username: 'alice', email: 'alice@example.com' };
			global.fetch = vi.fn().mockImplementation(async (url: string, init: any) => {
				expect(url).toBe('https://stype.io/api/auth/login');
				expect(init.method).toBe('POST');
				expect(init.headers['Content-Type']).toBe('application/json');
				const body = JSON.parse(init.body);
				expect(body.identifier).toBe('alice');
				expect(body.password).toBe('secret');
				expect(body.username).toBe('alice');

				return new Response(
					JSON.stringify({
						token: 'tok-123',
						user: mockUser
					}),
					{ status: 200, headers: { 'Content-Type': 'application/json' } }
				);
			});

			const account = await backend.login({
				serverUrl: 'https://stype.io///',
				identifier: 'alice',
				password: 'secret'
			});

			expect(account).toEqual({
				serverUrl: 'https://stype.io',
				token: 'tok-123',
				user: mockUser,
				lastSyncedAt: null
			});
		});

		it('throws when server URL is empty or whitespace', async () => {
			await expect(
				backend.login({ serverUrl: '   ', identifier: 'alice', password: 'secret' })
			).rejects.toThrow('Server URL is required');
		});

		it('throws server error message on 401', async () => {
			global.fetch = vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ error: 'Invalid credentials' }), {
					status: 401,
					headers: { 'Content-Type': 'application/json' }
				})
			);

			await expect(
				backend.login({ serverUrl: 'https://stype.io', identifier: 'bad', password: 'bad' })
			).rejects.toThrow('Invalid credentials');
		});

		it('throws fallback message when server response has no error property', async () => {
			global.fetch = vi.fn().mockResolvedValue(
				new Response('Server error', { status: 500, statusText: 'Internal Server Error' })
			);

			await expect(
				backend.login({ serverUrl: 'https://stype.io', identifier: 'alice', password: 'pass' })
			).rejects.toThrow('Authentication failed (500)');
		});

		it('throws readable error on network failure', async () => {
			global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

			await expect(
				backend.login({ serverUrl: 'https://stype.io', identifier: 'alice', password: 'pass' })
			).rejects.toThrow('Failed to fetch');
		});
	});

	describe('logout', () => {
		const account: SyncAccount = {
			serverUrl: 'https://stype.io',
			token: 'tok-abc',
			user: { id: 'u-1', username: 'alice' }
		};

		it('sends logout request with authorization header', async () => {
			let calledUrl = '';
			let calledHeaders: any = {};
			global.fetch = vi.fn().mockImplementation(async (url: string, init: any) => {
				calledUrl = url;
				calledHeaders = init.headers;
				return new Response(JSON.stringify({ success: true }));
			});

			await backend.logout(account);

			expect(calledUrl).toBe('https://stype.io/api/auth/logout');
			expect(calledHeaders.Authorization).toBe('Bearer tok-abc');
		});

		it('does not throw when logout network request fails', async () => {
			global.fetch = vi.fn().mockRejectedValue(new Error('Network down'));

			await expect(backend.logout(account)).resolves.toBeUndefined();
		});
	});

	describe('sync', () => {
		const account: SyncAccount = {
			serverUrl: 'https://stype.io',
			token: 'tok-abc',
			user: { id: 'u-1', username: 'alice' }
		};

		const payload: SyncPayload = {
			lastSyncedAt: '2026-01-01T00:00:00.000Z',
			settings: {
				mode: 'timed',
				duration: 30,
				passageLength: 'medium',
				zenMode: false,
				theme: 'system',
				scrollMode: 'step'
			},
			customPassages: [],
			testRuns: []
		};

		it('sends sync payload and returns response data', async () => {
			let sentBody: any = null;
			let sentHeaders: any = null;

			global.fetch = vi.fn().mockImplementation(async (url: string, init: any) => {
				expect(url).toBe('https://stype.io/api/sync');
				sentBody = JSON.parse(init.body);
				sentHeaders = init.headers;

				return new Response(
					JSON.stringify({
						success: true,
						syncedAt: '2026-01-02T00:00:00.000Z',
						customPassages: [],
						testRuns: []
					}),
					{ status: 200, headers: { 'Content-Type': 'application/json' } }
				);
			});

			const response = await backend.sync(account, payload);

			expect(response.success).toBe(true);
			expect(response.syncedAt).toBe('2026-01-02T00:00:00.000Z');
			expect(sentHeaders.Authorization).toBe('Bearer tok-abc');
			expect(sentBody.lastSyncedAt).toBe('2026-01-01T00:00:00.000Z');
		});

		it('throws server error when response is not ok', async () => {
			global.fetch = vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ error: 'Sync failed' }), {
					status: 500,
					headers: { 'Content-Type': 'application/json' }
				})
			);

			await expect(backend.sync(account, payload)).rejects.toThrow('Sync failed');
		});
	});

	describe('fetchRemoteChanges and uploadLocalChanges', () => {
		const account: SyncAccount = {
			serverUrl: 'https://stype.io',
			token: 'tok-abc',
			user: { id: 'u-1', username: 'alice' }
		};

		it('fetchRemoteChanges queries the sync endpoint with lastSyncedAt', async () => {
			const syncSpy = vi.spyOn(backend, 'sync').mockResolvedValue({
				success: true,
				syncedAt: '2026-01-02T00:00:00.000Z'
			});

			const res = await backend.fetchRemoteChanges(account, '2026-01-01T00:00:00.000Z');

			expect(syncSpy).toHaveBeenCalledWith(account, {
				lastSyncedAt: '2026-01-01T00:00:00.000Z'
			});
			expect(res.success).toBe(true);
		});

		it('uploadLocalChanges calls sync with the provided payload', async () => {
			const payload: SyncPayload = { testRuns: [] };
			const syncSpy = vi.spyOn(backend, 'sync').mockResolvedValue({
				success: true,
				syncedAt: '2026-01-02T00:00:00.000Z'
			});

			await backend.uploadLocalChanges(account, payload);

			expect(syncSpy).toHaveBeenCalledWith(account, payload);
		});
	});
});
