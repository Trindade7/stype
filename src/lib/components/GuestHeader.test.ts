/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/svelte';
import GuestHeader from './GuestHeader.svelte';
import { localStore, DEFAULT_GUEST_SETTINGS } from '$lib/localStore';
import { setAdapter, resetMigrationStatus } from '$lib/storage';
import { viewportLayout } from '$lib/viewport';
import { syncController } from '$lib/sync';

describe('GuestHeader Component', () => {
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

	afterEach(async () => {
		viewportLayout.reset();
		cleanup();
		await new Promise((resolve) => setTimeout(resolve, 50));
	});

	it('renders header with brand link to home page', () => {
		render(GuestHeader);

		const brandLink = screen.getByRole('link', { name: /stype/i });
		expect(brandLink).toBeInTheDocument();
		expect(brandLink).toHaveAttribute('href', '/');
	});

	it('renders desktop navigation links with correct routes', () => {
		render(GuestHeader);

		const historyLinks = screen.getAllByRole('link', { name: /history/i });
		const statsLinks = screen.getAllByRole('link', { name: /stats/i });
		const passagesLinks = screen.getAllByRole('link', { name: /passages/i });
		const settingsLinks = screen.getAllByRole('link', { name: /settings/i });

		expect(historyLinks.some((l) => l.getAttribute('href') === '/history')).toBe(true);
		expect(statsLinks.some((l) => l.getAttribute('href') === '/stats')).toBe(true);
		expect(passagesLinks.some((l) => l.getAttribute('href') === '/passages')).toBe(true);
		expect(settingsLinks.some((l) => l.getAttribute('href') === '/settings')).toBe(true);
	});

	it('renders desktop Log in button linking to /app/login', () => {
		render(GuestHeader);

		const loginLinks = screen.getAllByRole('link', { name: /log in/i });
		expect(loginLinks.some((l) => l.getAttribute('href') === '/app/login')).toBe(true);
	});

	it('renders desktop theme switcher dropdown trigger', () => {
		render(GuestHeader);

		const themeTrigger = screen.getByRole('button', { name: /toggle theme/i });
		expect(themeTrigger).toBeInTheDocument();
	});

	it('renders mobile navigation menu button with sm:hidden class', () => {
		render(GuestHeader);

		const menuTrigger = screen.getByRole('button', { name: /toggle menu|open menu|navigation menu/i });
		expect(menuTrigger).toBeInTheDocument();
		expect(menuTrigger.className).toContain('sm:hidden');
	});

	it('opens mobile menu and displays navigation links and login link', async () => {
		render(GuestHeader);

		const menuTrigger = screen.getByRole('button', { name: /toggle menu|open menu|navigation menu/i });
		await fireEvent.click(menuTrigger);

		// History, Stats, Passages, Settings, and Log in should all be inside the open dropdown
		const historyLink = await screen.findByRole('link', { name: /history/i });
		const statsLink = screen.getByRole('link', { name: /stats/i });
		const passagesLink = screen.getByRole('link', { name: /passages/i });
		const settingsLink = screen.getByRole('link', { name: /settings/i });
		const loginLink = screen.getByRole('link', { name: /log in/i });

		expect(historyLink).toHaveAttribute('href', '/history');
		expect(statsLink).toHaveAttribute('href', '/stats');
		expect(passagesLink).toHaveAttribute('href', '/passages');
		expect(settingsLink).toHaveAttribute('href', '/settings');
		expect(loginLink).toHaveAttribute('href', '/app/login');
	});

	it('provides theme toggle in mobile menu and updates localStore and mode', async () => {
		render(GuestHeader);

		const menuTrigger = screen.getByRole('button', { name: /toggle menu|open menu|navigation menu/i });
		await fireEvent.click(menuTrigger);

		const darkOption = await screen.findByText('Dark');
		expect(darkOption).toBeInTheDocument();

		await fireEvent.click(darkOption);

		await waitFor(async () => {
			expect((await localStore.getSettings()).theme).toBe('dark');
		});
	});

	it('closes mobile menu when a navigation link is clicked', async () => {
		render(GuestHeader);

		const menuTrigger = screen.getByRole('button', { name: /toggle menu|open menu|navigation menu/i });
		await fireEvent.click(menuTrigger);

		const historyLink = await screen.findByRole('link', { name: /history/i });
		expect(historyLink).toBeInTheDocument();

		await fireEvent.click(historyLink);

		await waitFor(() => {
			expect(screen.queryByRole('menu')).not.toBeInTheDocument();
		});
	});

	it('maintains fixed positioning and centered max-width layout alignment', () => {
		render(GuestHeader);

		const header = screen.getByRole('banner');
		expect(header).toHaveClass('fixed', 'inset-x-0', 'top-0');

		const headerContainer = header.firstElementChild;
		expect(headerContainer).toHaveClass('mx-auto', 'max-w-5xl', 'px-6');
	});

	it('collapses navigation header out of view in compact typing mode and restores when inactive', async () => {
		render(GuestHeader);

		const header = screen.getByRole('banner');
		expect(header).toHaveClass('translate-y-0');
		expect(header).not.toHaveClass('-translate-y-full');
		expect(header).toHaveAttribute('data-collapsed', 'false');

		// Transition to compact mode on small viewport
		viewportLayout.setViewportDimensions(375, 667);
		viewportLayout.setTypingFocus(true);

		await waitFor(() => {
			expect(header).toHaveClass('-translate-y-full');
			expect(header).toHaveAttribute('data-collapsed', 'true');
		});

		// Blur typing input restores navigation header
		viewportLayout.setTypingFocus(false);

		await waitFor(() => {
			expect(header).toHaveClass('translate-y-0');
			expect(header).not.toHaveClass('-translate-y-full');
			expect(header).toHaveAttribute('data-collapsed', 'false');
		});
	});

	it('opens account linking dialog when clicking Link Account button', async () => {
		render(GuestHeader);

		const linkAccountBtn = screen.getByRole('button', { name: /link server account|link account/i });
		expect(linkAccountBtn).toBeInTheDocument();

		await fireEvent.click(linkAccountBtn);

		expect(await screen.findByRole('heading', { name: /link server account/i })).toBeInTheDocument();
		expect(screen.getByLabelText(/server url/i)).toBeInTheDocument();
	});

	it('updates header to display authenticated user profile and sync state when linked', async () => {
		(syncController as any).stateStore.set({
			status: 'idle',
			account: {
				serverUrl: 'http://localhost:8090',
				token: 'pb-token-header',
				user: { id: 'u-h1', username: 'fastfinger' },
				lastSyncedAt: null,
				backend: 'pocketbase'
			},
			lastSyncedAt: null,
			lastError: null
		});

		render(GuestHeader);

		expect(screen.getByText('fastfinger')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /sync/i })).toBeInTheDocument();
		expect(screen.queryByRole('link', { name: /log in/i })).not.toBeInTheDocument();
	});
});
