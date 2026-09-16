import type {
	SyncBackend,
	LoginCredentials,
	RegisterCredentials,
	SyncPayload,
	SyncResponse
} from './types';
import type { SyncAccount } from '$lib/storage/types';

export class NodeSyncBackend implements SyncBackend {
	readonly name = 'node';

	async login(credentials: LoginCredentials): Promise<SyncAccount> {
		const serverUrl = credentials.serverUrl.trim().replace(/\/+$/, '');
		if (!serverUrl) {
			throw new Error('Server URL is required');
		}

		let response: Response;
		try {
			response = await fetch(`${serverUrl}/api/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					identifier: credentials.identifier,
					password: credentials.password,
					username: credentials.identifier
				})
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

		return {
			serverUrl,
			token: data.token,
			user: data.user,
			lastSyncedAt: null
		};
	}

	async logout(account: SyncAccount): Promise<void> {
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

	async sync(account: SyncAccount, payload: SyncPayload): Promise<SyncResponse> {
		let response: Response;
		try {
			response = await fetch(`${account.serverUrl}/api/sync`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${account.token}`
				},
				body: JSON.stringify(payload)
			});
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : 'Network error connecting to server';
			throw new Error(errorMsg);
		}

		if (!response.ok) {
			const errData = await response.json().catch(() => ({}));
			const errorMsg = errData.error || errData.message || `Sync failed with status ${response.status}`;
			throw new Error(errorMsg);
		}

		return await response.json();
	}

	async fetchRemoteChanges(account: SyncAccount, since?: string | null): Promise<SyncResponse> {
		return this.sync(account, { lastSyncedAt: since });
	}

	async uploadLocalChanges(account: SyncAccount, payload: SyncPayload): Promise<void> {
		await this.sync(account, payload);
	}
}
