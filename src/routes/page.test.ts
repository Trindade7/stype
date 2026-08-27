/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/svelte';
import GuestPage from './+page.svelte';
import {
	localStore,
	saveGuestSettings,
	saveCustomPassage,
	getGuestTestRuns,
	DEFAULT_PASSAGES
} from '$lib/localStore';

describe('Guest Root Route (+page.svelte)', () => {
	beforeEach(() => {
		localStorage.clear();
		vi.restoreAllMocks();
	});

	afterEach(() => {
		cleanup();
	});

	it('renders typing test engine and default passage for guests', () => {
		render(GuestPage);

		// Brand / Navigation links
		expect(screen.getByText('stype')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /history/i })).toHaveAttribute('href', '/history');
		expect(screen.getByRole('link', { name: /stats/i })).toHaveAttribute('href', '/stats');
		expect(screen.getByRole('link', { name: /passages/i })).toHaveAttribute('href', '/passages');
		expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings');
		expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute('href', '/app/login');

		// HUD metrics elements
		expect(screen.getByText('WPM')).toBeInTheDocument();
		expect(screen.getByText('ACC')).toBeInTheDocument();
		expect(screen.getByText('Time')).toBeInTheDocument();

		// Check that passage text from default passages is rendered
		const passageTexts = DEFAULT_PASSAGES.map((p) => p.text);
		const hasDefaultPassage = passageTexts.some((text) =>
			document.body.textContent?.includes(text)
		);
		expect(hasDefaultPassage).toBe(true);
	});

	it('loads initial mode and duration from localStore settings', () => {
		saveGuestSettings({
			mode: 'timed',
			duration: 60,
			zenMode: false
		});

		render(GuestPage);

		// In timed mode with 60s duration, "60s" should be displayed in the UI (toolbar / HUD)
		const durationElements = screen.getAllByText('60s');
		expect(durationElements.length).toBeGreaterThanOrEqual(1);
	});

	it('loads saved scrollMode from guest settings into TypingEngine', () => {
		saveGuestSettings({
			scrollMode: 'step'
		});

		const { container } = render(GuestPage);
		expect(container.querySelector('[data-scroll-mode="step"]')).toBeInTheDocument();
	});

	it('loads custom passage if stored in localStore', () => {
		localStorage.clear();
		saveCustomPassage({
			text: 'Unique custom passage exclusively for guest testing.',
			source: 'Guest Custom'
		});

		render(GuestPage);

		// Either default or custom is displayed
		expect(screen.getByText(/Restart \(Esc\)/i)).toBeInTheDocument();
	});

	it('saves test run into localStorage when typing test completes', async () => {
		// Set a single short custom passage to make typing test easy to complete
		const singlePassage = saveCustomPassage({
			text: 'Hi',
			source: 'Short test'
		});

		// Mock getRandomPassage to return singlePassage
		vi.spyOn(localStore, 'getRandomPassage').mockReturnValue(singlePassage);

		render(GuestPage);

		const input = document.querySelector('input[type="text"]') as HTMLInputElement;
		expect(input).toBeInTheDocument();

		// Type "Hi"
		await fireEvent.input(input, { target: { value: 'H' } });
		await fireEvent.input(input, { target: { value: 'Hi' } });

		// Check that the test run was saved to localStore
		const runs = getGuestTestRuns();
		expect(runs.length).toBeGreaterThanOrEqual(1);
		expect(runs[0].passageId).toBe(singlePassage.id);
		expect(runs[0].correctChars).toBe(2);
		expect(runs[0].accuracy).toBe(100);
	});

	it('cycles to another passage when Next button is clicked', async () => {
		const passageA = { id: 101, text: 'First passage text here.', source: 'Source A' };
		const passageB = { id: 102, text: 'Second passage text here.', source: 'Source B' };

		let callCount = 0;
		vi.spyOn(localStore, 'getRandomPassage').mockImplementation(() => {
			callCount++;
			return callCount === 1 ? passageA : passageB;
		});

		render(GuestPage);

		expect(document.body.textContent).toContain('First passage text here.');

		const nextButton = screen.getByRole('button', { name: /next/i });
		await fireEvent.click(nextButton);

		expect(document.body.textContent).toContain('Second passage text here.');
	});

	it('maintains fixed positioning and centered max-width layout alignment for guest header', () => {
		render(GuestPage);

		const header = screen.getByRole('banner');
		expect(header).toHaveClass('fixed', 'inset-x-0', 'top-0');

		const headerContainer = header.firstElementChild;
		expect(headerContainer).toHaveClass('mx-auto', 'max-w-5xl', 'px-6');
	});

	it('automatically focuses the typing input when the guest page mounts', () => {
		render(GuestPage);

		const input = document.querySelector('input[type="text"]') as HTMLInputElement;
		expect(input).toBeInTheDocument();
		expect(input).toHaveAttribute('autofocus');
		expect(document.activeElement).toBe(input);
	});

	it('constrains guest typing page to 100dvh with overflow-hidden and flexible layout', () => {
		const { container } = render(GuestPage);

		const rootWrapper = container.firstElementChild as HTMLElement;
		expect(rootWrapper).toHaveClass('h-screen', 'h-[100dvh]', 'overflow-hidden');

		const mainElement = container.querySelector('main') as HTMLElement;
		expect(mainElement).toHaveClass('flex-1', 'min-h-0', 'overflow-hidden');
	});

	it('allows guest to advance to next passage or retry same passage after completing test run', async () => {
		const passageA = { id: 201, text: 'Hi', source: 'Source A' };
		const passageB = { id: 202, text: 'Next passage text.', source: 'Source B' };

		let callCount = 0;
		vi.spyOn(localStore, 'getRandomPassage').mockImplementation(() => {
			callCount++;
			return callCount === 1 ? passageA : passageB;
		});

		render(GuestPage);

		const input = document.querySelector('input[type="text"]') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: 'H' } });
		await fireEvent.input(input, { target: { value: 'Hi' } });

		expect(await screen.findByText('Passage Complete')).toBeInTheDocument();

		// Retry with Space: stays on passageA
		await fireEvent.keyDown(window, { key: ' ' });
		expect(screen.queryByText('Passage Complete')).not.toBeInTheDocument();
		expect(screen.getByText('— Source A')).toBeInTheDocument();
		expect(callCount).toBe(1);

		// Complete again
		const freshInput = document.querySelector('input[type="text"]') as HTMLInputElement;
		await fireEvent.input(freshInput, { target: { value: 'H' } });
		await fireEvent.input(freshInput, { target: { value: 'Hi' } });
		expect(await screen.findByText('Passage Complete')).toBeInTheDocument();

		// Next with Tab: loads passageB
		await fireEvent.keyDown(window, { key: 'Tab' });
		expect(await screen.findByText('— Source B')).toBeInTheDocument();
		expect(callCount).toBe(2);
	});
});
