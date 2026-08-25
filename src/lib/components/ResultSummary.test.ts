/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import ResultSummary from './ResultSummary.svelte';

describe('ResultSummary Component', () => {
	afterEach(() => {
		cleanup();
	});

	it('renders summary statistics correctly', () => {
		render(ResultSummary, {
			wpm: 85,
			accuracy: 98,
			timeElapsed: 25,
			timelineSnapshots: []
		});

		expect(screen.getByText('Passage Complete')).toBeInTheDocument();
		expect(screen.getByText('85')).toBeInTheDocument();
		expect(screen.getByText('WPM')).toBeInTheDocument();
		expect(screen.getByText('98')).toBeInTheDocument();
		expect(screen.getByText('%')).toBeInTheDocument();
		expect(screen.getByText('25')).toBeInTheDocument();
		expect(screen.getByText('s')).toBeInTheDocument();
	});

	it('displays saving indicator when isSaving is true', () => {
		render(ResultSummary, {
			wpm: 60,
			accuracy: 100,
			timeElapsed: 15,
			isSaving: true
		});

		expect(screen.getByText('Saving results...')).toBeInTheDocument();
		expect(screen.queryByText('Speed')).not.toBeInTheDocument();
	});

	it('renders timeline chart when snapshots are present', () => {
		const snapshots = [
			{ second: 1, wpm: 50, accuracy: 100 },
			{ second: 2, wpm: 65, accuracy: 95 }
		];
		const { container } = render(ResultSummary, {
			wpm: 65,
			accuracy: 95,
			timeElapsed: 2,
			timelineSnapshots: snapshots
		});

		expect(screen.getByText('Speed (WPM)')).toBeInTheDocument();
		expect(screen.getByText('Accuracy (%)')).toBeInTheDocument();
		expect(container.querySelector('svg')).toBeInTheDocument();
	});

	it('triggers onRestart callback when restart button is clicked', async () => {
		const onRestart = vi.fn();
		render(ResultSummary, {
			wpm: 70,
			accuracy: 100,
			timeElapsed: 10,
			onRestart
		});

		const restartBtn = screen.getByRole('button', { name: /type again/i });
		expect(restartBtn).toBeInTheDocument();

		await fireEvent.click(restartBtn);
		expect(onRestart).toHaveBeenCalledTimes(1);
	});
});
