import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import PerformanceChart, { type PerformanceRun } from './PerformanceChart.svelte';

describe('PerformanceChart', () => {
	beforeEach(() => {
		cleanup();
	});

	it('renders empty state message when no runs are provided', () => {
		render(PerformanceChart, { runs: [] });
		expect(screen.getByText(/No test runs yet|No test data available/i)).toBeInTheDocument();
	});

	it('renders speed and accuracy trend lines with legend and axis labels', () => {
		const runs: PerformanceRun[] = [
			{ id: 1, wpm: 50, accuracy: 92, mode: 'passage', createdAt: '2025-01-01T10:00:00Z' },
			{ id: 2, wpm: 65, accuracy: 95, mode: 'timed', createdAt: '2025-01-02T10:00:00Z' },
			{ id: 3, wpm: 80, accuracy: 98, mode: 'passage', createdAt: '2025-01-03T10:00:00Z' }
		];

		const { container } = render(PerformanceChart, { runs });

		// Legend checks
		expect(screen.getByText('Speed (WPM)')).toBeInTheDocument();
		expect(screen.getByText('Accuracy (%)')).toBeInTheDocument();

		// SVG chart elements exist
		const svg = container.querySelector('svg');
		expect(svg).toBeInTheDocument();

		const wpmPath = container.querySelector('path[data-testid="wpm-line"]');
		expect(wpmPath).toBeInTheDocument();

		const accPath = container.querySelector('path[data-testid="accuracy-line"]');
		expect(accPath).toBeInTheDocument();

		// Points rendered
		const dataPoints = container.querySelectorAll('circle');
		expect(dataPoints.length).toBeGreaterThanOrEqual(runs.length * 2);
	});

	it('displays tooltip with WPM, accuracy, mode, and date on hover', async () => {
		const runs: PerformanceRun[] = [
			{ id: 1, wpm: 55, accuracy: 94, mode: 'passage', createdAt: '2025-01-10T12:00:00Z' },
			{ id: 2, wpm: 85, accuracy: 99, mode: 'timed', createdAt: '2025-01-15T15:30:00Z' }
		];

		const { container } = render(PerformanceChart, { runs });

		const hoverAreas = container.querySelectorAll('[data-testid="hover-trigger"]');
		expect(hoverAreas.length).toBe(2);

		// Hover over the second point
		await fireEvent.mouseEnter(hoverAreas[1]);

		// Tooltip should display WPM, accuracy, mode, and date
		const tooltip = screen.getByTestId('performance-tooltip');
		expect(tooltip).toBeInTheDocument();
		expect(tooltip).toHaveTextContent('85 WPM');
		expect(tooltip).toHaveTextContent('99%');
		expect(tooltip).toHaveTextContent(/timed/i);
		expect(tooltip).toHaveTextContent(/Jan 15, 2025/i);
	});

	it('renders gracefully with a single test run', () => {
		const runs: PerformanceRun[] = [
			{ id: 1, wpm: 75, accuracy: 97, mode: 'passage', createdAt: '2025-01-05T08:00:00Z' }
		];

		const { container } = render(PerformanceChart, { runs });

		const circles = container.querySelectorAll('circle');
		expect(circles.length).toBe(2); // 1 for WPM, 1 for Accuracy
		expect(container.querySelector('svg')).toBeInTheDocument();
	});

	it('sorts test runs chronologically for progression trend', async () => {
		// Out-of-order runs (e.g. descending order from API)
		const runs: PerformanceRun[] = [
			{ id: 2, wpm: 90, accuracy: 99, mode: 'timed', createdAt: '2025-01-20T10:00:00Z' },
			{ id: 1, wpm: 60, accuracy: 90, mode: 'passage', createdAt: '2025-01-10T10:00:00Z' }
		];

		const { container } = render(PerformanceChart, { runs });

		const hoverAreas = container.querySelectorAll('[data-testid="hover-trigger"]');
		// The first slice (leftmost) should correspond to the earliest run (Jan 10, 60 WPM)
		await fireEvent.mouseEnter(hoverAreas[0]);
		let tooltip = screen.getByTestId('performance-tooltip');
		expect(tooltip).toHaveTextContent('60 WPM');
		expect(tooltip).toHaveTextContent(/Jan 10, 2025/i);

		// The second slice (rightmost) should correspond to the latest run (Jan 20, 90 WPM)
		await fireEvent.mouseEnter(hoverAreas[1]);
		tooltip = screen.getByTestId('performance-tooltip');
		expect(tooltip).toHaveTextContent('90 WPM');
		expect(tooltip).toHaveTextContent(/Jan 20, 2025/i);
	});
});
