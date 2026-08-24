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
});
