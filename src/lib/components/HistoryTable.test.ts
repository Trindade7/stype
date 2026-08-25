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
});
