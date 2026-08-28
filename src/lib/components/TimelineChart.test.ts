import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import TimelineChart from './TimelineChart.svelte';
import type { TimelineSnapshot } from '$lib/server/db/schema';

describe('TimelineChart', () => {
	beforeEach(() => {
		cleanup();
	});

	it('renders empty state message when no snapshots are provided', () => {
		render(TimelineChart, { snapshots: [] });
		expect(screen.getByText(/No timeline data available/i)).toBeInTheDocument();
	});

	it('renders speed and accuracy lines with legend and axis labels', () => {
		const snapshots: TimelineSnapshot[] = [
			{ second: 1, wpm: 45, accuracy: 100 },
			{ second: 2, wpm: 60, accuracy: 95 },
			{ second: 3, wpm: 75, accuracy: 97 },
			{ second: 4, wpm: 70, accuracy: 96 }
		];

		const { container } = render(TimelineChart, { snapshots });

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
		expect(dataPoints.length).toBeGreaterThanOrEqual(snapshots.length);
	});

	it('displays point tooltip on hover', async () => {
		const snapshots: TimelineSnapshot[] = [
			{ second: 1, wpm: 50, accuracy: 100 },
			{ second: 2, wpm: 80, accuracy: 92 }
		];

		const { container } = render(TimelineChart, { snapshots });

		const hoverAreas = container.querySelectorAll('[data-testid="hover-trigger"]');
		expect(hoverAreas.length).toBe(2);

		// Hover over the second point
		await fireEvent.mouseEnter(hoverAreas[1]);

		// Tooltip should show the snapshot values
		expect(screen.getAllByText('2s').length).toBeGreaterThanOrEqual(1);
		expect(screen.getByText('80 WPM')).toBeInTheDocument();
		expect(screen.getByText('92%')).toBeInTheDocument();
	});

	it('renders gracefully with a single snapshot', () => {
		const snapshots: TimelineSnapshot[] = [{ second: 1, wpm: 70, accuracy: 100 }];
		const { container } = render(TimelineChart, { snapshots });

		const circles = container.querySelectorAll('circle');
		expect(circles.length).toBe(2); // 1 for WPM, 1 for Accuracy
		expect(screen.getByText('1s')).toBeInTheDocument();
	});

	it('uses semantic theme tokens for lines, points, grid, labels, and container rather than hardcoded palette values', () => {
		const snapshots: TimelineSnapshot[] = [
			{ second: 1, wpm: 50, accuracy: 100 },
			{ second: 2, wpm: 80, accuracy: 92 }
		];

		const { container } = render(TimelineChart, { snapshots });

		// Chart container
		const chartContainer = container.querySelector('.rounded-lg.bg-card');
		expect(chartContainer).toBeInTheDocument();
		expect(chartContainer).toHaveClass('bg-card', 'border-border');
		expect(chartContainer).not.toHaveClass('bg-zinc-900/40', 'border-zinc-800/60');

		// Legend dots
		const speedDot = container.querySelector('.bg-success');
		const accDot = container.querySelector('.bg-chart-2');
		expect(speedDot).toBeInTheDocument();
		expect(accDot).toBeInTheDocument();
		expect(container.querySelector('.bg-emerald-400')).not.toBeInTheDocument();
		expect(container.querySelector('.bg-sky-400')).not.toBeInTheDocument();

		// Lines
		const wpmLine = container.querySelector('path[data-testid="wpm-line"]');
		const accLine = container.querySelector('path[data-testid="accuracy-line"]');
		expect(wpmLine).toHaveClass('text-success', 'stroke-success');
		expect(wpmLine?.getAttribute('stroke')).toBe('currentColor');
		expect(wpmLine?.getAttribute('stroke')).not.toBe('#34d399');

		expect(accLine).toHaveClass('text-chart-2', 'stroke-chart-2');
		expect(accLine?.getAttribute('stroke')).toBe('currentColor');
		expect(accLine?.getAttribute('stroke')).not.toBe('#38bdf8');

		// Grid lines
		const gridLines = container.querySelectorAll('line.text-border');
		expect(gridLines.length).toBeGreaterThan(0);
		expect(container.querySelector('line.text-zinc-800\\/80')).not.toBeInTheDocument();

		// Axis labels
		const labels = container.querySelectorAll('text.fill-muted-foreground');
		expect(labels.length).toBeGreaterThan(0);
		expect(container.querySelector('text.fill-zinc-500')).not.toBeInTheDocument();

		// Gradient stops
		const stops = container.querySelectorAll('linearGradient stop');
		expect(stops.length).toBeGreaterThan(0);
		stops.forEach((stop) => {
			expect(stop.getAttribute('stop-color')).toBe('var(--color-success)');
		});
	});
});
