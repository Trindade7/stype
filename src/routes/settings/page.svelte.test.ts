/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/svelte';
import GuestSettingsPage from './+page.svelte';
import { localStore, saveGuestSettings, getGuestSettings, DEFAULT_GUEST_SETTINGS } from '$lib/localStore';

describe('Guest Settings Route (/settings/+page.svelte)', () => {
	beforeEach(() => {
		localStorage.clear();
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

	it('renders settings form with default guest values', () => {
		render(GuestSettingsPage);

		expect(screen.getByLabelText(/passage mode/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/timed mode/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/zen mode/i)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /save settings/i })).toBeInTheDocument();
	});

	it('renders settings form with pre-configured guest settings from localStore', () => {
		saveGuestSettings({
			mode: 'timed',
			duration: 60,
			passageLength: 'short',
			zenMode: true,
			theme: 'dark'
		});

		render(GuestSettingsPage);

		const timedRadio = screen.getByLabelText(/timed mode/i) as HTMLInputElement;
		expect(timedRadio.checked).toBe(true);

		const zenCheckbox = screen.getByLabelText(/zen mode/i) as HTMLInputElement;
		expect(zenCheckbox.checked).toBe(true);
	});

	it('saves modified settings to localStore and shows success notification on submit', async () => {
		render(GuestSettingsPage);

		const timedRadio = screen.getByLabelText(/timed mode/i);
		await fireEvent.click(timedRadio);

		const zenCheckbox = screen.getByLabelText(/zen mode/i);
		await fireEvent.click(zenCheckbox);

		const saveButton = screen.getByRole('button', { name: /save settings/i });
		await fireEvent.click(saveButton);

		// Success message is displayed
		expect(await screen.findByText(/settings saved successfully/i)).toBeInTheDocument();

		// localStore is updated
		const stored = getGuestSettings();
		expect(stored.mode).toBe('timed');
		expect(stored.zenMode).toBe(true);
	});
});
