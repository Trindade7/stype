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
	type SaveTestRunInput
} from './storage';

export type {
	GuestSettings,
	GuestPassage,
	GuestTestRun,
	GuestData,
	LocalStoreAdapter,
	SaveCustomPassageInput,
	SaveTestRunInput
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

export async function getCustomPassages(): Promise<GuestPassage[]> {
	const adapter = getDefaultAdapter();
	await ensureMigrated(adapter);
	return adapter.getCustomPassages();
}

export async function saveCustomPassage(input: SaveCustomPassageInput): Promise<GuestPassage> {
	const adapter = getDefaultAdapter();
	await ensureMigrated(adapter);
	return adapter.saveCustomPassage(input);
}

export async function updateCustomPassage(
	id: number,
	input: { text: string; source?: string | null }
): Promise<GuestPassage | null> {
	const adapter = getDefaultAdapter();
	await ensureMigrated(adapter);
	return adapter.updateCustomPassage(id, input);
}

export async function deleteCustomPassage(id: number): Promise<boolean> {
	const adapter = getDefaultAdapter();
	await ensureMigrated(adapter);
	return adapter.deleteCustomPassage(id);
}

export async function getAllPassages(): Promise<GuestPassage[]> {
	const adapter = getDefaultAdapter();
	await ensureMigrated(adapter);
	return adapter.getAllPassages();
}

export async function getPassageById(id: number): Promise<GuestPassage | null> {
	const adapter = getDefaultAdapter();
	await ensureMigrated(adapter);
	return adapter.getPassageById(id);
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

export async function getGuestData(): Promise<GuestData> {
	const adapter = getDefaultAdapter();
	await ensureMigrated(adapter);
	return adapter.getGuestData();
}

export async function clearGuestData(): Promise<void> {
	const adapter = getDefaultAdapter();
	await ensureMigrated(adapter);
	return adapter.clearGuestData();
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
	clearGuestData
};
