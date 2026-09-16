/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/svelte';
import GuestHistoryPage from './+page.svelte';
import { localStore, saveGuestTestRun, clearGuestTestRuns, DEFAULT_PASSAGES } from '$lib/localStore';
import { setAdapter, resetMigrationStatus } from '$lib/storage';
import { syncController } from '$lib/sync';

describe('Guest History Route (/history/+page.svelte)', () => {
	beforeEach(async () => {
		localStorage.clear();
		resetMigrationStatus();
		if (typeof indexedDB !== 'undefined') {
			await new Promise<void>((resolve, reject) => {
				const req = indexedDB.deleteDatabase('stype_db');
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
				req.onblocked = () => resolve();
			});
		}
		setAdapter(null);
		vi.restoreAllMocks();
	});

	afterEach(() => {
		cleanup();
	});

	it('renders header with navigation links and page title', () => {
		render(GuestHistoryPage);

		// Brand & Navigation
		expect(screen.getByText('stype')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /history/i })).toHaveAttribute('href', '/history');
		expect(screen.getByRole('link', { name: /stats/i })).toHaveAttribute('href', '/stats');
		expect(screen.getByRole('link', { name: /passages/i })).toHaveAttribute('href', '/passages');
		expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings');
		expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute('href', '/app/login');

		// Page Heading
		expect(screen.getByRole('heading', { level: 1, name: 'Test History' })).toBeInTheDocument();
		expect(
			screen.getByText(/Review your past test runs and see how you've improved/i)
		).toBeInTheDocument();
	});

	it('displays empty state when localStore has no test runs', async () => {
		await clearGuestTestRuns();
		render(GuestHistoryPage);

		expect(
			await screen.findByText('No test runs found matching your filters.')
		).toBeInTheDocument();
	});

	it('reads and displays test runs from localStore', async () => {
		const passage = DEFAULT_PASSAGES[0];
		await saveGuestTestRun({
			passageId: passage.id,
			mode: 'passage',
			duration: null,
			wpm: 88,
			accuracy: 97,
			timeElapsed: 22,
			correctChars: 60,
			incorrectChars: 2,
			extraChars: 0,
			missedChars: 0,
			timelineSnapshots: []
		});

		render(GuestHistoryPage);

		expect(await screen.findByText('88 WPM')).toBeInTheDocument();
		expect(screen.getByText('• 97% Acc')).toBeInTheDocument();
		expect(screen.getByText('22s')).toBeInTheDocument();
		expect(screen.getByText(passage.source!)).toBeInTheDocument();
	});

	it('shows clean loading state initially while fetching history from store', () => {
		// Mock getTestRuns with a pending promise that never resolves during initial render
		vi.spyOn(localStore, 'getTestRuns').mockReturnValue(new Promise(() => {}));

		render(GuestHistoryPage);

		expect(screen.getByTestId('history-loading')).toBeInTheDocument();
		expect(screen.getByText(/loading test history/i)).toBeInTheDocument();
	});

	it('updates history table dynamically when real-time test run update is received without page reload', async () => {
		await clearGuestTestRuns();
		render(GuestHistoryPage);

		expect(await screen.findByText('No test runs found matching your filters.')).toBeInTheDocument();

		// Save a test run into local storage as live sync does
		const passage = DEFAULT_PASSAGES[0];
		await saveGuestTestRun({
			id: 'realtime-run-125',
			passageId: passage.id,
			mode: 'passage',
			duration: null,
			wpm: 125,
			accuracy: 99,
			timeElapsed: 25,
			correctChars: 120,
			incorrectChars: 1,
			extraChars: 0,
			missedChars: 0,
			timelineSnapshots: []
		});

		// Notify data change from sync controller
		(syncController as any).notifyDataChange({
			type: 'testRuns',
			data: [{ id: 'realtime-run-125', wpm: 125 }]
		});

		// History table should now update dynamically without page reload
		expect(await screen.findByText('125 WPM')).toBeInTheDocument();
		expect(screen.getByText('• 99% Acc')).toBeInTheDocument();
	});
});
