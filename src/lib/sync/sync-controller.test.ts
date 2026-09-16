import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SyncController } from './sync-controller';
import { NodeSyncBackend } from './node-backend';
import { MemoryStoreAdapter } from '$lib/storage/memory';
import type { SyncAccount } from '$lib/storage/types';
import type { SyncBackend, SyncPayload, SyncResponse } from './types';

describe('SyncController', () => {
	let memoryAdapter: MemoryStoreAdapter;
	let controller: SyncController;

	beforeEach(() => {
		memoryAdapter = new MemoryStoreAdapter();
		controller = new SyncController({ adapter: memoryAdapter });
		vi.restoreAllMocks();
	});

	afterEach(() => {
		controller.destroy();
	});

	describe('linkAccount and unlinkAccount', () => {
		it('links account successfully via server URL and credentials', async () => {
			const mockAccountUser = {
				id: 'u-123',
				username: 'speedster',
				email: 'speed@stype.io'
			};

			global.fetch = vi.fn().mockImplementation(async (url: string, init: any) => {
				if (url === 'https://stype.io/api/auth/login') {
					const body = JSON.parse(init.body);
					if (body.identifier === 'speedster' && body.password === 'pass123') {
						return new Response(
							JSON.stringify({
								token: 'token-abc-456',
								user: mockAccountUser
							}),
							{ status: 200, headers: { 'Content-Type': 'application/json' } }
						);
					}
					return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
				}
				if (url === 'https://stype.io/api/sync') {
					return new Response(
						JSON.stringify({
							success: true,
							syncedAt: '2026-02-01T00:00:00.000Z',
							testRuns: [],
							customPassages: []
						}),
						{ status: 200, headers: { 'Content-Type': 'application/json' } }
					);
				}
				return new Response('Not found', { status: 404 });
			});

			const account = await controller.linkAccount('https://stype.io/', 'speedster', 'pass123');

			expect(account.serverUrl).toBe('https://stype.io');
			expect(account.token).toBe('token-abc-456');
			expect(account.user.username).toBe('speedster');

			const stored = await memoryAdapter.getSyncAccount();
			expect(stored?.token).toBe('token-abc-456');

			const state = controller.getState();
			expect(state.account?.token).toBe('token-abc-456');
		});

		it('throws on invalid credentials when linking', async () => {
			global.fetch = vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ error: 'Invalid credentials' }), {
					status: 401,
					headers: { 'Content-Type': 'application/json' }
				})
			);

			await expect(controller.linkAccount('https://stype.io', 'baduser', 'badpass')).rejects.toThrow(
				'Invalid credentials'
			);

			const stored = await memoryAdapter.getSyncAccount();
			expect(stored).toBeNull();
		});

		it('unlinks account and clears stored session credentials', async () => {
			const existingAccount: SyncAccount = {
				serverUrl: 'https://stype.io',
				token: 'token-to-delete',
				user: { id: 'u-1', username: 'user1' },
				lastSyncedAt: '2026-01-01T00:00:00.000Z'
			};
			await memoryAdapter.saveSyncAccount(existingAccount);
			await controller.init();

			global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true })));

			await controller.unlinkAccount();

			expect(await memoryAdapter.getSyncAccount()).toBeNull();
			expect(controller.getState().account).toBeNull();
		});
	});

	describe('sync() execution', () => {
		const linkedAccount: SyncAccount = {
			serverUrl: 'https://sync-server.local',
			token: 'bearer-token-999',
			user: { id: 'u-999', username: 'protypist' },
			lastSyncedAt: '2026-01-01T00:00:00.000Z'
		};

		beforeEach(async () => {
			await memoryAdapter.saveSyncAccount(linkedAccount);
			await controller.init();
		});

		it('pushes local runs and custom passages and merges server changes idempotently', async () => {
			// Save local data
			await memoryAdapter.saveSettings({ mode: 'timed', duration: 15, updatedAt: '2026-01-02T10:00:00.000Z' });
			const localPassage = await memoryAdapter.saveCustomPassage({
				id: 'local-p-1',
				text: 'Local passage',
				updatedAt: '2026-01-02T10:00:00.000Z'
			});
			const localRun = await memoryAdapter.saveTestRun({
				id: 'local-run-1',
				passageId: localPassage.id,
				mode: 'timed',
				duration: 15,
				wpm: 100,
				accuracy: 99,
				timeElapsed: 15,
				correctChars: 120,
				incorrectChars: 1,
				extraChars: 0,
				missedChars: 0,
				timelineSnapshots: [],
				createdAt: '2026-01-02T10:00:00.000Z'
			});

			let sentPayload: any = null;
			let sentHeaders: any = null;

			global.fetch = vi.fn().mockImplementation(async (url: string, init: any) => {
				if (url === 'https://sync-server.local/api/sync') {
					sentPayload = JSON.parse(init.body);
					sentHeaders = init.headers;

					return new Response(
						JSON.stringify({
							success: true,
							syncedAt: '2026-01-02T12:00:00.000Z',
							settings: {
								mode: 'timed',
								duration: 60,
								passageLength: 'short',
								zenMode: true,
								theme: 'dark',
								scrollMode: 'step',
								updatedAt: '2026-01-02T11:00:00.000Z' // Newer than local 10:00:00 -> server wins
							},
							customPassages: [
								{
									id: 'server-p-2',
									text: 'Server passage',
									source: 'Web',
									createdAt: '2026-01-02T11:00:00.000Z',
									updatedAt: '2026-01-02T11:00:00.000Z',
									deletedAt: null
								}
							],
							testRuns: [
								{
									id: 'server-run-2',
									passageId: 'server-p-2',
									mode: 'timed',
									duration: 60,
									wpm: 125,
									accuracy: 100,
									timeElapsed: 60,
									correctChars: 600,
									incorrectChars: 0,
									extraChars: 0,
									missedChars: 0,
									timelineSnapshots: [],
									createdAt: '2026-01-02T11:00:00.000Z',
									passage: { id: 'server-p-2', text: 'Server passage', source: 'Web' }
								}
							]
						}),
						{ status: 200, headers: { 'Content-Type': 'application/json' } }
					);
				}
				return new Response('Not found', { status: 404 });
			});

			const result = await controller.sync();
			expect(result.success).toBe(true);
			expect(result.syncedAt).toBe('2026-01-02T12:00:00.000Z');

			// Verify request payload and authorization header
			expect(sentHeaders.Authorization).toBe('Bearer bearer-token-999');
			expect(sentPayload.lastSyncedAt).toBe('2026-01-01T00:00:00.000Z');
			expect(sentPayload.testRuns.some((r: any) => r.id === 'local-run-1')).toBe(true);
			expect(sentPayload.customPassages.some((p: any) => p.id === 'local-p-1')).toBe(true);

			// Verify merged local store state
			// 1. Settings: server won (11:00 > 10:00)
			const localSettings = await memoryAdapter.getSettings();
			expect(localSettings.duration).toBe(60);
			expect(localSettings.theme).toBe('dark');

			// 2. Custom Passages: server passage was inserted locally
			const allPassages = await memoryAdapter.getCustomPassages();
			expect(allPassages.some((p) => p.id === 'server-p-2' && p.text === 'Server passage')).toBe(true);
			expect(allPassages.some((p) => p.id === 'local-p-1')).toBe(true);

			// 3. Test Runs: server run was inserted locally
			const allRuns = await memoryAdapter.getTestRuns();
			expect(allRuns.some((r) => r.id === 'server-run-2')).toBe(true);
			expect(allRuns.some((r) => r.id === 'local-run-1')).toBe(true);

			// 4. Stored account has updated lastSyncedAt
			const updatedAccount = await memoryAdapter.getSyncAccount();
			expect(updatedAccount?.lastSyncedAt).toBe('2026-01-02T12:00:00.000Z');
		});

		it('propagates soft-delete tombstones to local passages', async () => {
			// Local store has an existing passage
			await memoryAdapter.saveCustomPassage({
				id: 'tombstone-target',
				text: 'Text that will be deleted by server tombstone',
				updatedAt: '2026-01-01T00:00:00.000Z'
			});

			global.fetch = vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						success: true,
						syncedAt: '2026-01-03T00:00:00.000Z',
						customPassages: [
							{
								id: 'tombstone-target',
								text: 'Text that will be deleted by server tombstone',
								updatedAt: '2026-01-02T00:00:00.000Z',
								deletedAt: '2026-01-02T00:00:00.000Z'
							}
						],
						testRuns: []
					}),
					{ status: 200, headers: { 'Content-Type': 'application/json' } }
				)
			);

			const result = await controller.sync();
			expect(result.success).toBe(true);

			// Active passages should no longer include tombstoned passage
			const activePassages = await memoryAdapter.getCustomPassages(false);
			expect(activePassages.some((p) => p.id === 'tombstone-target')).toBe(false);

			// Deleted passages should retain it with deletedAt timestamp
			const allPassages = await memoryAdapter.getCustomPassages(true);
			const tombstone = allPassages.find((p) => p.id === 'tombstone-target');
			expect(tombstone?.deletedAt).toBe('2026-01-02T00:00:00.000Z');
		});

		it('fails gracefully on network error without throwing exception', async () => {
			global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch (Network disconnected)'));

			const result = await controller.sync();
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();

			const state = controller.getState();
			expect(state.status).toBe('offline');
			expect(state.lastError).toContain('Failed to fetch');
		});

		it('handles 401 unauthorized gracefully by flagging error', async () => {
			global.fetch = vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ error: 'Unauthorized' }), {
					status: 401,
					headers: { 'Content-Type': 'application/json' }
				})
			);

			const result = await controller.sync();
			expect(result.success).toBe(false);
			expect(result.error).toBe('Unauthorized');
			expect(controller.getState().status).toBe('error');
		});
	});

	describe('automatic reconnection and background retry', () => {
		it('retries sync automatically on window online event', async () => {
			const account: SyncAccount = {
				serverUrl: 'https://stype.io',
				token: 'token-abc',
				user: { id: 'u-1', username: 'user1' }
			};
			await memoryAdapter.saveSyncAccount(account);
			await controller.init();

			let syncCalls = 0;
			global.fetch = vi.fn().mockImplementation(async (url: string) => {
				if (url.endsWith('/api/sync')) {
					syncCalls++;
					return new Response(
						JSON.stringify({
							success: true,
							syncedAt: '2026-01-01T00:00:00.000Z',
							testRuns: [],
							customPassages: []
						}),
						{ status: 200, headers: { 'Content-Type': 'application/json' } }
					);
				}
				return new Response('Not found', { status: 404 });
			});

			controller.initBackgroundSync();

			// Simulate window online event
			window.dispatchEvent(new Event('online'));

			// Wait a tick for async handler
			await new Promise((r) => setTimeout(r, 20));

			expect(syncCalls).toBe(1);
		});
	});

	describe('pluggable SyncBackend interface', () => {
		it('defaults to NodeSyncBackend when no backend option is provided', () => {
			const c = new SyncController({ adapter: memoryAdapter });
			expect(c.getBackend()).toBeInstanceOf(NodeSyncBackend);
			expect(c.getBackend().name).toBe('node');
			c.destroy();
		});

		it('accepts and uses a custom SyncBackend implementation', async () => {
			const mockAccount: SyncAccount = {
				serverUrl: 'https://custom-backend.test',
				token: 'custom-tok-123',
				user: { id: 'u-custom', username: 'custom_user' },
				lastSyncedAt: null
			};

			const mockBackend: SyncBackend = {
				name: 'custom-mock',
				login: vi.fn().mockResolvedValue(mockAccount),
				logout: vi.fn().mockResolvedValue(undefined),
				sync: vi.fn().mockResolvedValue({
					success: true,
					syncedAt: '2026-03-01T00:00:00.000Z',
					settings: null,
					customPassages: [],
					testRuns: []
				})
			};

			const customController = new SyncController({
				adapter: memoryAdapter,
				backend: mockBackend
			});

			expect(customController.getBackend()).toBe(mockBackend);
			expect(customController.getBackend().name).toBe('custom-mock');

			// Test linkAccount delegates to mockBackend.login
			const linked = await customController.linkAccount('https://custom-backend.test', 'custom_user', 'pw123');
			expect(linked).toEqual(mockAccount);
			expect(mockBackend.login).toHaveBeenCalledWith({
				serverUrl: 'https://custom-backend.test',
				identifier: 'custom_user',
				password: 'pw123'
			});

			// Allow initial background sync to complete
			await new Promise((r) => setTimeout(r, 10));

			// Test sync delegates to mockBackend.sync with local payload
			const syncResult = await customController.sync();
			expect(syncResult.success).toBe(true);
			expect(mockBackend.sync).toHaveBeenCalledWith(
				expect.objectContaining({ serverUrl: 'https://custom-backend.test' }),
				expect.objectContaining({
					lastSyncedAt: null,
					settings: expect.any(Object),
					customPassages: expect.any(Array),
					testRuns: expect.any(Array)
				})
			);

			// Test unlinkAccount delegates to mockBackend.logout
			await customController.unlinkAccount();
			expect(mockBackend.logout).toHaveBeenCalledWith(
				expect.objectContaining({
					serverUrl: 'https://custom-backend.test',
					token: 'custom-tok-123'
				})
			);
			expect(customController.getState().account).toBeNull();

			customController.destroy();
		});

		it('allows dynamically changing the backend via setBackend', async () => {
			const c = new SyncController({ adapter: memoryAdapter });
			expect(c.getBackend().name).toBe('node');

			const newBackend: SyncBackend = {
				name: 'new-backend',
				login: vi.fn(),
				logout: vi.fn(),
				sync: vi.fn()
			};

			c.setBackend(newBackend);
			expect(c.getBackend().name).toBe('new-backend');
			c.destroy();
		});

		it('delegates registerAccount to backend when register is supported', async () => {
			const registeredAccount: SyncAccount = {
				serverUrl: 'https://custom-backend.test',
				token: 'reg-tok-456',
				user: { id: 'u-reg', username: 'newuser', email: 'new@example.com' },
				lastSyncedAt: null
			};

			const mockBackendWithRegister: SyncBackend = {
				name: 'registerable-mock',
				login: vi.fn(),
				logout: vi.fn(),
				register: vi.fn().mockResolvedValue(registeredAccount),
				sync: vi.fn().mockResolvedValue({ success: true, syncedAt: '2026-03-01T00:00:00.000Z' })
			};

			const c = new SyncController({
				adapter: memoryAdapter,
				backend: mockBackendWithRegister
			});

			const account = await c.registerAccount('https://custom-backend.test', {
				username: 'newuser',
				password: 'password123',
				email: 'new@example.com'
			});

			expect(account).toEqual(registeredAccount);
			expect(mockBackendWithRegister.register).toHaveBeenCalledWith({
				serverUrl: 'https://custom-backend.test',
				username: 'newuser',
				password: 'password123',
				email: 'new@example.com'
			});
			expect(c.getState().account).toEqual(registeredAccount);
			c.destroy();
		});

		it('throws when registerAccount is called on a backend without registration support', async () => {
			const c = new SyncController({ adapter: memoryAdapter }); // defaults to NodeSyncBackend
			await expect(
				c.registerAccount('https://stype.io', {
					username: 'someone',
					password: 'pass'
				})
			).rejects.toThrow(/does not support account registration/);
			c.destroy();
		});

		it('periodically polls sync when pollIntervalMs is set', async () => {
			vi.useFakeTimers();
			const mockBackend: SyncBackend = {
				name: 'poll-mock',
				login: vi.fn(),
				logout: vi.fn(),
				sync: vi.fn().mockResolvedValue({
					success: true,
					syncedAt: '2026-03-01T00:00:00.000Z'
				})
			};

			const c = new SyncController({
				adapter: memoryAdapter,
				backend: mockBackend,
				pollIntervalMs: 5000
			});

			await memoryAdapter.saveSyncAccount({
				serverUrl: 'https://test.local',
				token: 'tok',
				user: { id: 'u-1', username: 'poller' }
			});
			await c.init();

			expect(mockBackend.sync).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(5000);

			expect(mockBackend.sync).toHaveBeenCalledTimes(1);

			c.destroy();
			vi.useRealTimers();
		});
	});
});
