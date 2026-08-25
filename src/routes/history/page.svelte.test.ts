/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import GuestHistoryPage from './+page.svelte';
import { localStore, saveGuestTestRun, clearGuestTestRuns, DEFAULT_PASSAGES } from '$lib/localStore';

describe('Guest History Route (/history/+page.svelte)', () => {
	beforeEach(() => {
		localStorage.clear();
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

	it('displays empty state when localStore has no test runs', () => {
		clearGuestTestRuns();
		render(GuestHistoryPage);

		expect(
			screen.getByText('No test runs found matching your filters.')
		).toBeInTheDocument();
	});

	it('reads and displays test runs from localStore', () => {
		const passage = DEFAULT_PASSAGES[0];
		saveGuestTestRun({
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

		expect(screen.getByText('88 WPM')).toBeInTheDocument();
		expect(screen.getByText('• 97% Acc')).toBeInTheDocument();
		expect(screen.getByText('22s')).toBeInTheDocument();
		expect(screen.getByText(passage.source!)).toBeInTheDocument();
	});
});
