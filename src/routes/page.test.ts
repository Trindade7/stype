/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/svelte';
import GuestPage from './+page.svelte';
import {
	localStore,
	saveGuestSettings,
	saveCustomPassage,
	getGuestTestRuns,
	DEFAULT_PASSAGES
} from '$lib/localStore';
import { setAdapter, resetMigrationStatus } from '$lib/storage';
import { viewportLayout } from '$lib/viewport';
import { syncController } from '$lib/sync';

describe('Guest Root Route (+page.svelte)', () => {
	beforeEach(async () => {
		viewportLayout.reset();
		localStorage.clear();
		resetMigrationStatus();
		if (typeof indexedDB !== 'undefined') {
			await new Promise<void>((resolve, reject) => {
				const req = indexedDB.deleteDatabase('stype_db');
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
				req.onblocked = () => resolve();
			});
		}
		setAdapter(null);
		vi.restoreAllMocks();
	});

	afterEach(() => {
		viewportLayout.reset();
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

	it('loads initial mode and duration from localStore settings', async () => {
		await saveGuestSettings({
			mode: 'timed',
			duration: 60,
			zenMode: false
		});

		render(GuestPage);

		await waitFor(() => {
			const durationElements = screen.getAllByText('60s');
			expect(durationElements.length).toBeGreaterThanOrEqual(1);
		});
	});

	it('loads saved scrollMode from guest settings into TypingEngine', async () => {
		await saveGuestSettings({
			scrollMode: 'step'
		});

		const { container } = render(GuestPage);
		await waitFor(() => {
			expect(container.querySelector('[data-scroll-mode="step"]')).toBeInTheDocument();
		});
	});

	it('loads custom passage if stored in localStore', async () => {
		localStorage.clear();
		await saveCustomPassage({
			text: 'Unique custom passage exclusively for guest testing.',
			source: 'Guest Custom'
		});

		render(GuestPage);

		// Either default or custom is displayed
		expect(screen.getByText(/Restart \(Esc\)/i)).toBeInTheDocument();
	});

	it('saves test run into localStorage when typing test completes', async () => {
		// Set a single short custom passage to make typing test easy to complete
		const singlePassage = await saveCustomPassage({
			text: 'Hi',
			source: 'Short test'
		});

		// Mock getRandomPassage to return singlePassage
		vi.spyOn(localStore, 'getRandomPassage').mockResolvedValue(singlePassage);

		render(GuestPage);

		await screen.findByText('— Short test');

		const input = document.querySelector('input[type="text"]') as HTMLInputElement;
		expect(input).toBeInTheDocument();

		// Type "Hi"
		await fireEvent.input(input, { target: { value: 'H' } });
		await fireEvent.input(input, { target: { value: 'Hi' } });

		// Check that the test run was saved to localStore
		await waitFor(async () => {
			const runs = await getGuestTestRuns();
			expect(runs.length).toBeGreaterThanOrEqual(1);
			expect(runs[0].passageId).toBe(singlePassage.id);
			expect(runs[0].correctChars).toBe(2);
			expect(runs[0].accuracy).toBe(100);
		});
	});

	it('cycles to another passage when Next button is clicked', async () => {
		const passageA = { id: 101, text: 'First passage text here.', source: 'Source A' };
		const passageB = { id: 102, text: 'Second passage text here.', source: 'Source B' };

		let callCount = 0;
		vi.spyOn(localStore, 'getRandomPassage').mockImplementation(async () => {
			callCount++;
			return callCount === 1 ? passageA : passageB;
		});

		render(GuestPage);

		await waitFor(() => {
			expect(document.body.textContent).toContain('First passage text here.');
		});

		const nextButton = screen.getByRole('button', { name: /next/i });
		await fireEvent.click(nextButton);

		await waitFor(() => {
			expect(document.body.textContent).toContain('Second passage text here.');
		});
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
		vi.spyOn(localStore, 'getRandomPassage').mockImplementation(async () => {
			callCount++;
			return callCount === 1 ? passageA : passageB;
		});

		render(GuestPage);

		await screen.findByText('— Source A');

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

	it('loads the specified passage from local store when visiting /?passageId=<id>', () => {
		const targetPassage = DEFAULT_PASSAGES[3]; // id 4
		window.history.pushState({}, '', `/?passageId=${targetPassage.id}`);

		render(GuestPage);

		expect(document.body.textContent).toContain(targetPassage.text);
		expect(document.body.textContent).toContain(`— ${targetPassage.source}`);
	});

	it('falls back to random passage when passageId in URL is invalid or non-existent', async () => {
		const fallbackPassage = { id: 888, text: 'Fallback random passage.', source: 'Fallback' };
		vi.spyOn(localStore, 'getRandomPassage').mockResolvedValue(fallbackPassage);

		window.history.pushState({}, '', '/?passageId=invalid');
		render(GuestPage);

		await waitFor(() => {
			expect(document.body.textContent).toContain('Fallback random passage.');
		});
	});

	it('retains selected passage on Retry and clears passageId from URL on Next Passage', async () => {
		const targetPassage = await saveCustomPassage({
			text: 'Hi',
			source: 'Target Selection'
		});
		const nextPassage = { id: 999, text: 'Subsequent random passage.', source: 'Random Next' };

		vi.spyOn(localStore, 'getRandomPassage').mockResolvedValue(nextPassage);

		window.history.pushState({}, '', `/?passageId=${targetPassage.id}`);
		render(GuestPage);

		expect(await screen.findByText('— Target Selection')).toBeInTheDocument();

		const input = document.querySelector('input[type="text"]') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: 'H' } });
		await fireEvent.input(input, { target: { value: 'Hi' } });

		expect(await screen.findByText('Passage Complete')).toBeInTheDocument();

		// Retry with Space: retains same passage
		await fireEvent.keyDown(window, { key: ' ' });
		expect(screen.queryByText('Passage Complete')).not.toBeInTheDocument();
		expect(screen.getByText('— Target Selection')).toBeInTheDocument();

		// Complete again
		const freshInput = document.querySelector('input[type="text"]') as HTMLInputElement;
		await fireEvent.input(freshInput, { target: { value: 'H' } });
		await fireEvent.input(freshInput, { target: { value: 'Hi' } });
		expect(await screen.findByText('Passage Complete')).toBeInTheDocument();

		// Next Passage with Tab: clears URL query and loads random passage
		await fireEvent.keyDown(window, { key: 'Tab' });
		expect(window.location.search).toBe('');
		expect(await screen.findByText('— Random Next')).toBeInTheDocument();
	});

	it('transitions to compact layout with collapsed header and shrunk container padding when typing input focuses on narrow viewports', async () => {
		viewportLayout.setViewportDimensions(375, 667);

		const { container } = render(GuestPage);

		const header = screen.getByRole('banner');
		const main = container.querySelector('main') as HTMLElement;

		await waitFor(() => {
			expect(header).toHaveClass('-translate-y-full');
			expect(header).toHaveAttribute('data-collapsed', 'true');
			expect(main).toHaveClass('pt-2', 'pb-2', 'px-3');
			expect(main).not.toHaveClass('pt-20', 'pb-6', 'px-6');
		});
	});

	it('restores header and normal padding when typing input is blurred on narrow viewports', async () => {
		viewportLayout.setViewportDimensions(375, 667);

		const { container } = render(GuestPage);

		const header = screen.getByRole('banner');
		const main = container.querySelector('main') as HTMLElement;
		const input = document.querySelector('input[type="text"]') as HTMLInputElement;

		await waitFor(() => {
			expect(header).toHaveClass('-translate-y-full');
			expect(main).toHaveClass('pt-2', 'pb-2', 'px-3');
		});

		await fireEvent.blur(input);

		await waitFor(() => {
			expect(header).toHaveClass('translate-y-0');
			expect(header).toHaveAttribute('data-collapsed', 'false');
			expect(main).toHaveClass('pt-20', 'pb-6', 'px-6');
			expect(main).not.toHaveClass('pt-2', 'pb-2', 'px-3');
		});

		await fireEvent.focus(input);

		await waitFor(() => {
			expect(header).toHaveClass('-translate-y-full');
			expect(header).toHaveAttribute('data-collapsed', 'true');
			expect(main).toHaveClass('pt-2', 'pb-2', 'px-3');
		});
	});

	it('restores header and returns container to normal padding when test run completes on narrow viewports', async () => {
		viewportLayout.setViewportDimensions(375, 667);

		const testPassage = await saveCustomPassage({
			text: 'Go',
			source: 'Speed Test'
		});
		vi.spyOn(localStore, 'getRandomPassage').mockResolvedValue(testPassage);

		const { container } = render(GuestPage);

		await screen.findByText('— Speed Test');

		const header = screen.getByRole('banner');
		const main = container.querySelector('main') as HTMLElement;
		const input = document.querySelector('input[type="text"]') as HTMLInputElement;

		await waitFor(() => {
			expect(header).toHaveClass('-translate-y-full');
			expect(main).toHaveClass('pt-2', 'pb-2', 'px-3');
		});

		await fireEvent.input(input, { target: { value: 'G' } });
		await fireEvent.input(input, { target: { value: 'Go' } });

		expect(await screen.findByText('Passage Complete')).toBeInTheDocument();

		await waitFor(() => {
			expect(header).toHaveClass('translate-y-0');
			expect(header).toHaveAttribute('data-collapsed', 'false');
			expect(main).toHaveClass('pt-20', 'pb-6', 'px-6');
			expect(main).not.toHaveClass('pt-2', 'pb-2', 'px-3');
		});
	});

	it('does not activate compact mode when typing input focuses on desktop viewports', async () => {
		viewportLayout.setViewportDimensions(1024, 768);

		const { container } = render(GuestPage);

		const header = screen.getByRole('banner');
		const main = container.querySelector('main') as HTMLElement;

		expect(header).toHaveClass('translate-y-0');
		expect(main).toHaveClass('pt-20', 'pb-6', 'px-6');
		expect(main).not.toHaveClass('pt-2', 'pb-2', 'px-3');
	});

	it('dynamically updates typing container height style when visual viewport changes', async () => {
		viewportLayout.setViewportDimensions(375, 667);

		const { container } = render(GuestPage);
		const rootWrapper = container.firstElementChild as HTMLElement;

		// Initial viewport height
		expect(rootWrapper).toHaveClass('h-[100dvh]');
		expect(rootWrapper.getAttribute('style')).toContain('667px');

		// Virtual keyboard opens, shrinking visual viewport to 360px
		viewportLayout.setViewportDimensions(375, 360);

		await waitFor(() => {
			expect(rootWrapper.getAttribute('style')).toContain('360px');
		});
	});

	it('updates active interface settings dynamically when incoming real-time settings change', async () => {
		await saveGuestSettings({
			mode: 'passage',
			duration: 60
		});

		render(GuestPage);

		// Initially passage mode
		expect(screen.getByRole('button', { name: /^passage$/i })).toHaveClass('bg-secondary');

		// Remote update changes to timed mode 15s
		await saveGuestSettings({
			mode: 'timed',
			duration: 15
		});

		(syncController as any).notifyDataChange({
			type: 'settings',
			data: { mode: 'timed', duration: 15 }
		});

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /^timed$/i })).toHaveClass('bg-secondary');
			expect(screen.getByRole('button', { name: '15s' })).toHaveClass('bg-secondary');
		});
	});
});
