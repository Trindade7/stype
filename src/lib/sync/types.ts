import type { SyncAccount, GuestSettings, GuestPassage, GuestTestRun } from '$lib/storage/types';

export type { SyncAccount };

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

export interface SyncState {
	status: SyncStatus;
	account: SyncAccount | null;
	lastSyncedAt: string | null;
	lastError: string | null;
}

export interface SyncResult {
	success: boolean;
	error?: string;
	syncedAt?: string;
	runsSynced?: number;
	passagesSynced?: number;
}

export interface SyncPayload {
	lastSyncedAt?: string | null;
	settings?: GuestSettings;
	customPassages?: GuestPassage[];
	testRuns?: GuestTestRun[];
}

export interface SyncResponse {
	success: boolean;
	syncedAt?: string;
	settings?: GuestSettings | null;
	customPassages?: GuestPassage[];
	testRuns?: GuestTestRun[];
	error?: string;
}

export interface LoginCredentials {
	serverUrl: string;
	identifier: string;
	password: string;
}

export interface RegisterCredentials {
	serverUrl: string;
	username: string;
	password: string;
	email?: string;
	name?: string;
}

export interface SyncBackend {
	readonly name: string;
	login(credentials: LoginCredentials): Promise<SyncAccount>;
	logout(account: SyncAccount): Promise<void>;
	register?(credentials: RegisterCredentials): Promise<SyncAccount>;
	sync(account: SyncAccount, payload: SyncPayload): Promise<SyncResponse>;
	fetchRemoteChanges?(account: SyncAccount, since?: string | null): Promise<SyncResponse>;
	uploadLocalChanges?(account: SyncAccount, payload: SyncPayload): Promise<void>;
	subscribe?(
		account: SyncAccount,
		onUpdate: (data: Partial<SyncResponse>) => void
	): () => void;
	supports?(serverUrl: string): Promise<boolean> | boolean;
}

