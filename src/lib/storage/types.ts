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
}

export interface GuestPassage {
	id: number;
	text: string;
	source: string | null;
	createdAt?: string;
	isCustom?: boolean;
}

export interface GuestTestRun {
	id: number;
	passageId: number;
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
		id: number;
		text: string;
		source: string | null;
	} | null;
}

export interface SaveCustomPassageInput {
	id?: number;
	text: string;
	source?: string | null;
	createdAt?: string;
	isCustom?: boolean;
}

export interface SaveTestRunInput extends CompletedTestResult {
	id?: number;
	createdAt?: string;
	passage?: {
		id: number;
		text: string;
		source: string | null;
	} | null;
}

export interface GuestData {
	settings: GuestSettings;
	customPassages: GuestPassage[];
	testRuns: GuestTestRun[];
}

export interface LocalStoreAdapter {
	getSettings(): Promise<GuestSettings>;
	saveSettings(updates: Partial<GuestSettings>): Promise<GuestSettings>;
	getCustomPassages(): Promise<GuestPassage[]>;
	saveCustomPassage(input: SaveCustomPassageInput): Promise<GuestPassage>;
	updateCustomPassage(id: number, input: { text: string; source?: string | null }): Promise<GuestPassage | null>;
	deleteCustomPassage(id: number): Promise<boolean>;
	getTestRuns(): Promise<GuestTestRun[]>;
	saveTestRun(result: SaveTestRunInput): Promise<GuestTestRun>;
	clearTestRuns(): Promise<void>;
	getAllPassages(): Promise<GuestPassage[]>;
	getPassageById(id: number): Promise<GuestPassage | null>;
	getRandomPassage(lengthFilter?: PassageLength): Promise<GuestPassage | null>;
	getGuestData(): Promise<GuestData>;
	clearGuestData(): Promise<void>;
}
