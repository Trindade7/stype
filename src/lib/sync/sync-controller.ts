import { writable, type Readable } from 'svelte/store';
import { getDefaultAdapter, type LocalStoreAdapter } from '$lib/storage';
import { NodeSyncBackend } from './node-backend';
import { PocketBaseSyncBackend, isPocketBaseHost } from './pocketbase-backend';
import type {
	SyncAccount,
	SyncState,
	SyncResult,
	SyncBackend,
	RegisterCredentials
} from './types';

export interface SyncControllerOptions {
	adapter?: LocalStoreAdapter;
	backend?: SyncBackend;
	pollIntervalMs?: number;
}

export class SyncController implements Readable<SyncState> {
	private adapter: LocalStoreAdapter;
	private backend: SyncBackend;
	private hasCustomBackend: boolean;
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
		this.hasCustomBackend = !!options.backend;
		this.backend = options.backend ?? new NodeSyncBackend();
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

	getBackend(): SyncBackend {
		return this.backend;
	}

	setBackend(backend: SyncBackend): void {
		this.backend = backend;
		this.hasCustomBackend = true;
	}

	getAdapter(): LocalStoreAdapter {
		return this.adapter;
	}

	setAdapter(adapter: LocalStoreAdapter): void {
		this.adapter = adapter;
	}

	private async resolveBackend(serverUrl: string): Promise<SyncBackend> {
		if (this.hasCustomBackend) {
			return this.backend;
		}
		const isPB = await isPocketBaseHost(serverUrl);
		if (isPB) {
			return new PocketBaseSyncBackend();
		}
		return this.backend;
	}

	async init(): Promise<void> {
		const account = await this.adapter.getSyncAccount();
		if (!this.hasCustomBackend && account?.backend) {
			if (account.backend === 'pocketbase' && this.backend.name !== 'pocketbase') {
				this.backend = new PocketBaseSyncBackend();
			} else if (account.backend === 'node' && this.backend.name !== 'node') {
				this.backend = new NodeSyncBackend();
			}
		}
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

		const backend = await this.resolveBackend(serverUrl);
		const account = await backend.login({ serverUrl, identifier, password });
		if (!account.backend) {
			account.backend = backend.name;
		}
		this.backend = backend;

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

	async registerAccount(
		rawServerUrl: string,
		credentials: Omit<RegisterCredentials, 'serverUrl'>
	): Promise<SyncAccount> {
		const serverUrl = rawServerUrl.trim().replace(/\/+$/, '');
		if (!serverUrl) {
			throw new Error('Server URL is required');
		}

		let backend = await this.resolveBackend(serverUrl);
		if (!backend.register && !this.hasCustomBackend) {
			const pb = new PocketBaseSyncBackend();
			if (await pb.supports(serverUrl)) {
				backend = pb;
			}
		}

		if (!backend.register) {
			throw new Error(`Backend '${backend.name}' does not support account registration`);
		}

		const account = await backend.register({
			...credentials,
			serverUrl
		});
		if (!account.backend) {
			account.backend = backend.name;
		}
		this.backend = backend;

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
				await this.backend.logout(account);
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

			const data = await this.backend.sync(account, payload);
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
