import type { PassageLength } from './passage-utils';
import {
	getDefaultAdapter,
	ensureMigrated,
	DEFAULT_GUEST_SETTINGS,
	DEFAULT_PASSAGES,
	STORAGE_KEYS,
	type GuestSettings,
	type GuestPassage,
	type GuestTestRun,
	type GuestData,
	type LocalStoreAdapter,
	type SaveCustomPassageInput,
	type SaveTestRunInput,
	type SyncAccount
} from './storage';

export type {
	GuestSettings,
	GuestPassage,
	GuestTestRun,
	GuestData,
	LocalStoreAdapter,
	SaveCustomPassageInput,
	SaveTestRunInput,
	SyncAccount
};

export { DEFAULT_GUEST_SETTINGS, DEFAULT_PASSAGES, STORAGE_KEYS };

export async function getGuestSettings(): Promise<GuestSettings> {
	const adapter = getDefaultAdapter();
	await ensureMigrated(adapter);
	return adapter.getSettings();
}

export async function saveGuestSettings(updates: Partial<GuestSettings>): Promise<GuestSettings> {
	const adapter = getDefaultAdapter();
	await ensureMigrated(adapter);
	return adapter.saveSettings(updates);
}

export async function getCustomPassages(includeDeleted?: boolean): Promise<GuestPassage[]> {
	const adapter = getDefaultAdapter();
	await ensureMigrated(adapter);
	return adapter.getCustomPassages(includeDeleted);
}

export async function saveCustomPassage(input: SaveCustomPassageInput): Promise<GuestPassage> {
	const adapter = getDefaultAdapter();
	await ensureMigrated(adapter);
	return adapter.saveCustomPassage(input);
}

export async function updateCustomPassage(
	id: string | number,
	input: { text: string; source?: string | null }
): Promise<GuestPassage | null> {
	const adapter = getDefaultAdapter();
	await ensureMigrated(adapter);
	return adapter.updateCustomPassage(id, input);
}

export async function deleteCustomPassage(id: string | number): Promise<boolean> {
	const adapter = getDefaultAdapter();
	await ensureMigrated(adapter);
	return adapter.deleteCustomPassage(id);
}

export async function getAllPassages(includeDeleted?: boolean): Promise<GuestPassage[]> {
	const adapter = getDefaultAdapter();
	await ensureMigrated(adapter);
	return adapter.getAllPassages(includeDeleted);
}

export async function getPassageById(id: string | number, includeDeleted?: boolean): Promise<GuestPassage | null> {
	const adapter = getDefaultAdapter();
	await ensureMigrated(adapter);
	return adapter.getPassageById(id, includeDeleted);
}

export async function getRandomPassage(lengthFilter: PassageLength = 'all'): Promise<GuestPassage | null> {
	const adapter = getDefaultAdapter();
	await ensureMigrated(adapter);
	return adapter.getRandomPassage(lengthFilter);
}

export async function getGuestTestRuns(): Promise<GuestTestRun[]> {
	const adapter = getDefaultAdapter();
	await ensureMigrated(adapter);
	return adapter.getTestRuns();
}

export async function saveGuestTestRun(result: SaveTestRunInput): Promise<GuestTestRun> {
	const adapter = getDefaultAdapter();
	await ensureMigrated(adapter);
	return adapter.saveTestRun(result);
}

export async function clearGuestTestRuns(): Promise<void> {
	const adapter = getDefaultAdapter();
	await ensureMigrated(adapter);
	return adapter.clearTestRuns();
}

export async function getGuestData(includeDeleted?: boolean): Promise<GuestData> {
	const adapter = getDefaultAdapter();
	await ensureMigrated(adapter);
	return adapter.getGuestData(includeDeleted);
}

export async function clearGuestData(): Promise<void> {
	const adapter = getDefaultAdapter();
	await ensureMigrated(adapter);
	return adapter.clearGuestData();
}

export async function getSyncAccount(): Promise<SyncAccount | null> {
	const adapter = getDefaultAdapter();
	await ensureMigrated(adapter);
	return adapter.getSyncAccount();
}

export async function saveSyncAccount(account: SyncAccount): Promise<void> {
	const adapter = getDefaultAdapter();
	await ensureMigrated(adapter);
	return adapter.saveSyncAccount(account);
}

export async function clearSyncAccount(): Promise<void> {
	const adapter = getDefaultAdapter();
	await ensureMigrated(adapter);
	return adapter.clearSyncAccount();
}

export const localStore = {
	getSettings: getGuestSettings,
	saveSettings: saveGuestSettings,
	getCustomPassages,
	saveCustomPassage,
	updateCustomPassage,
	deleteCustomPassage,
	getAllPassages,
	getPassageById,
	getRandomPassage,
	getTestRuns: getGuestTestRuns,
	saveTestRun: saveGuestTestRun,
	clearTestRuns: clearGuestTestRuns,
	getGuestData,
	clearGuestData,
	getSyncAccount,
	saveSyncAccount,
	clearSyncAccount
};
