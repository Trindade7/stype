import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	PocketBaseSyncBackend,
	isPocketBaseHost,
	detectDefaultServerUrl
} from './pocketbase-backend';

describe('PocketBaseSyncBackend', () => {
	let backend: PocketBaseSyncBackend;

	beforeEach(() => {
		backend = new PocketBaseSyncBackend();
		vi.restoreAllMocks();
	});

	describe('login', () => {
		it('authenticates against users collection and returns SyncAccount', async () => {
			const serverUrl = 'http://localhost:8090';

			global.fetch = vi.fn().mockImplementation(async (url: string, init: any) => {
				if (url === `${serverUrl}/api/collections/users/auth-with-password`) {
					const body = JSON.parse(init.body);
					if (body.identity === 'typist1' && body.password === 'validpass123') {
						return new Response(
							JSON.stringify({
								token: 'pb-jwt-token-xyz',
								record: {
									id: 'rec_user_1',
									username: 'typist1',
									email: 'typist1@example.com',
									name: 'Test Typist'
								}
							}),
							{ status: 200, headers: { 'Content-Type': 'application/json' } }
						);
					}
					return new Response(
						JSON.stringify({
							code: 400,
							message: 'Failed to authenticate.',
							data: {}
						}),
						{ status: 400, headers: { 'Content-Type': 'application/json' } }
					);
				}
				return new Response('Not found', { status: 404 });
			});

			const account = await backend.login({
				serverUrl,
				identifier: 'typist1',
				password: 'validpass123'
			});

			expect(account).toEqual({
				serverUrl: 'http://localhost:8090',
				token: 'pb-jwt-token-xyz',
				user: {
					id: 'rec_user_1',
					username: 'typist1',
					email: 'typist1@example.com',
					name: 'Test Typist',
					role: 'user'
				},
				lastSyncedAt: null,
				backend: 'pocketbase'
			});
		});
	});

	describe('register', () => {
		it('creates user with passwordConfirm, authenticates, and returns SyncAccount', async () => {
			const serverUrl = 'http://localhost:8090';
			let createdPayload: any = null;

			global.fetch = vi.fn().mockImplementation(async (url: string, init: any) => {
				if (url === `${serverUrl}/api/collections/users/records`) {
					createdPayload = JSON.parse(init.body);
					return new Response(
						JSON.stringify({
							id: 'rec_user_2',
							username: createdPayload.username,
							email: createdPayload.email,
							name: createdPayload.name
						}),
						{ status: 200, headers: { 'Content-Type': 'application/json' } }
					);
				}
				if (url === `${serverUrl}/api/collections/users/auth-with-password`) {
					const body = JSON.parse(init.body);
					if (body.identity === 'newuser' && body.password === 'secretpass123') {
						return new Response(
							JSON.stringify({
								token: 'pb-newuser-token',
								record: {
									id: 'rec_user_2',
									username: 'newuser',
									email: 'newuser@stype.io',
									name: 'New Typist'
								}
							}),
							{ status: 200, headers: { 'Content-Type': 'application/json' } }
						);
					}
				}
				return new Response('Not found', { status: 404 });
			});

			const account = await backend.register({
				serverUrl,
				username: 'newuser',
				password: 'secretpass123',
				email: 'newuser@stype.io',
				name: 'New Typist'
			});

			expect(createdPayload).toEqual({
				username: 'newuser',
				email: 'newuser@stype.io',
				password: 'secretpass123',
				passwordConfirm: 'secretpass123',
				name: 'New Typist'
			});

			expect(account).toEqual({
				serverUrl: 'http://localhost:8090',
				token: 'pb-newuser-token',
				user: {
					id: 'rec_user_2',
					username: 'newuser',
					email: 'newuser@stype.io',
					name: 'New Typist',
					role: 'user'
				},
				lastSyncedAt: null,
				backend: 'pocketbase'
			});
		});

		it('formats validation errors when username is already taken', async () => {
			const serverUrl = 'http://localhost:8090';

			global.fetch = vi.fn().mockImplementation(async (url: string) => {
				if (url === `${serverUrl}/api/collections/users/records`) {
					return new Response(
						JSON.stringify({
							code: 400,
							message: 'Failed to create record.',
							data: {
								username: {
									code: 'validation_not_unique',
									message: 'The username is already in use.'
								}
							}
						}),
						{ status: 400, headers: { 'Content-Type': 'application/json' } }
					);
				}
				return new Response('Not found', { status: 404 });
			});

			await expect(
				backend.register({
					serverUrl,
					username: 'existinguser',
					password: 'secretpass123'
				})
			).rejects.toThrow(/username: The username is already in use/i);
		});
	});

	describe('logout', () => {
		it('clears client auth store', async () => {
			const serverUrl = 'http://localhost:8090';
			const client = backend.getClient(serverUrl);
			client.authStore.save('mock-token-xyz', { id: 'u-1', username: 'typist' } as any);
			expect(client.authStore.token).toBe('mock-token-xyz');

			await backend.logout({
				serverUrl,
				token: 'mock-token-xyz',
				user: { id: 'u-1', username: 'typist' }
			});

			expect(client.authStore.token).toBe('');
			expect(client.authStore.record).toBeNull();
		});
	});

	describe('supports and host detection', () => {
		it('returns true when /api/health responds with healthy PocketBase status', async () => {
			global.fetch = vi.fn().mockImplementation(async (url: string) => {
				if (url === 'http://localhost:8090/api/health') {
					return new Response(
						JSON.stringify({ code: 200, message: 'API is healthy.', data: {} }),
						{ status: 200, headers: { 'Content-Type': 'application/json' } }
					);
				}
				return new Response('Not found', { status: 404 });
			});

			const isSupported = await backend.supports('http://localhost:8090');
			expect(isSupported).toBe(true);

			const isPB = await isPocketBaseHost('http://localhost:8090');
			expect(isPB).toBe(true);
		});

		it('returns false when /api/health returns 404 or fails', async () => {
			global.fetch = vi.fn().mockImplementation(async () => {
				return new Response('Not found', { status: 404 });
			});

			const isSupported = await backend.supports('http://localhost:3000');
			expect(isSupported).toBe(false);

			const isPB = await isPocketBaseHost('http://localhost:3000');
			expect(isPB).toBe(false);
		});

		it('detectDefaultServerUrl returns origin when hosted on PocketBase', async () => {
			const originalOrigin = window.location.origin;
			global.fetch = vi.fn().mockImplementation(async (url: string) => {
				if (url === `${originalOrigin}/api/health`) {
					return new Response(
						JSON.stringify({ code: 200, message: 'API is healthy.', data: {} }),
						{ status: 200, headers: { 'Content-Type': 'application/json' } }
					);
				}
				return new Response('Not found', { status: 404 });
			});

			const defaultUrl = await detectDefaultServerUrl();
			expect(defaultUrl).toBe(originalOrigin);
		});

		it('detectDefaultServerUrl returns empty string when not hosted on PocketBase', async () => {
			global.fetch = vi.fn().mockImplementation(async () => {
				return new Response('Not found', { status: 404 });
			});

			const defaultUrl = await detectDefaultServerUrl();
			expect(defaultUrl).toBe('');
		});
	});
});

