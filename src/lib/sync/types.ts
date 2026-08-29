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
