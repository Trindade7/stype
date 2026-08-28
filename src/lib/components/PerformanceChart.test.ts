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

	it('uses semantic theme tokens for trend lines, points, and tooltips rather than raw palette colors', () => {
		const runs: PerformanceRun[] = [
			{ id: 1, wpm: 75, accuracy: 97, mode: 'passage', createdAt: '2025-01-05T08:00:00Z' }
		];

		const { container } = render(PerformanceChart, { runs });

		// Legend dots
		const speedDot = container.querySelector('.bg-success');
		const accDot = container.querySelector('.bg-chart-2');
		expect(speedDot).toBeInTheDocument();
		expect(accDot).toBeInTheDocument();
		expect(container.querySelector('.bg-emerald-500')).not.toBeInTheDocument();
		expect(container.querySelector('.bg-sky-500')).not.toBeInTheDocument();

		// Lines
		const wpmLine = container.querySelector('path[data-testid="wpm-line"]');
		const accLine = container.querySelector('path[data-testid="accuracy-line"]');
		expect(wpmLine).toHaveClass('text-success', 'stroke-success');
		expect(wpmLine?.getAttribute('stroke')).toBe('currentColor');
		expect(wpmLine?.getAttribute('stroke')).not.toBe('#10b981');

		expect(accLine).toHaveClass('text-chart-2', 'stroke-chart-2');
		expect(accLine?.getAttribute('stroke')).toBe('currentColor');
		expect(accLine?.getAttribute('stroke')).not.toBe('#38bdf8');

		// Points
		const wpmPoint = container.querySelector('circle.text-success.fill-success');
		const accPoint = container.querySelector('circle.text-chart-2.fill-chart-2');
		expect(wpmPoint).toBeInTheDocument();
		expect(accPoint).toBeInTheDocument();

		// Gradient
		const stops = container.querySelectorAll('linearGradient stop');
		expect(stops.length).toBeGreaterThan(0);
		stops.forEach((stop) => {
			expect(stop.getAttribute('stop-color')).toBe('var(--color-success)');
		});
	});
});
