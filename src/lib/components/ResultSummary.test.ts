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

	it('uses pure fade entrance animation without downward vertical slide to prevent scrollbar flash', () => {
		const { container } = render(ResultSummary, {
			wpm: 80,
			accuracy: 95,
			timeElapsed: 20
		});

		const root = container.firstElementChild as HTMLElement;
		expect(root).toBeInTheDocument();
		expect(root).toHaveClass('animate-in', 'fade-in');
		expect(root.className).not.toContain('slide-in');
	});

	it('uses compact spacing, compact padding, and nowrap on mobile screens to prevent wrapping', () => {
		const { container } = render(ResultSummary, {
			wpm: 120,
			accuracy: 100,
			timeElapsed: 45
		});

		const statsGrid = screen.getByText('Speed').closest('div[class*="grid"]');
		expect(statsGrid).toBeInTheDocument();
		// Compact grid gap on mobile: gap-3 (or gap-2.5) with larger spacing on desktop
		expect(statsGrid?.className).toMatch(/gap-(2\.5|3)\s+sm:gap-/);

		// Metric card compact padding on mobile
		const card = screen.getByText('Speed').closest('div[class*="rounded-lg"]');
		expect(card).toBeInTheDocument();
		expect(card?.className).toMatch(/p-(2\.5|3)\s+sm:p-4/);

		// Metric value has nowrap to ensure values never wrap or clip
		const speedValue = screen.getByText('120').closest('span');
		expect(speedValue).toHaveClass('whitespace-nowrap');
	});

	it('renders both a primary "Next Passage" button and a secondary outline "Retry" button side by side', () => {
		const onNextPassage = vi.fn();
		const onRetry = vi.fn();
		render(ResultSummary, {
			wpm: 75,
			accuracy: 95,
			timeElapsed: 20,
			onNextPassage,
			onRetry
		});

		const nextBtn = screen.getByRole('button', { name: /next passage/i });
		const retryBtn = screen.getByRole('button', { name: /retry/i });

		expect(nextBtn).toBeInTheDocument();
		expect(retryBtn).toBeInTheDocument();

		// Next Passage is primary
		expect(nextBtn).toHaveClass('bg-zinc-100', 'text-zinc-900');

		// Retry is secondary outline
		expect(retryBtn).toHaveClass('border', 'border-zinc-700', 'bg-transparent');

		// Shortcut hints
		expect(nextBtn.textContent).toContain('Tab');
		expect(retryBtn.textContent).toContain('Space');
	});

	it('triggers onNextPassage and onRetry callbacks when respective buttons are clicked', async () => {
		const onNextPassage = vi.fn();
		const onRetry = vi.fn();
		render(ResultSummary, {
			wpm: 75,
			accuracy: 95,
			timeElapsed: 20,
			onNextPassage,
			onRetry
		});

		const nextBtn = screen.getByRole('button', { name: /next passage/i });
		const retryBtn = screen.getByRole('button', { name: /retry/i });

		await fireEvent.click(nextBtn);
		expect(onNextPassage).toHaveBeenCalledTimes(1);

		await fireEvent.click(retryBtn);
		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it('triggers onNextPassage and prevents default when Tab key is pressed', async () => {
		const onNextPassage = vi.fn();
		render(ResultSummary, {
			wpm: 75,
			accuracy: 95,
			timeElapsed: 20,
			onNextPassage
		});

		const event = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
		const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
		window.dispatchEvent(event);

		expect(onNextPassage).toHaveBeenCalledTimes(1);
		expect(preventDefaultSpy).toHaveBeenCalled();
	});

	it('triggers onRetry and prevents default browser page scroll when Space key is pressed', async () => {
		const onRetry = vi.fn();
		render(ResultSummary, {
			wpm: 75,
			accuracy: 95,
			timeElapsed: 20,
			onRetry
		});

		const event = new KeyboardEvent('keydown', { key: ' ', cancelable: true });
		const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
		window.dispatchEvent(event);

		expect(onRetry).toHaveBeenCalledTimes(1);
		expect(preventDefaultSpy).toHaveBeenCalled();
	});
});
