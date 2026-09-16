import PocketBase, { ClientResponseError } from 'pocketbase';
import type {
	SyncBackend,
	LoginCredentials,
	RegisterCredentials,
	SyncPayload,
	SyncResponse
} from './types';
import type { SyncAccount } from '$lib/storage/types';

export function formatPocketBaseErrorMessage(err: unknown, fallback: string): string {
	if (err instanceof ClientResponseError || (err && typeof err === 'object' && 'response' in err)) {
		const errorObj = err as any;
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
		return {
			success: true,
			syncedAt: new Date().toISOString()
		};
	}
}
