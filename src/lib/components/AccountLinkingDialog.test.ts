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

	it('renders tabs for logging in and registering new accounts', () => {
		render(AccountLinkingDialog, { open: true });

		const loginTab = screen.getByRole('tab', { name: /log in|sign in/i });
		const registerTab = screen.getByRole('tab', { name: /register|create account/i });

		expect(loginTab).toBeInTheDocument();
		expect(registerTab).toBeInTheDocument();
	});

	it('defaults server URL to website origin when visiting on a PocketBase host', async () => {
		const origin = window.location.origin;
		global.fetch = vi.fn().mockImplementation(async (url: string) => {
			if (url === `${origin}/api/health`) {
				return new Response(JSON.stringify({ code: 200, message: 'API is healthy.', data: {} }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				});
			}
			return new Response('Not found', { status: 404 });
		});

		render(AccountLinkingDialog, { open: true });

		await waitFor(() => {
			const urlInput = screen.getByLabelText(/server url/i) as HTMLInputElement;
			expect(urlInput.value).toBe(origin);
		});
	});

	it('switches to register tab and renders registration fields', async () => {
		render(AccountLinkingDialog, { open: true });

		const registerTab = screen.getByRole('tab', { name: /register|create account/i });
		await fireEvent.click(registerTab);

		expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /register|create account/i })).toBeInTheDocument();
	});

	it('registers account successfully and calls syncController.registerAccount', async () => {
		const registerSpy = vi.spyOn(syncController, 'registerAccount').mockResolvedValue({
			serverUrl: 'http://localhost:8090',
			token: 'pb-token-new',
			user: { id: 'u-reg', username: 'speedy' },
			lastSyncedAt: null,
			backend: 'pocketbase'
		});

		render(AccountLinkingDialog, { open: true });

		const registerTab = screen.getByRole('tab', { name: /register|create account/i });
		await fireEvent.click(registerTab);

		const urlInput = screen.getByLabelText(/server url/i);
		const usernameInput = screen.getByLabelText(/username/i);
		const emailInput = screen.getByLabelText(/email/i);
		const passwordInput = screen.getByLabelText(/^password/i);
		const confirmInput = screen.getByLabelText(/confirm password/i);
		const submitBtn = screen.getByRole('button', { name: /register|create account/i });

		await fireEvent.input(urlInput, { target: { value: 'http://localhost:8090' } });
		await fireEvent.input(usernameInput, { target: { value: 'speedy' } });
		await fireEvent.input(emailInput, { target: { value: 'speedy@stype.io' } });
		await fireEvent.input(passwordInput, { target: { value: 'password123' } });
		await fireEvent.input(confirmInput, { target: { value: 'password123' } });

		await fireEvent.click(submitBtn);

		expect(registerSpy).toHaveBeenCalledWith('http://localhost:8090', {
			username: 'speedy',
			password: 'password123',
			email: 'speedy@stype.io',
			name: undefined
		});
	});

	it('validates matching passwords on registration without submitting or closing modal', async () => {
		const registerSpy = vi.spyOn(syncController, 'registerAccount');

		render(AccountLinkingDialog, { open: true });

		const registerTab = screen.getByRole('tab', { name: /register|create account/i });
		await fireEvent.click(registerTab);

		const urlInput = screen.getByLabelText(/server url/i);
		const usernameInput = screen.getByLabelText(/username/i);
		const passwordInput = screen.getByLabelText(/^password/i);
		const confirmInput = screen.getByLabelText(/confirm password/i);
		const submitBtn = screen.getByRole('button', { name: /register|create account/i });

		await fireEvent.input(urlInput, { target: { value: 'http://localhost:8090' } });
		await fireEvent.input(usernameInput, { target: { value: 'speedy' } });
		await fireEvent.input(passwordInput, { target: { value: 'password123' } });
		await fireEvent.input(confirmInput, { target: { value: 'mismatchpass' } });

		await fireEvent.click(submitBtn);

		expect(registerSpy).not.toHaveBeenCalled();
		expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
	});

	it('validates minimum password length on registration', async () => {
		const registerSpy = vi.spyOn(syncController, 'registerAccount');

		render(AccountLinkingDialog, { open: true });

		const registerTab = screen.getByRole('tab', { name: /register|create account/i });
		await fireEvent.click(registerTab);

		const urlInput = screen.getByLabelText(/server url/i);
		const usernameInput = screen.getByLabelText(/username/i);
		const passwordInput = screen.getByLabelText(/^password/i);
		const confirmInput = screen.getByLabelText(/confirm password/i);
		const submitBtn = screen.getByRole('button', { name: /register|create account/i });

		await fireEvent.input(urlInput, { target: { value: 'http://localhost:8090' } });
		await fireEvent.input(usernameInput, { target: { value: 'speedy' } });
		await fireEvent.input(passwordInput, { target: { value: 'short' } });
		await fireEvent.input(confirmInput, { target: { value: 'short' } });

		await fireEvent.click(submitBtn);

		expect(registerSpy).not.toHaveBeenCalled();
		expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
	});

	it('displays server rejection error on registration without closing modal', async () => {
		vi.spyOn(syncController, 'registerAccount').mockRejectedValue(
			new Error('username: The username is already in use.')
		);

		render(AccountLinkingDialog, { open: true });

		const registerTab = screen.getByRole('tab', { name: /register|create account/i });
		await fireEvent.click(registerTab);

		const urlInput = screen.getByLabelText(/server url/i);
		const usernameInput = screen.getByLabelText(/username/i);
		const passwordInput = screen.getByLabelText(/^password/i);
		const confirmInput = screen.getByLabelText(/confirm password/i);
		const submitBtn = screen.getByRole('button', { name: /register|create account/i });

		await fireEvent.input(urlInput, { target: { value: 'http://localhost:8090' } });
		await fireEvent.input(usernameInput, { target: { value: 'takenuser' } });
		await fireEvent.input(passwordInput, { target: { value: 'password123' } });
		await fireEvent.input(confirmInput, { target: { value: 'password123' } });

		await fireEvent.click(submitBtn);

		await waitFor(() => {
			expect(screen.getByText(/username: the username is already in use/i)).toBeInTheDocument();
		});
	});
});
