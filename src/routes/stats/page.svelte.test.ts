/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
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

	it('displays zeroed metrics and empty chart state when localStore has no test runs', () => {
		clearGuestTestRuns();
		render(GuestStatsPage);

		expect(screen.getByText('Tests Completed')).toBeInTheDocument();
		expect(screen.getByText('0')).toBeInTheDocument();

		expect(screen.getByText('Average Speed')).toBeInTheDocument();
		expect(screen.getByText('Peak Speed')).toBeInTheDocument();
		expect(screen.getAllByText('0 WPM')).toHaveLength(2);

		expect(screen.getByText('Average Accuracy')).toBeInTheDocument();
		expect(screen.getByText('0%')).toBeInTheDocument();

		expect(screen.getByTestId('performance-chart-empty')).toBeInTheDocument();
	});

	it('calculates and displays lifetime stats and performance chart from stored test runs', async () => {
		const passage = DEFAULT_PASSAGES[0];

		vi.useFakeTimers();
		vi.setSystemTime(new Date('2025-01-01T10:00:00Z'));

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

		vi.setSystemTime(new Date('2025-01-02T10:00:00Z'));

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

		vi.useRealTimers();

		const { container } = render(GuestStatsPage);

		expect(screen.getByText('2')).toBeInTheDocument();
		expect(screen.getByText('80 WPM')).toBeInTheDocument();
		expect(screen.getByText('90 WPM')).toBeInTheDocument();
		expect(screen.getByText('98%')).toBeInTheDocument();
		expect(screen.getByText('Total lifetime runs')).toBeInTheDocument();
		expect(screen.getByText('Personal best')).toBeInTheDocument();

		// Performance chart checks
		expect(container.querySelector('path[data-testid="wpm-line"]')).toBeInTheDocument();
		expect(container.querySelector('path[data-testid="accuracy-line"]')).toBeInTheDocument();

		const hoverAreas = container.querySelectorAll('[data-testid="hover-trigger"]');
		expect(hoverAreas.length).toBe(2);

		await fireEvent.mouseEnter(hoverAreas[1]);
		const tooltip = screen.getByTestId('performance-tooltip');
		expect(tooltip).toBeInTheDocument();
		expect(tooltip).toHaveTextContent('90 WPM');
		expect(tooltip).toHaveTextContent('100%');
	});
});
