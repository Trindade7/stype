import type { PassageLength } from '../passage-utils';
import type { CompletedTestResult } from '../components/TypingEngine.svelte';
import type { TimelineSnapshot } from '../server/db/schema';

export interface GuestSettings {
	mode: 'passage' | 'timed';
	duration: number;
	passageLength: 'all' | 'short' | 'medium' | 'long';
	zenMode: boolean;
	theme: 'light' | 'dark' | 'system';
	scrollMode: 'manual' | 'center' | 'step';
	updatedAt?: string;
	deletedAt?: string | null;
}

export interface GuestPassage {
	id: string | number;
	text: string;
	source: string | null;
	createdAt?: string;
	updatedAt?: string;
	deletedAt?: string | null;
	isCustom?: boolean;
}

export interface GuestTestRun {
	id: string | number;
	passageId: string | number;
	mode: 'passage' | 'timed';
	duration: number | null;
	wpm: number;
	accuracy: number;
	timeElapsed: number;
	correctChars: number;
	incorrectChars: number;
	extraChars: number;
	missedChars: number;
	timelineSnapshots: TimelineSnapshot[];
	createdAt: string;
	passage?: {
		id: string | number;
		text: string;
		source: string | null;
	} | null;
}

export interface SaveCustomPassageInput {
	id?: string | number;
	text: string;
	source?: string | null;
	createdAt?: string;
	updatedAt?: string;
	deletedAt?: string | null;
	isCustom?: boolean;
}

export interface SaveTestRunInput extends CompletedTestResult {
	id?: string | number;
	passageId: string | number;
	createdAt?: string;
	passage?: {
		id: string | number;
		text: string;
		source: string | null;
	} | null;
}

export interface SyncAccountUser {
	id: string;
	username: string;
	email?: string | null;
	name?: string | null;
	role?: string;
}

export interface SyncAccount {
	serverUrl: string;
	token: string;
	user: SyncAccountUser;
	lastSyncedAt?: string | null;
}

export interface GuestData {
	settings: GuestSettings;
	customPassages: GuestPassage[];
	testRuns: GuestTestRun[];
}

export interface LocalStoreAdapter {
	getSettings(): Promise<GuestSettings>;
	saveSettings(updates: Partial<GuestSettings>): Promise<GuestSettings>;
	getCustomPassages(includeDeleted?: boolean): Promise<GuestPassage[]>;
	saveCustomPassage(input: SaveCustomPassageInput): Promise<GuestPassage>;
	updateCustomPassage(id: string | number, input: { text: string; source?: string | null }): Promise<GuestPassage | null>;
	deleteCustomPassage(id: string | number): Promise<boolean>;
	getTestRuns(): Promise<GuestTestRun[]>;
	saveTestRun(result: SaveTestRunInput): Promise<GuestTestRun>;
	clearTestRuns(): Promise<void>;
	getAllPassages(includeDeleted?: boolean): Promise<GuestPassage[]>;
	getPassageById(id: string | number, includeDeleted?: boolean): Promise<GuestPassage | null>;
	getRandomPassage(lengthFilter?: PassageLength): Promise<GuestPassage | null>;
	getGuestData(includeDeleted?: boolean): Promise<GuestData>;
	clearGuestData(): Promise<void>;
	getSyncAccount(): Promise<SyncAccount | null>;
	saveSyncAccount(account: SyncAccount): Promise<void>;
	clearSyncAccount(): Promise<void>;
}
