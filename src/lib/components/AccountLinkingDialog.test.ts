/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/svelte';
import AccountLinkingDialog from './AccountLinkingDialog.svelte';
import { syncController } from '$lib/sync';
import { MemoryStoreAdapter } from '$lib/storage/memory';

describe('AccountLinkingDialog Component', () => {
	let memoryAdapter: MemoryStoreAdapter;

	beforeEach(() => {
		memoryAdapter = new MemoryStoreAdapter();
		(syncController as any).adapter = memoryAdapter;
		(syncController as any).stateStore.set({
			status: 'idle',
			account: null,
			lastSyncedAt: null,
			lastError: null
		});
		vi.restoreAllMocks();
	});

	afterEach(async () => {
		cleanup();
		// Wait for bits-ui body-scroll-lock 24ms cleanup timer to complete before teardown
		await new Promise((resolve) => setTimeout(resolve, 50));
	});

	it('renders linking form fields when not linked', () => {
		render(AccountLinkingDialog, { open: true });

		expect(screen.getByLabelText(/server url/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/username or email/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /link account|sign in/i })).toBeInTheDocument();
	});

	it('links account successfully and calls syncController.linkAccount', async () => {
		const linkSpy = vi.spyOn(syncController, 'linkAccount').mockResolvedValue({
			serverUrl: 'https://stype.io',
			token: 'token-xyz',
			user: { id: 'u-1', username: 'protypist' },
			lastSyncedAt: null
		});

		render(AccountLinkingDialog, { open: true });

		const urlInput = screen.getByLabelText(/server url/i);
		const idInput = screen.getByLabelText(/username or email/i);
		const passInput = screen.getByLabelText(/password/i);
		const submitBtn = screen.getByRole('button', { name: /link account|sign in/i });

		await fireEvent.input(urlInput, { target: { value: 'https://stype.io' } });
		await fireEvent.input(idInput, { target: { value: 'protypist' } });
		await fireEvent.input(passInput, { target: { value: 'secretpass' } });

		await fireEvent.click(submitBtn);

		expect(linkSpy).toHaveBeenCalledWith('https://stype.io', 'protypist', 'secretpass');
	});

	it('displays error message when linking fails', async () => {
		vi.spyOn(syncController, 'linkAccount').mockRejectedValue(new Error('Invalid username or password'));

		render(AccountLinkingDialog, { open: true });

		const urlInput = screen.getByLabelText(/server url/i);
		const idInput = screen.getByLabelText(/username or email/i);
		const passInput = screen.getByLabelText(/password/i);
		const submitBtn = screen.getByRole('button', { name: /link account|sign in/i });

		await fireEvent.input(urlInput, { target: { value: 'https://stype.io' } });
		await fireEvent.input(idInput, { target: { value: 'wronguser' } });
		await fireEvent.input(passInput, { target: { value: 'wrongpass' } });

		await fireEvent.click(submitBtn);

		await waitFor(() => {
			expect(screen.getByText(/invalid username or password/i)).toBeInTheDocument();
		});
	});

	it('renders linked account status and allows sync and unlink when already linked', async () => {
		(syncController as any).stateStore.set({
			status: 'idle',
			account: {
				serverUrl: 'https://my-server.com',
				token: 'token-123',
				user: { id: 'u-1', username: 'alice' },
				lastSyncedAt: '2026-02-01T12:00:00.000Z'
			},
			lastSyncedAt: '2026-02-01T12:00:00.000Z',
			lastError: null
		});

		const syncSpy = vi.spyOn(syncController, 'sync').mockResolvedValue({ success: true });
		const unlinkSpy = vi.spyOn(syncController, 'unlinkAccount').mockResolvedValue();

		render(AccountLinkingDialog, { open: true });

		expect(screen.getByText(/linked to/i)).toBeInTheDocument();
		expect(screen.getByText(/https:\/\/my-server\.com/i)).toBeInTheDocument();
		expect(screen.getByText(/alice/i)).toBeInTheDocument();

		const syncBtn = screen.getByRole('button', { name: /sync now/i });
		const unlinkBtn = screen.getByRole('button', { name: /unlink/i });

		await fireEvent.click(syncBtn);
		expect(syncSpy).toHaveBeenCalled();

		await fireEvent.click(unlinkBtn);
		expect(unlinkSpy).toHaveBeenCalled();
	});
});
