import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SyncAccount } from '$lib/storage/types';
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

	describe('sync', () => {
		const mockAccount = {
			serverUrl: 'http://localhost:8090',
			token: 'test-user-token',
			user: {
				id: 'u-typist-1',
				username: 'typist1',
				email: 'typist1@stype.io',
				name: 'Test Typist',
				role: 'user'
			},
			lastSyncedAt: '2026-01-01T00:00:00.000Z',
			backend: 'pocketbase'
		};

		it('uploads local test runs to test_runs collection using client_id and merges server runs', async () => {
			const serverUrl = 'http://localhost:8090';
			const createdRuns: any[] = [];

			const remoteRun = {
				id: 'rec_run_server',
				client_id: 'server-run-99',
				user: 'u-typist-1',
				passage_id: 'passage-1',
				mode: 'timed',
				duration: 60,
				wpm: 120,
				accuracy: 98,
				time_elapsed: 60,
				correct_chars: 580,
				incorrect_chars: 5,
				extra_chars: 2,
				missed_chars: 1,
				timeline_snapshots: [],
				created_at: '2026-01-02T10:00:00.000Z',
				created: '2026-01-02 10:00:00.000Z',
				updated: '2026-01-02 10:00:00.000Z',
				passage: { id: 'passage-1', text: 'Server passage text', source: 'Web' }
			};

			global.fetch = vi.fn().mockImplementation(async (url: string, init: any = {}) => {
				const method = init.method || 'GET';

				if (url.includes('/api/collections/settings/records')) {
					return new Response(JSON.stringify({ items: [] }), {
						status: 200,
						headers: { 'Content-Type': 'application/json' }
					});
				}
				if (url.includes('/api/collections/custom_passages/records')) {
					return new Response(JSON.stringify({ items: [] }), {
						status: 200,
						headers: { 'Content-Type': 'application/json' }
					});
				}
				if (url.includes('/api/collections/test_runs/records')) {
					if (method === 'GET') {
						return new Response(JSON.stringify({ items: [remoteRun] }), {
							status: 200,
							headers: { 'Content-Type': 'application/json' }
						});
					}
					if (method === 'POST') {
						const body = JSON.parse(init.body);
						createdRuns.push(body);
						return new Response(
							JSON.stringify({
								id: 'rec_run_new',
								...body,
								created: '2026-01-02 12:00:00.000Z',
								updated: '2026-01-02 12:00:00.000Z'
							}),
							{ status: 200, headers: { 'Content-Type': 'application/json' } }
						);
					}
				}
				return new Response('Not found', { status: 404 });
			});

			const payload = {
				testRuns: [
					{
						id: 'local-run-1',
						passageId: 'p-1',
						mode: 'timed' as const,
						duration: 30,
						wpm: 110,
						accuracy: 99,
						timeElapsed: 30,
						correctChars: 275,
						incorrectChars: 2,
						extraChars: 0,
						missedChars: 0,
						timelineSnapshots: [],
						createdAt: '2026-01-02T11:00:00.000Z',
						passage: { id: 'p-1', text: 'Passage one', source: null }
					}
				]
			};

			const response = await backend.sync(mockAccount, payload);

			expect(response.success).toBe(true);
			expect(createdRuns.length).toBe(1);
			expect(createdRuns[0]).toMatchObject({
				user: 'u-typist-1',
				client_id: 'local-run-1',
				passage_id: 'p-1',
				mode: 'timed',
				duration: 30,
				wpm: 110,
				accuracy: 99,
				time_elapsed: 30,
				correct_chars: 275,
				incorrect_chars: 2,
				extra_chars: 0,
				missed_chars: 0
			});

			expect(response.testRuns).toHaveLength(2);
			expect(response.testRuns?.some((r) => r.id === 'local-run-1')).toBe(true);
			expect(response.testRuns?.some((r) => r.id === 'server-run-99')).toBe(true);
		});

		it('synchronizes settings using Last-Write-Wins based on updated timestamp', async () => {
			let updatedSettingsBody: any = null;

			const remoteSettings = {
				id: 'rec_settings_1',
				user: 'u-typist-1',
				mode: 'timed',
				duration: 30,
				passage_length: 'short',
				zen_mode: false,
				theme: 'light',
				scroll_mode: 'manual',
				deleted_at: null,
				created: '2026-01-01 10:00:00.000Z',
				updated: '2026-01-01 10:00:00.000Z'
			};

			global.fetch = vi.fn().mockImplementation(async (url: string, init: any = {}) => {
				const method = init.method || 'GET';

				if (url.includes('/api/collections/settings/records')) {
					if (method === 'GET') {
						return new Response(JSON.stringify({ items: [remoteSettings] }), {
							status: 200,
							headers: { 'Content-Type': 'application/json' }
						});
					}
					if (method === 'PATCH') {
						updatedSettingsBody = JSON.parse(init.body);
						return new Response(
							JSON.stringify({
								...remoteSettings,
								...updatedSettingsBody,
								updated: '2026-01-02 15:00:00.000Z'
							}),
							{ status: 200, headers: { 'Content-Type': 'application/json' } }
						);
					}
				}
				if (url.includes('/api/collections/custom_passages/records') || url.includes('/api/collections/test_runs/records')) {
					return new Response(JSON.stringify({ items: [] }), {
						status: 200,
						headers: { 'Content-Type': 'application/json' }
					});
				}
				return new Response('Not found', { status: 404 });
			});

			// Local settings are newer: 14:00 > 10:00
			const payload = {
				settings: {
					mode: 'timed' as const,
					duration: 60,
					passageLength: 'medium' as const,
					zenMode: true,
					theme: 'dark' as const,
					scrollMode: 'step' as const,
					updatedAt: '2026-01-02T14:00:00.000Z'
				}
			};

			const response = await backend.sync(mockAccount, payload);

			expect(response.success).toBe(true);
			expect(updatedSettingsBody).toMatchObject({
				mode: 'timed',
				duration: 60,
				passage_length: 'medium',
				zen_mode: true,
				theme: 'dark',
				scroll_mode: 'step'
			});
			expect(response.settings?.duration).toBe(60);
			expect(response.settings?.theme).toBe('dark');
		});

		it('server settings win when server has more recent timestamp', async () => {
			let patchCalled = false;

			const remoteSettings = {
				id: 'rec_settings_1',
				user: 'u-typist-1',
				mode: 'passage',
				duration: 120,
				passage_length: 'long',
				zen_mode: true,
				theme: 'system',
				scroll_mode: 'center',
				deleted_at: null,
				created: '2026-01-03 10:00:00.000Z',
				updated: '2026-01-03 10:00:00.000Z'
			};

			global.fetch = vi.fn().mockImplementation(async (url: string, init: any = {}) => {
				const method = init.method || 'GET';
				if (url.includes('/api/collections/settings/records')) {
					if (method === 'GET') {
						return new Response(JSON.stringify({ items: [remoteSettings] }), {
							status: 200,
							headers: { 'Content-Type': 'application/json' }
						});
					}
					if (method === 'PATCH') {
						patchCalled = true;
						return new Response('{}', { status: 200 });
					}
				}
				return new Response(JSON.stringify({ items: [] }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				});
			});

			// Local settings are older: Jan 2 < Jan 3
			const payload = {
				settings: {
					mode: 'timed' as const,
					duration: 30,
					passageLength: 'short' as const,
					zenMode: false,
					theme: 'light' as const,
					scrollMode: 'manual' as const,
					updatedAt: '2026-01-02T10:00:00.000Z'
				}
			};

			const response = await backend.sync(mockAccount, payload);

			expect(patchCalled).toBe(false);
			expect(response.settings?.duration).toBe(120);
			expect(response.settings?.passageLength).toBe('long');
		});

		it('creates settings on PocketBase when none exist yet', async () => {
			let createdSettingsBody: any = null;

			global.fetch = vi.fn().mockImplementation(async (url: string, init: any = {}) => {
				const method = init.method || 'GET';
				if (url.includes('/api/collections/settings/records')) {
					if (method === 'GET') {
						return new Response(JSON.stringify({ items: [] }), {
							status: 200,
							headers: { 'Content-Type': 'application/json' }
						});
					}
					if (method === 'POST') {
						createdSettingsBody = JSON.parse(init.body);
						return new Response(
							JSON.stringify({
								id: 'rec_settings_new',
								...createdSettingsBody,
								created: '2026-01-01 10:00:00.000Z',
								updated: '2026-01-01 10:00:00.000Z'
							}),
							{ status: 200, headers: { 'Content-Type': 'application/json' } }
						);
					}
				}
				return new Response(JSON.stringify({ items: [] }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				});
			});

			const payload = {
				settings: {
					mode: 'passage' as const,
					duration: 60,
					passageLength: 'medium' as const,
					zenMode: false,
					theme: 'system' as const,
					scrollMode: 'manual' as const
				}
			};

			const response = await backend.sync(mockAccount, payload);

			expect(response.success).toBe(true);
			expect(createdSettingsBody).toMatchObject({
				user: 'u-typist-1',
				mode: 'passage',
				duration: 60,
				passage_length: 'medium'
			});
			expect(response.settings?.mode).toBe('passage');
		});

		it('synchronizes custom passages bidirectionally and propagates soft delete tombstones', async () => {
			let createdPassageBody: any = null;
			let patchedPassageBody: any = null;

			const remotePassageToTombstone = {
				id: 'rec_p_1',
				client_id: 'local-p-1',
				user: 'u-typist-1',
				text: 'Passage to delete',
				source: 'Book',
				deleted_at: null,
				created: '2026-01-01 10:00:00.000Z',
				updated: '2026-01-01 10:00:00.000Z'
			};

			const remotePassageFromServer = {
				id: 'rec_p_server',
				client_id: 'device2-p',
				user: 'u-typist-1',
				text: 'Created on another device',
				source: 'Web',
				deleted_at: null,
				created: '2026-01-02 12:00:00.000Z',
				updated: '2026-01-02 12:00:00.000Z'
			};

			global.fetch = vi.fn().mockImplementation(async (url: string, init: any = {}) => {
				const method = init.method || 'GET';
				if (url.includes('/api/collections/custom_passages/records')) {
					if (method === 'GET') {
						return new Response(
							JSON.stringify({ items: [remotePassageToTombstone, remotePassageFromServer] }),
							{ status: 200, headers: { 'Content-Type': 'application/json' } }
						);
					}
					if (method === 'POST') {
						createdPassageBody = JSON.parse(init.body);
						return new Response(
							JSON.stringify({
								id: 'rec_p_new',
								...createdPassageBody,
								created: '2026-01-02 15:00:00.000Z',
								updated: '2026-01-02 15:00:00.000Z'
							}),
							{ status: 200, headers: { 'Content-Type': 'application/json' } }
						);
					}
					if (method === 'PATCH') {
						patchedPassageBody = JSON.parse(init.body);
						return new Response(
							JSON.stringify({
								...remotePassageToTombstone,
								...patchedPassageBody,
								updated: '2026-01-02 14:00:00.000Z'
							}),
							{ status: 200, headers: { 'Content-Type': 'application/json' } }
						);
					}
				}
				return new Response(JSON.stringify({ items: [] }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				});
			});

			const payload = {
				customPassages: [
					// Soft-delete tombstone on local-p-1
					{
						id: 'local-p-1',
						text: 'Passage to delete',
						source: 'Book',
						updatedAt: '2026-01-02T13:00:00.000Z',
						deletedAt: '2026-01-02T13:00:00.000Z'
					},
					// New passage created locally
					{
						id: 'local-p-new',
						text: 'Fresh local passage',
						source: 'Manual',
						updatedAt: '2026-01-02T13:00:00.000Z',
						deletedAt: null
					}
				]
			};

			const response = await backend.sync(mockAccount, payload);

			expect(response.success).toBe(true);

			// Check that tombstone was patched to server
			expect(patchedPassageBody).toBeDefined();
			expect(patchedPassageBody.deleted_at).toBe('2026-01-02T13:00:00.000Z');

			// Check that new local passage was posted to server
			expect(createdPassageBody).toMatchObject({
				user: 'u-typist-1',
				client_id: 'local-p-new',
				text: 'Fresh local passage',
				source: 'Manual'
			});

			// Check that server passages are returned
			expect(response.customPassages?.some((p) => p.text === 'Created on another device')).toBe(true);
			const tombstoned = response.customPassages?.find((p) => p.id === 'local-p-1');
			expect(tombstoned?.deletedAt).toBe('2026-01-02T13:00:00.000Z');
		});

		it('formats and throws error when sync collection request fails', async () => {
			global.fetch = vi.fn().mockImplementation(async (url: string) => {
				if (url.includes('/api/collections/settings/records')) {
					return new Response(
						JSON.stringify({
							code: 500,
							message: 'Database locked'
						}),
						{ status: 500, headers: { 'Content-Type': 'application/json' } }
					);
				}
				return new Response(JSON.stringify({ items: [] }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				});
			});

			await expect(backend.sync(mockAccount, {})).rejects.toThrow(/Database locked/i);
		});

		it('fetchRemoteChanges and uploadLocalChanges delegate to sync', async () => {
			const syncSpy = vi.spyOn(backend, 'sync').mockResolvedValue({
				success: true,
				syncedAt: '2026-01-01T00:00:00.000Z'
			});

			await backend.fetchRemoteChanges(mockAccount, '2026-01-01T00:00:00.000Z');
			expect(syncSpy).toHaveBeenCalledWith(mockAccount, { lastSyncedAt: '2026-01-01T00:00:00.000Z' });

			const payload = { testRuns: [] };
			await backend.uploadLocalChanges(mockAccount, payload);
			expect(syncSpy).toHaveBeenCalledWith(mockAccount, payload);
		});
	});

	describe('subscribe', () => {
		const mockAccount: SyncAccount = {
			serverUrl: 'http://localhost:8090',
			token: 'test-token-xyz',
			user: { id: 'u-sub-1', username: 'subuser' },
			lastSyncedAt: null,
			backend: 'pocketbase'
		};

		it('establishes subscriptions on settings, custom_passages, and test_runs collections', async () => {
			const client = backend.getClient(mockAccount.serverUrl);
			const settingsSub = vi.spyOn(client.collection('settings'), 'subscribe').mockResolvedValue(async () => {});
			const passagesSub = vi.spyOn(client.collection('custom_passages'), 'subscribe').mockResolvedValue(async () => {});
			const runsSub = vi.spyOn(client.collection('test_runs'), 'subscribe').mockResolvedValue(async () => {});

			const onUpdate = vi.fn();
			const cleanup = backend.subscribe(mockAccount, onUpdate);

			expect(typeof cleanup).toBe('function');
			expect(settingsSub).toHaveBeenCalledWith('*', expect.any(Function));
			expect(passagesSub).toHaveBeenCalledWith('*', expect.any(Function));
			expect(runsSub).toHaveBeenCalledWith('*', expect.any(Function));
		});

		it('transforms incoming test_runs event and calls onUpdate', async () => {
			const client = backend.getClient(mockAccount.serverUrl);
			let runListener: (e: any) => void = () => {};
			vi.spyOn(client.collection('test_runs'), 'subscribe').mockImplementation(async (_topic, cb) => {
				runListener = cb;
				return async () => {};
			});
			vi.spyOn(client.collection('settings'), 'subscribe').mockResolvedValue(async () => {});
			vi.spyOn(client.collection('custom_passages'), 'subscribe').mockResolvedValue(async () => {});

			const onUpdate = vi.fn();
			backend.subscribe(mockAccount, onUpdate);

			runListener({
				action: 'create',
				record: {
					id: 'rec_run_999',
					client_id: 'client-run-uuid-1',
					passage_id: '1',
					mode: 'timed',
					duration: 60,
					wpm: 88,
					accuracy: 97,
					time_elapsed: 60,
					correct_chars: 400,
					incorrect_chars: 10,
					extra_chars: 2,
					missed_chars: 1,
					timeline_snapshots: [{ second: 1, wpm: 80, rawWpm: 85, errors: 0 }],
					created: '2026-03-01 12:00:00.000Z',
					passage: { text: 'Test passage' }
				}
			});

			expect(onUpdate).toHaveBeenCalledTimes(1);
			expect(onUpdate).toHaveBeenCalledWith({
				testRuns: [
					{
						id: 'client-run-uuid-1',
						passageId: '1',
						mode: 'timed',
						duration: 60,
						wpm: 88,
						accuracy: 97,
						timeElapsed: 60,
						correctChars: 400,
						incorrectChars: 10,
						extraChars: 2,
						missedChars: 1,
						timelineSnapshots: [{ second: 1, wpm: 80, rawWpm: 85, errors: 0 }],
						createdAt: '2026-03-01 12:00:00.000Z',
						passage: { text: 'Test passage' }
					}
				]
			});
		});

		it('transforms incoming custom_passages event and calls onUpdate with tombstones when deleted', async () => {
			const client = backend.getClient(mockAccount.serverUrl);
			let passageListener: (e: any) => void = () => {};
			vi.spyOn(client.collection('custom_passages'), 'subscribe').mockImplementation(async (_topic, cb) => {
				passageListener = cb;
				return async () => {};
			});
			vi.spyOn(client.collection('settings'), 'subscribe').mockResolvedValue(async () => {});
			vi.spyOn(client.collection('test_runs'), 'subscribe').mockResolvedValue(async () => {});

			const onUpdate = vi.fn();
			backend.subscribe(mockAccount, onUpdate);

			// Test update action
			passageListener({
				action: 'update',
				record: {
					id: 'rec_p_1',
					client_id: 'client-p-1',
					text: 'Updated custom passage text',
					source: 'Remote device',
					created: '2026-03-01 10:00:00.000Z',
					updated: '2026-03-01 10:05:00.000Z',
					deleted_at: null
				}
			});

			expect(onUpdate).toHaveBeenCalledWith({
				customPassages: [
					{
						id: 'client-p-1',
						text: 'Updated custom passage text',
						source: 'Remote device',
						createdAt: '2026-03-01 10:00:00.000Z',
						updatedAt: '2026-03-01 10:05:00.000Z',
						deletedAt: null,
						isCustom: true
					}
				]
			});

			// Test delete action
			passageListener({
				action: 'delete',
				record: {
					id: 'rec_p_1',
					client_id: 'client-p-1',
					text: 'Updated custom passage text',
					source: 'Remote device',
					created: '2026-03-01 10:00:00.000Z',
					updated: '2026-03-01 10:10:00.000Z',
					deleted_at: '2026-03-01 10:10:00.000Z'
				}
			});

			expect(onUpdate).toHaveBeenLastCalledWith({
				customPassages: [
					expect.objectContaining({
						id: 'client-p-1',
						deletedAt: expect.any(String),
						isCustom: true
					})
				]
			});
		});

		it('transforms incoming settings event and calls onUpdate', async () => {
			const client = backend.getClient(mockAccount.serverUrl);
			let settingsListener: (e: any) => void = () => {};
			vi.spyOn(client.collection('settings'), 'subscribe').mockImplementation(async (_topic, cb) => {
				settingsListener = cb;
				return async () => {};
			});
			vi.spyOn(client.collection('custom_passages'), 'subscribe').mockResolvedValue(async () => {});
			vi.spyOn(client.collection('test_runs'), 'subscribe').mockResolvedValue(async () => {});

			const onUpdate = vi.fn();
			backend.subscribe(mockAccount, onUpdate);

			settingsListener({
				action: 'update',
				record: {
					id: 'rec_set_1',
					mode: 'timed',
					duration: 30,
					passage_length: 'short',
					zen_mode: true,
					theme: 'dark',
					scroll_mode: 'step',
					created: '2026-03-01 09:00:00.000Z',
					updated: '2026-03-01 09:30:00.000Z',
					deleted_at: null
				}
			});

			expect(onUpdate).toHaveBeenCalledWith({
				settings: {
					mode: 'timed',
					duration: 30,
					passageLength: 'short',
					zenMode: true,
					theme: 'dark',
					scrollMode: 'step',
					updatedAt: '2026-03-01 09:30:00.000Z',
					deletedAt: null
				}
			});
		});

		it('unsubscribes from collections when returned cleanup function is invoked', async () => {
			const client = backend.getClient(mockAccount.serverUrl);
			const unsubSettingsMock = vi.fn();
			const unsubPassagesMock = vi.fn();
			const unsubRunsMock = vi.fn();

			vi.spyOn(client.collection('settings'), 'subscribe').mockResolvedValue(unsubSettingsMock);
			vi.spyOn(client.collection('custom_passages'), 'subscribe').mockResolvedValue(unsubPassagesMock);
			vi.spyOn(client.collection('test_runs'), 'subscribe').mockResolvedValue(unsubRunsMock);

			const unsubSettingsCol = vi.spyOn(client.collection('settings'), 'unsubscribe').mockResolvedValue(undefined as any);
			const unsubPassagesCol = vi.spyOn(client.collection('custom_passages'), 'unsubscribe').mockResolvedValue(undefined as any);
			const unsubRunsCol = vi.spyOn(client.collection('test_runs'), 'unsubscribe').mockResolvedValue(undefined as any);

			const cleanup = backend.subscribe(mockAccount, vi.fn());
			// Allow promises to resolve
			await Promise.resolve();

			cleanup();

			expect(unsubSettingsCol).toHaveBeenCalledWith('*');
			expect(unsubPassagesCol).toHaveBeenCalledWith('*');
			expect(unsubRunsCol).toHaveBeenCalledWith('*');
		});

		it('notifies onError when subscription setup fails or disconnect occurs', async () => {
			const client = backend.getClient(mockAccount.serverUrl);
			vi.spyOn(client.collection('settings'), 'subscribe').mockRejectedValue(new Error('Connection refused'));
			vi.spyOn(client.collection('custom_passages'), 'subscribe').mockResolvedValue(async () => {});
			vi.spyOn(client.collection('test_runs'), 'subscribe').mockResolvedValue(async () => {});

			const onError = vi.fn();
			backend.subscribe(mockAccount, vi.fn(), onError);

			await new Promise((r) => setTimeout(r, 10));

			expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Connection refused' }));

			// Test realtime onDisconnect
			const onErrorDisconnect = vi.fn();
			backend.subscribe(mockAccount, vi.fn(), onErrorDisconnect);
			(client.realtime as any).onDisconnect?.();
			expect(onErrorDisconnect).toHaveBeenCalledWith(
				expect.objectContaining({ message: expect.stringMatching(/disconnected/i) })
			);
		});

		it('notifies onConnect when PB_CONNECT event is received', async () => {
			const client = backend.getClient(mockAccount.serverUrl);
			let connectListener: (e: any) => void = () => {};
			vi.spyOn(client.realtime, 'subscribe').mockImplementation(async (topic, cb) => {
				if (topic === 'PB_CONNECT') {
					connectListener = cb;
				}
				return async () => {};
			});
			vi.spyOn(client.collection('settings'), 'subscribe').mockResolvedValue(async () => {});
			vi.spyOn(client.collection('custom_passages'), 'subscribe').mockResolvedValue(async () => {});
			vi.spyOn(client.collection('test_runs'), 'subscribe').mockResolvedValue(async () => {});

			const onConnect = vi.fn();
			backend.subscribe(mockAccount, vi.fn(), vi.fn(), onConnect);

			// Simulate PocketBase PB_CONNECT event
			connectListener({ clientId: 'pb-client-123' });

			expect(onConnect).toHaveBeenCalledTimes(1);
		});
	});
});


