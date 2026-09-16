/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/svelte';
import GuestSettingsPage from './+page.svelte';
import { localStore, saveGuestSettings, getGuestSettings, DEFAULT_GUEST_SETTINGS } from '$lib/localStore';
import { setAdapter, resetMigrationStatus } from '$lib/storage';
import { syncController } from '$lib/sync';

describe('Guest Settings Route (/settings/+page.svelte)', () => {
	beforeEach(async () => {
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
		cleanup();
	});

	it('renders header with navigation links and settings page heading', () => {
		render(GuestSettingsPage);

		// Brand & Navigation
		expect(screen.getByText('stype')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /history/i })).toHaveAttribute('href', '/history');
		expect(screen.getByRole('link', { name: /stats/i })).toHaveAttribute('href', '/stats');
		expect(screen.getByRole('link', { name: /passages/i })).toHaveAttribute('href', '/passages');
		expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings');
		expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute('href', '/app/login');

		// Page Heading
		expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
		expect(
			screen.getByText(/Configure your default typing test environment and preferences/i)
		).toBeInTheDocument();
	});

	it('renders settings form with default guest values', async () => {
		render(GuestSettingsPage);

		expect(await screen.findByLabelText(/passage mode/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/timed mode/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/zen mode/i)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /scroll mode/i })).toHaveTextContent('Centered (Default)');
		expect(screen.getByRole('button', { name: /save settings/i })).toBeInTheDocument();
	});

	it('renders settings form with pre-configured guest settings from localStore', async () => {
		await saveGuestSettings({
			mode: 'timed',
			duration: 60,
			passageLength: 'short',
			zenMode: true,
			theme: 'dark',
			scrollMode: 'step'
		});

		render(GuestSettingsPage);

		await waitFor(() => {
			const timedRadio = screen.getByRole('radio', { name: /timed mode/i });
			expect(timedRadio).toHaveAttribute('aria-checked', 'true');

			const zenSwitch = screen.getByRole('switch', { name: /zen mode/i });
			expect(zenSwitch).toHaveAttribute('aria-checked', 'true');

			expect(screen.getByRole('button', { name: /scroll mode/i })).toHaveTextContent('Step Scroll');
		});
	});

	it('saves modified settings to localStore and shows success notification on submit', async () => {
		render(GuestSettingsPage);

		const timedRadio = await screen.findByLabelText(/timed mode/i);
		await fireEvent.click(timedRadio);

		const zenCheckbox = screen.getByLabelText(/zen mode/i);
		await fireEvent.click(zenCheckbox);

		const saveButton = screen.getByRole('button', { name: /save settings/i });
		await fireEvent.click(saveButton);

		// Success message is displayed
		expect(await screen.findByText(/settings saved successfully/i)).toBeInTheDocument();

		// localStore is updated
		const stored = await getGuestSettings();
		expect(stored.mode).toBe('timed');
		expect(stored.zenMode).toBe(true);
		expect(stored.scrollMode).toBe('center');
	});

	it('shows clean loading indicator while settings load from localStore', () => {
		vi.spyOn(localStore, 'getSettings').mockReturnValue(new Promise(() => {}));

		render(GuestSettingsPage);

		expect(screen.getByTestId('settings-loading')).toBeInTheDocument();
		expect(screen.getByText(/loading settings/i)).toBeInTheDocument();
	});

	it('updates settings form dynamically when real-time settings update is received without page reload', async () => {
		render(GuestSettingsPage);

		const passageRadio = await screen.findByRole('radio', { name: /passage mode/i });
		expect(passageRadio).toHaveAttribute('aria-checked', 'true');

		// Live sync receives newer remote settings
		await saveGuestSettings({
			mode: 'timed',
			duration: 15,
			zenMode: true,
			theme: 'dark',
			scrollMode: 'step',
			updatedAt: '2026-03-01T12:00:00.000Z'
		});

		(syncController as any).notifyDataChange({
			type: 'settings',
			data: { mode: 'timed', zenMode: true }
		});

		await waitFor(() => {
			const timedRadio = screen.getByRole('radio', { name: /timed mode/i });
			expect(timedRadio).toHaveAttribute('aria-checked', 'true');
			const zenSwitch = screen.getByRole('switch', { name: /zen mode/i });
			expect(zenSwitch).toHaveAttribute('aria-checked', 'true');
		});
	});
});
