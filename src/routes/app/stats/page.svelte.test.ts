/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import AppStatsPage from './+page.svelte';

describe('Authenticated Stats Route (/app/stats/+page.svelte)', () => {
	afterEach(() => {
		cleanup();
	});

	it('renders stats page heading and metric cards', () => {
		render(AppStatsPage, {
			data: {
				stats: {
					totalTests: 5,
					averageWpm: 72,
					peakWpm: 95,
					averageAccuracy: 98
				},
				runs: []
			} as any
		});

		expect(screen.getByRole('heading', { level: 1, name: 'Lifetime Stats' })).toBeInTheDocument();
		expect(screen.getByText('5')).toBeInTheDocument();
		expect(screen.getByText('72 WPM')).toBeInTheDocument();
		expect(screen.getByText('95 WPM')).toBeInTheDocument();
		expect(screen.getByText('98%')).toBeInTheDocument();
	});

	it('displays empty state for PerformanceChart when runs are empty', () => {
		render(AppStatsPage, {
			data: {
				stats: {
					totalTests: 0,
					averageWpm: 0,
					peakWpm: 0,
					averageAccuracy: 0
				},
				runs: []
			} as any
		});

		expect(screen.getByTestId('performance-chart-empty')).toBeInTheDocument();
	});

	it('renders performance trend chart with historical runs and shows tooltip on hover', async () => {
		const mockRuns = [
			{
				id: 1,
				mode: 'passage' as const,
				duration: null,
				wpm: 65,
				accuracy: 94,
				createdAt: new Date('2025-01-01T10:00:00Z'),
				timeElapsed: 25
			},
			{
				id: 2,
				mode: 'timed' as const,
				duration: 30,
				wpm: 88,
				accuracy: 99,
				createdAt: new Date('2025-01-05T12:00:00Z'),
				timeElapsed: 30
			}
		];

		const { container } = render(AppStatsPage, {
			data: {
				stats: {
					totalTests: 2,
					averageWpm: 76.5,
					peakWpm: 88,
					averageAccuracy: 96.5
				},
				runs: mockRuns
			} as any
		});

		expect(container.querySelector('path[data-testid="wpm-line"]')).toBeInTheDocument();
		expect(container.querySelector('path[data-testid="accuracy-line"]')).toBeInTheDocument();

		const hoverAreas = container.querySelectorAll('[data-testid="hover-trigger"]');
		expect(hoverAreas.length).toBe(2);

		await fireEvent.mouseEnter(hoverAreas[1]);

		const tooltip = screen.getByTestId('performance-tooltip');
		expect(tooltip).toBeInTheDocument();
		expect(tooltip).toHaveTextContent('88 WPM');
		expect(tooltip).toHaveTextContent('99%');
		expect(tooltip).toHaveTextContent(/timed/i);
		expect(tooltip).toHaveTextContent(/Jan 5, 2025/i);
	});
});
