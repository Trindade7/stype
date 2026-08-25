/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import HistoryTable from './HistoryTable.svelte';

describe('HistoryTable Component', () => {
	afterEach(() => {
		cleanup();
	});

	const mockRuns = [
		{
			id: 1,
			mode: 'passage' as const,
			duration: null,
			wpm: 80,
			accuracy: 98,
			createdAt: new Date('2025-01-15T10:30:00Z'),
			timeElapsed: 45,
			passage: {
				source: 'The Great Gatsby',
				text: 'Sample passage text.'
			}
		},
		{
			id: 2,
			mode: 'timed' as const,
			duration: 30,
			wpm: 95,
			accuracy: 100,
			createdAt: new Date('2025-01-16T14:00:00Z'),
			timeElapsed: 30,
			passage: {
				source: null,
				text: 'Another passage text.'
			}
		}
	];

	it('renders history runs with speed, accuracy, mode, and source', () => {
		render(HistoryTable, { runs: mockRuns });

		expect(screen.getByText('80 WPM')).toBeInTheDocument();
		expect(screen.getByText('• 98% Acc')).toBeInTheDocument();
		expect(screen.getByText('95 WPM')).toBeInTheDocument();
		expect(screen.getByText('• 100% Acc')).toBeInTheDocument();
		expect(screen.getByText('The Great Gatsby')).toBeInTheDocument();
	});

	it('shows empty state when no runs are passed or filters match nothing', () => {
		render(HistoryTable, { runs: [] });

		expect(screen.getByText('No test runs found matching your filters.')).toBeInTheDocument();
	});

	it('filters runs by mode correctly', async () => {
		render(HistoryTable, { runs: mockRuns });

		const timedTab = screen.getByRole('tab', { name: /timed/i });
		await fireEvent.click(timedTab);

		expect(screen.queryByText('80 WPM')).not.toBeInTheDocument();
		expect(screen.getByText('95 WPM')).toBeInTheDocument();
	});

	it('filters runs by date correctly', async () => {
		render(HistoryTable, { runs: mockRuns });

		const dateInput = screen.getByLabelText(/filter by date/i) as HTMLInputElement;
		await fireEvent.input(dateInput, { target: { value: '2025-01-15' } });

		expect(screen.getByText('80 WPM')).toBeInTheDocument();
		expect(screen.queryByText('95 WPM')).not.toBeInTheDocument();
	});

	it('paginates runs, showing only 10 per page initially, and navigates to the next page', async () => {
		const manyRuns = Array.from({ length: 15 }).map((_, i) => ({
			id: i + 1,
			mode: 'passage' as const,
			duration: null,
			wpm: 60 + i,
			accuracy: 95,
			createdAt: new Date(`2025-01-15T10:30:${String(i).padStart(2, '0')}Z`),
			timeElapsed: 30
		}));

		render(HistoryTable, { runs: manyRuns });

		// Should show 60 through 69 WPM initially
		expect(screen.getByText('60 WPM')).toBeInTheDocument();
		expect(screen.getByText('69 WPM')).toBeInTheDocument();
		// Should not show 70 WPM yet
		expect(screen.queryByText('70 WPM')).not.toBeInTheDocument();

		const prevButton = screen.getByRole('button', { name: /previous/i });
		const nextButton = screen.getByRole('button', { name: /next/i });

		// Previous button should be disabled on page 1
		expect(prevButton).toBeDisabled();
		expect(nextButton).not.toBeDisabled();

		// Click next
		await fireEvent.click(nextButton);

		// Now 60 WPM should be hidden, 70 WPM should be visible
		expect(screen.queryByText('60 WPM')).not.toBeInTheDocument();
		expect(screen.getByText('70 WPM')).toBeInTheDocument();
		expect(screen.getByText('74 WPM')).toBeInTheDocument();

		// Next button should be disabled on page 2 (last page)
		expect(prevButton).not.toBeDisabled();
		expect(nextButton).toBeDisabled();
	});
});
