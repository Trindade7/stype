import { writable, type Readable } from 'svelte/store';
import { getDefaultAdapter, type LocalStoreAdapter } from '$lib/storage';
import type { SyncAccount, SyncState, SyncResult, SyncResponse } from './types';

export interface SyncControllerOptions {
	adapter?: LocalStoreAdapter;
	pollIntervalMs?: number;
}

export class SyncController implements Readable<SyncState> {
	private adapter: LocalStoreAdapter;
	private stateStore = writable<SyncState>({
		status: 'idle',
		account: null,
		lastSyncedAt: null,
		lastError: null
	});

	private isSyncing = false;
	private pollTimer: ReturnType<typeof setInterval> | null = null;
	private onlineListener: (() => void) | null = null;

	constructor(options: SyncControllerOptions = {}) {
		this.adapter = options.adapter ?? getDefaultAdapter();
		if (options.pollIntervalMs && options.pollIntervalMs > 0) {
			this.pollTimer = setInterval(() => {
				this.sync().catch(() => {});
			}, options.pollIntervalMs);
		}
	}

	subscribe = this.stateStore.subscribe;

	getState(): SyncState {
		let current: SyncState = {
			status: 'idle',
			account: null,
			lastSyncedAt: null,
			lastError: null
		};
		const unsubscribe = this.stateStore.subscribe((val) => {
			current = val;
		});
		unsubscribe();
		return current;
	}

	async init(): Promise<void> {
		const account = await this.adapter.getSyncAccount();
		this.stateStore.update((s) => ({
			...s,
			account,
			lastSyncedAt: account?.lastSyncedAt ?? null
		}));
	}

	async linkAccount(rawServerUrl: string, identifier: string, password: string): Promise<SyncAccount> {
		const serverUrl = rawServerUrl.trim().replace(/\/+$/, '');
		if (!serverUrl) {
			throw new Error('Server URL is required');
		}

		let response: Response;
		try {
			response = await fetch(`${serverUrl}/api/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ identifier, password, username: identifier })
			});
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : 'Network error connecting to server';
			throw new Error(errorMsg);
		}

		const data = await response.json().catch(() => ({}));
		if (!response.ok) {
			const msg = data.error || data.message || `Authentication failed (${response.status})`;
			throw new Error(msg);
		}

		const account: SyncAccount = {
			serverUrl,
			token: data.token,
			user: data.user,
			lastSyncedAt: null
		};

		await this.adapter.saveSyncAccount(account);

		this.stateStore.update((s) => ({
			...s,
			account,
			status: 'idle',
			lastError: null,
			lastSyncedAt: null
		}));

		// Trigger initial background sync
		this.sync().catch(() => {});

		return account;
	}

	async unlinkAccount(): Promise<void> {
		const account = await this.adapter.getSyncAccount();
		if (account) {
			try {
				await fetch(`${account.serverUrl}/api/auth/logout`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${account.token}`
					}
				});
			} catch {
				// Ignore network errors when logging out
			}
		}

		await this.adapter.clearSyncAccount();

		this.stateStore.update((s) => ({
			...s,
			account: null,
			status: 'idle',
			lastSyncedAt: null,
			lastError: null
		}));
	}

	async sync(): Promise<SyncResult> {
		const account = await this.adapter.getSyncAccount();
		if (!account) {
			return { success: false, error: 'Not linked to a server' };
		}

		if (this.isSyncing) {
			return { success: false, error: 'Sync already in progress' };
		}

		this.isSyncing = true;
		this.stateStore.update((s) => ({ ...s, status: 'syncing', lastError: null }));

		try {
			const [settings, customPassages, testRuns] = await Promise.all([
				this.adapter.getSettings(),
				this.adapter.getCustomPassages(true),
				this.adapter.getTestRuns()
			]);

			const payload = {
				lastSyncedAt: account.lastSyncedAt || null,
				settings,
				customPassages,
				testRuns
			};

			const response = await fetch(`${account.serverUrl}/api/sync`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${account.token}`
				},
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				const errData = await response.json().catch(() => ({}));
				const errorMsg = errData.error || errData.message || `Sync failed with status ${response.status}`;
				this.stateStore.update((s) => ({
					...s,
					status: 'error',
					lastError: errorMsg
				}));
				return { success: false, error: errorMsg };
			}

			const data: SyncResponse = await response.json();
			const syncedAt = data.syncedAt || new Date().toISOString();

			// 1. Merge server settings (Last-Write-Wins)
			if (data.settings) {
				const serverUpdated = new Date(data.settings.updatedAt || 0).getTime();
				const localUpdated = new Date(settings.updatedAt || 0).getTime();
				if (serverUpdated > localUpdated) {
					await this.adapter.saveSettings(data.settings);
				}
			}

			// 2. Merge server custom passages (Last-Write-Wins and Tombstones)
			let passagesSynced = 0;
			if (Array.isArray(data.customPassages)) {
				for (const serverP of data.customPassages) {
					const localP = await this.adapter.getPassageById(serverP.id, true);
					if (!localP) {
						await this.adapter.saveCustomPassage(serverP);
						passagesSynced++;
					} else {
						const serverUpdated = new Date(serverP.updatedAt || 0).getTime();
						const localUpdated = new Date(localP.updatedAt || 0).getTime();
						if (serverUpdated > localUpdated) {
							await this.adapter.saveCustomPassage(serverP);
							passagesSynced++;
						}
					}
				}
			}

			// 3. Merge server test runs (Append-Only Set Union by UUID)
			let runsSynced = 0;
			if (Array.isArray(data.testRuns)) {
				const localRuns = await this.adapter.getTestRuns();
				const localIdSet = new Set(localRuns.map((r) => String(r.id)));
				const localKeySet = new Set(
					localRuns.map((r) => `${new Date(r.createdAt).getTime()}-${r.wpm}`)
				);

				for (const serverRun of data.testRuns) {
					const runId = String(serverRun.id);
					const runKey = `${new Date(serverRun.createdAt).getTime()}-${serverRun.wpm}`;
					if (!localIdSet.has(runId) && !localKeySet.has(runKey)) {
						await this.adapter.saveTestRun(serverRun);
						localIdSet.add(runId);
						localKeySet.add(runKey);
						runsSynced++;
					}
				}
			}

			// 4. Update stored account with syncedAt
			account.lastSyncedAt = syncedAt;
			await this.adapter.saveSyncAccount(account);

			this.stateStore.update((s) => ({
				...s,
				account,
				status: 'idle',
				lastSyncedAt: syncedAt,
				lastError: null
			}));

			return {
				success: true,
				syncedAt,
				passagesSynced,
				runsSynced
			};
		} catch (err) {
			const isOffline =
				(typeof navigator !== 'undefined' && navigator.onLine === false) ||
				err instanceof TypeError ||
				(err instanceof Error && /network|offline|failed to fetch|econnrefused/i.test(err.message));
			const errorMsg = err instanceof Error ? err.message : 'Sync network error';

			this.stateStore.update((s) => ({
				...s,
				status: isOffline ? 'offline' : 'error',
				lastError: errorMsg
			}));

			return {
				success: false,
				error: errorMsg
			};
		} finally {
			this.isSyncing = false;
		}
	}

	initBackgroundSync(): () => void {
		if (typeof window === 'undefined') {
			return () => {};
		}

		this.onlineListener = () => {
			this.sync().catch(() => {});
		};

		window.addEventListener('online', this.onlineListener);

		return () => {
			if (this.onlineListener) {
				window.removeEventListener('online', this.onlineListener);
				this.onlineListener = null;
			}
		};
	}

	destroy(): void {
		if (this.pollTimer) {
			clearInterval(this.pollTimer);
			this.pollTimer = null;
		}
		if (this.onlineListener && typeof window !== 'undefined') {
			window.removeEventListener('online', this.onlineListener);
			this.onlineListener = null;
		}
	}
}

export const syncController = new SyncController();
