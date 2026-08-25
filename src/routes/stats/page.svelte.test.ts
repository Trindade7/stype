/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import GuestStatsPage from './+page.svelte';
import {
	saveGuestTestRun,
	clearGuestTestRuns,
	DEFAULT_PASSAGES
} from '$lib/localStore';

describe('Guest Stats Route (/stats/+page.svelte)', () => {
	beforeEach(() => {
		localStorage.clear();
		vi.restoreAllMocks();
	});

	afterEach(() => {
		cleanup();
	});

	it('renders header with navigation links and stats page heading', () => {
		render(GuestStatsPage);

		// Brand & Navigation
		expect(screen.getByText('stype')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /history/i })).toHaveAttribute('href', '/history');
		expect(screen.getByRole('link', { name: /stats/i })).toHaveAttribute('href', '/stats');
		expect(screen.getByRole('link', { name: /passages/i })).toHaveAttribute('href', '/passages');
		expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings');
		expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute('href', '/app/login');

		// Page Heading
		expect(screen.getByRole('heading', { level: 1, name: 'Lifetime Stats' })).toBeInTheDocument();
		expect(
			screen.getByText(/Your all-time typing performance metrics/i)
		).toBeInTheDocument();
	});

	it('displays zeroed metrics when localStore has no test runs', () => {
		clearGuestTestRuns();
		render(GuestStatsPage);

		expect(screen.getByText('Tests Completed')).toBeInTheDocument();
		expect(screen.getByText('0')).toBeInTheDocument();

		expect(screen.getByText('Average Speed')).toBeInTheDocument();
		expect(screen.getByText('Peak Speed')).toBeInTheDocument();
		expect(screen.getAllByText('0 WPM')).toHaveLength(2);

		expect(screen.getByText('Average Accuracy')).toBeInTheDocument();
		expect(screen.getByText('0%')).toBeInTheDocument();
	});

	it('calculates and displays lifetime stats from stored test runs', () => {
		const passage = DEFAULT_PASSAGES[0];

		saveGuestTestRun({
			passageId: passage.id,
			mode: 'passage',
			duration: null,
			wpm: 70,
			accuracy: 96,
			timeElapsed: 20,
			correctChars: 50,
			incorrectChars: 2,
			extraChars: 0,
			missedChars: 0,
			timelineSnapshots: []
		});

		saveGuestTestRun({
			passageId: passage.id,
			mode: 'timed',
			duration: 30,
			wpm: 90,
			accuracy: 100,
			timeElapsed: 30,
			correctChars: 65,
			incorrectChars: 0,
			extraChars: 0,
			missedChars: 0,
			timelineSnapshots: []
		});

		render(GuestStatsPage);

		expect(screen.getByText('2')).toBeInTheDocument();
		expect(screen.getByText('80 WPM')).toBeInTheDocument();
		expect(screen.getByText('90 WPM')).toBeInTheDocument();
		expect(screen.getByText('98%')).toBeInTheDocument();
		expect(screen.getByText('Total lifetime runs')).toBeInTheDocument();
		expect(screen.getByText('Personal best')).toBeInTheDocument();
	});
});
