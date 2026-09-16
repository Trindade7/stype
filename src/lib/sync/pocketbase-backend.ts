import PocketBase, { ClientResponseError } from 'pocketbase';
import type {
	SyncBackend,
	LoginCredentials,
	RegisterCredentials,
	SyncPayload,
	SyncResponse
} from './types';
import type { SyncAccount, GuestSettings, GuestPassage, GuestTestRun } from '$lib/storage/types';

export function formatPocketBaseErrorMessage(err: unknown, fallback: string): string {
	if (err instanceof ClientResponseError || (err && typeof err === 'object' && 'response' in err)) {
		const errorObj = err as any;
		if (errorObj.status === 0) {
			return 'Network error connecting to PocketBase';
		}
		const data = errorObj.data || errorObj.response?.data;
		if (data?.data && typeof data.data === 'object') {
			const fieldErrors = Object.entries(data.data).map(([field, detail]: [string, any]) => {
				const msg = detail?.message || detail;
				return `${field}: ${msg}`;
			});
			if (fieldErrors.length > 0) {
				return fieldErrors.join(', ');
			}
		}
		if (data?.message) return data.message;
		if (errorObj.message) return errorObj.message;
	}
	if (err instanceof Error) return err.message;
	return fallback;
}

export async function isPocketBaseHost(url?: string): Promise<boolean> {
	if (typeof window === 'undefined' && !url) return false;
	const targetUrl = (url || (typeof window !== 'undefined' ? window.location?.origin : '') || '')
		.trim()
		.replace(/\/+$/, '');
	if (!targetUrl || targetUrl === 'null' || targetUrl.startsWith('tauri:') || targetUrl.startsWith('file:')) {
		return false;
	}
	try {
		const res = await fetch(`${targetUrl}/api/health`, { method: 'GET' });
		if (res.ok) {
			const data = await res.json().catch(() => ({}));
			return data?.code === 200 || data?.message === 'API is healthy.' || !!data?.data;
		}
	} catch {
		// Network or parse error
	}
	return false;
}

export async function detectDefaultServerUrl(): Promise<string> {
	if (typeof window === 'undefined') return '';
	const origin = window.location?.origin;
	if (!origin || origin === 'null' || origin.startsWith('tauri:') || origin.startsWith('file:')) {
		return '';
	}
	const isPB = await isPocketBaseHost(origin);
	return isPB ? origin : '';
}

export class PocketBaseSyncBackend implements SyncBackend {
	readonly name = 'pocketbase';
	private client: PocketBase | null = null;
	private currentServerUrl: string | null = null;

	getClient(serverUrl: string): PocketBase {
		const normalized = serverUrl.trim().replace(/\/+$/, '');
		if (!this.client || this.currentServerUrl !== normalized) {
			this.client = new PocketBase(normalized);
			this.currentServerUrl = normalized;
		}
		return this.client;
	}

	async login(credentials: LoginCredentials): Promise<SyncAccount> {
		const serverUrl = credentials.serverUrl.trim().replace(/\/+$/, '');
		if (!serverUrl) {
			throw new Error('Server URL is required');
		}

		const pb = this.getClient(serverUrl);

		try {
			const authData = await pb
				.collection('users')
				.authWithPassword(credentials.identifier, credentials.password);

			return {
				serverUrl,
				token: authData.token,
				user: {
					id: authData.record.id,
					username: (authData.record as any).username || '',
					email: (authData.record as any).email || null,
					name: (authData.record as any).name || null,
					role: (authData.record as any).role || 'user'
				},
				lastSyncedAt: null,
				backend: 'pocketbase'
			};
		} catch (err) {
			throw new Error(formatPocketBaseErrorMessage(err, 'Failed to authenticate.'));
		}
	}

	async register(credentials: RegisterCredentials): Promise<SyncAccount> {
		const serverUrl = credentials.serverUrl.trim().replace(/\/+$/, '');
		if (!serverUrl) {
			throw new Error('Server URL is required');
		}

		const pb = this.getClient(serverUrl);

		const createData: Record<string, any> = {
			username: credentials.username,
			password: credentials.password,
			passwordConfirm: credentials.password
		};

		if (credentials.email) {
			createData.email = credentials.email;
		}
		if (credentials.name) {
			createData.name = credentials.name;
		}

		try {
			await pb.collection('users').create(createData);
		} catch (err) {
			throw new Error(formatPocketBaseErrorMessage(err, 'Failed to register account.'));
		}

		return await this.login({
			serverUrl,
			identifier: credentials.username,
			password: credentials.password
		});
	}

	async logout(account: SyncAccount): Promise<void> {
		const pb = this.getClient(account.serverUrl);
		pb.authStore.clear();
	}

	async supports(serverUrl: string): Promise<boolean> {
		return await isPocketBaseHost(serverUrl);
	}

	async sync(account: SyncAccount, payload: SyncPayload): Promise<SyncResponse> {
		const serverUrl = account.serverUrl.trim().replace(/\/+$/, '');
		const pb = this.getClient(serverUrl);

		if (account.token && pb.authStore.token !== account.token) {
			pb.authStore.save(account.token, account.user as any);
		}

		const userId = account.user?.id || pb.authStore.record?.id;
		if (!userId) {
			throw new Error('Authenticated user ID is required for sync');
		}

		const userFilter = `user = "${userId}"`;

		try {
			// 1. Synchronize Settings (Last-Write-Wins based on updatedAt)
			let resultSettings: GuestSettings | null = null;
			let remoteSettingsRecord: any = null;

			try {
				const settingsList = await pb.collection('settings').getFullList({ filter: userFilter });
				if (settingsList.length > 0) {
					remoteSettingsRecord = settingsList[0];
				}
			} catch (err) {
				if (err instanceof ClientResponseError && err.status === 404) {
					remoteSettingsRecord = null;
				} else {
					throw err;
				}
			}

			if (remoteSettingsRecord) {
				const remoteSettings: GuestSettings = {
					mode: remoteSettingsRecord.mode || 'passage',
					duration: remoteSettingsRecord.duration ?? 60,
					passageLength: remoteSettingsRecord.passage_length || 'all',
					zenMode: !!remoteSettingsRecord.zen_mode,
					theme: remoteSettingsRecord.theme || 'system',
					scrollMode: remoteSettingsRecord.scroll_mode || 'manual',
					updatedAt: remoteSettingsRecord.updated || remoteSettingsRecord.created,
					deletedAt: remoteSettingsRecord.deleted_at || null
				};

				if (payload.settings) {
					const localTime = new Date(payload.settings.updatedAt || 0).getTime();
					const remoteTime = new Date(remoteSettings.updatedAt || 0).getTime();

					if (localTime > remoteTime) {
						// Local settings win
						const updated = await pb.collection('settings').update(remoteSettingsRecord.id, {
							mode: payload.settings.mode,
							duration: payload.settings.duration,
							passage_length: payload.settings.passageLength,
							zen_mode: payload.settings.zenMode,
							theme: payload.settings.theme,
							scroll_mode: payload.settings.scrollMode,
							deleted_at: payload.settings.deletedAt || null
						});
						resultSettings = {
							mode: updated.mode || payload.settings.mode,
							duration: updated.duration ?? payload.settings.duration,
							passageLength: updated.passage_length || payload.settings.passageLength,
							zenMode: updated.zen_mode !== undefined ? !!updated.zen_mode : payload.settings.zenMode,
							theme: updated.theme || payload.settings.theme,
							scrollMode: updated.scroll_mode || payload.settings.scrollMode,
							updatedAt: updated.updated || new Date().toISOString(),
							deletedAt: updated.deleted_at || null
						};
					} else {
						// Remote settings win
						resultSettings = remoteSettings;
					}
				} else {
					resultSettings = remoteSettings;
				}
			} else if (payload.settings) {
				const created = await pb.collection('settings').create({
					user: userId,
					mode: payload.settings.mode,
					duration: payload.settings.duration,
					passage_length: payload.settings.passageLength,
					zen_mode: payload.settings.zenMode,
					theme: payload.settings.theme,
					scroll_mode: payload.settings.scrollMode,
					deleted_at: payload.settings.deletedAt || null
				});
				resultSettings = {
					mode: created.mode || payload.settings.mode,
					duration: created.duration ?? payload.settings.duration,
					passageLength: created.passage_length || payload.settings.passageLength,
					zenMode: created.zen_mode !== undefined ? !!created.zen_mode : payload.settings.zenMode,
					theme: created.theme || payload.settings.theme,
					scrollMode: created.scroll_mode || payload.settings.scrollMode,
					updatedAt: created.updated || new Date().toISOString(),
					deletedAt: created.deleted_at || null
				};
			}

			// 2. Synchronize Custom Passages (Last-Write-Wins and Tombstones)
			const remotePassagesList = await pb.collection('custom_passages').getFullList({ filter: userFilter });

			const remoteById = new Map<string, any>();
			const remoteByClientId = new Map<string, any>();
			const remoteByText = new Map<string, any>();

			for (const rp of remotePassagesList) {
				remoteById.set(rp.id, rp);
				if (rp.client_id) {
					remoteByClientId.set(rp.client_id, rp);
				}
				if (!remoteByText.has(rp.text)) {
					remoteByText.set(rp.text, rp);
				}
			}

			if (Array.isArray(payload.customPassages)) {
				for (const localP of payload.customPassages) {
					if (!localP || typeof localP.text !== 'string') continue;
					const localId = String(localP.id);
					const existing =
						remoteByClientId.get(localId) ||
						remoteById.get(localId) ||
						remoteByText.get(localP.text);

					const localUpdated = new Date(localP.updatedAt || localP.createdAt || 0).getTime();

					if (existing) {
						const remoteUpdated = new Date(existing.updated || existing.created || 0).getTime();
						if (localUpdated > remoteUpdated) {
							const updateData: Record<string, any> = {
								text: localP.text,
								source: localP.source || null,
								deleted_at: localP.deletedAt || null
							};
							if (!existing.client_id) {
								updateData.client_id = localId;
							}
							const updated = await pb.collection('custom_passages').update(existing.id, updateData);
							Object.assign(existing, updated);
						}
					} else {
						const createData: Record<string, any> = {
							user: userId,
							client_id: localId,
							text: localP.text,
							source: localP.source || null,
							deleted_at: localP.deletedAt || null
						};
						const created = await pb.collection('custom_passages').create(createData);
						remotePassagesList.push(created);
						remoteById.set(created.id, created);
						if (created.client_id) {
							remoteByClientId.set(created.client_id, created);
						}
						remoteByText.set(created.text, created);
					}
				}
			}

			const resultCustomPassages: GuestPassage[] = remotePassagesList.map((rp) => ({
				id: rp.client_id || rp.id,
				text: rp.text,
				source: rp.source || null,
				createdAt: rp.created,
				updatedAt: rp.updated,
				deletedAt: rp.deleted_at || null,
				isCustom: true
			}));

			// 3. Synchronize Test Runs (Append-Only Set Union by client_id)
			const remoteRunsList = await pb.collection('test_runs').getFullList({ filter: userFilter });

			const remoteClientIdSet = new Set<string>();
			for (const r of remoteRunsList) {
				if (r.client_id) {
					remoteClientIdSet.add(String(r.client_id));
				}
			}

			if (Array.isArray(payload.testRuns)) {
				for (const localRun of payload.testRuns) {
					if (!localRun || !localRun.createdAt || typeof localRun.wpm !== 'number') continue;
					const runId = String(localRun.id);
					if (remoteClientIdSet.has(runId)) continue;

					try {
						const created = await pb.collection('test_runs').create({
							user: userId,
							client_id: runId,
							passage_id: String(localRun.passageId),
							mode: localRun.mode || 'passage',
							duration: localRun.duration ?? null,
							wpm: localRun.wpm,
							accuracy: localRun.accuracy ?? 0,
							time_elapsed: localRun.timeElapsed ?? 0,
							correct_chars: localRun.correctChars ?? 0,
							incorrect_chars: localRun.incorrectChars ?? 0,
							extra_chars: localRun.extraChars ?? 0,
							missed_chars: localRun.missedChars ?? 0,
							timeline_snapshots: localRun.timelineSnapshots || [],
							created_at: localRun.createdAt,
							passage: localRun.passage || null
						});
						remoteRunsList.push(created);
						remoteClientIdSet.add(runId);
					} catch (err) {
						if (
							err instanceof ClientResponseError &&
							err.status === 400 &&
							(JSON.stringify(err.data).includes('client_id') ||
								JSON.stringify(err.data).includes('unique') ||
								JSON.stringify(err.data).includes('validation_not_unique'))
						) {
							remoteClientIdSet.add(runId);
						} else {
							throw err;
						}
					}
				}
			}

			const resultTestRuns: GuestTestRun[] = remoteRunsList.map((r) => ({
				id: r.client_id || r.id,
				passageId: r.passage_id,
				mode: r.mode || 'passage',
				duration: r.duration ?? null,
				wpm: r.wpm,
				accuracy: r.accuracy,
				timeElapsed: r.time_elapsed,
				correctChars: r.correct_chars,
				incorrectChars: r.incorrect_chars,
				extraChars: r.extra_chars,
				missedChars: r.missed_chars,
				timelineSnapshots: r.timeline_snapshots || [],
				createdAt: r.created_at || r.created,
				passage: r.passage || null
			}));

			return {
				success: true,
				syncedAt: new Date().toISOString(),
				settings: resultSettings,
				customPassages: resultCustomPassages,
				testRuns: resultTestRuns
			};
		} catch (err) {
			throw new Error(formatPocketBaseErrorMessage(err, 'Failed to synchronize with PocketBase.'));
		}
	}

	async fetchRemoteChanges(account: SyncAccount, since?: string | null): Promise<SyncResponse> {
		return this.sync(account, { lastSyncedAt: since });
	}

	async uploadLocalChanges(account: SyncAccount, payload: SyncPayload): Promise<void> {
		await this.sync(account, payload);
	}
}
