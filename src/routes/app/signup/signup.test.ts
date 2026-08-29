/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/svelte';
import { localStore } from '$lib/localStore';
import { setAdapter, resetMigrationStatus } from '$lib/storage';
import SignupPage from './+page.svelte';

vi.mock('$app/forms', () => {
	return {
		enhance: (node: HTMLFormElement, submitFunction: any) => {
			node.addEventListener('submit', async (e) => {
				e.preventDefault();
				if (submitFunction) {
					const cb = submitFunction();
					await cb({ result: { type: 'redirect' }, update: async () => {} });
				}
			});
			return {
				destroy() {}
			};
		}
	};
});

describe('Signup View Contract', () => {
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
	});

	afterEach(async () => {
		cleanup();
		vi.clearAllMocks();
		await localStore.clearGuestData();
	});

	it('renders name, username, email, and password fields and submit button', () => {
		render(SignupPage, { form: null });

		expect(screen.getByLabelText(/^name/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/^username/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /create account|sign up/i })).toBeInTheDocument();
	});

	it('renders inputs with required attributes and correct types', () => {
		render(SignupPage, { form: null });

		const nameInput = screen.getByLabelText(/^name/i);
		expect(nameInput).toBeRequired();
		expect(nameInput).toHaveAttribute('type', 'text');
		expect(nameInput).toHaveAttribute('autocomplete', 'name');

		const usernameInput = screen.getByLabelText(/^username/i);
		expect(usernameInput).toBeRequired();
		expect(usernameInput).toHaveAttribute('type', 'text');
		expect(usernameInput).toHaveAttribute('autocomplete', 'username');

		const emailInput = screen.getByLabelText(/^email/i);
		expect(emailInput).toBeRequired();
		expect(emailInput).toHaveAttribute('type', 'email');
		expect(emailInput).toHaveAttribute('autocomplete', 'email');

		const passwordInput = screen.getByLabelText(/^password/i);
		expect(passwordInput).toBeRequired();
		expect(passwordInput).toHaveAttribute('type', 'password');
		expect(passwordInput).toHaveAttribute('autocomplete', 'new-password');
	});

	it('renders submit button inside a POST form', () => {
		render(SignupPage, { form: null });

		const submitButton = screen.getByRole('button', { name: /create account|sign up/i });
		expect(submitButton).toHaveAttribute('type', 'submit');

		const formElement = submitButton.closest('form');
		expect(formElement).toBeInTheDocument();
		expect(formElement).toHaveAttribute('method', 'POST');
	});

	it('renders a link to navigate back to /app/login', () => {
		render(SignupPage, { form: null });

		const loginLink = screen.getByRole('link', { name: /log in/i });
		expect(loginLink).toBeInTheDocument();
		expect(loginLink).toHaveAttribute('href', '/app/login');
	});

	it('displays error banner when form has message', () => {
		const errorMessage = 'Username is already taken';
		render(SignupPage, {
			form: {
				message: errorMessage,
				name: 'Test Typist',
				username: 'taken_user',
				email: 'test@example.com'
			}
		});

		expect(screen.getByText(errorMessage)).toBeInTheDocument();
	});

	it('retains previously entered name, username, and email on validation error but leaves password empty', () => {
		render(SignupPage, {
			form: {
				message: 'Password must be at least 8 characters',
				name: 'Typist One',
				username: 'typist1',
				email: 'typist1@example.com'
			}
		});

		const nameInput = screen.getByLabelText(/^name/i) as HTMLInputElement;
		const usernameInput = screen.getByLabelText(/^username/i) as HTMLInputElement;
		const emailInput = screen.getByLabelText(/^email/i) as HTMLInputElement;
		const passwordInput = screen.getByLabelText(/^password/i) as HTMLInputElement;

		expect(nameInput.value).toBe('Typist One');
		expect(usernameInput.value).toBe('typist1');
		expect(emailInput.value).toBe('typist1@example.com');
		expect(passwordInput.value).toBe('');
	});

	it('clears password field when form returns with an error after typing', async () => {
		const { rerender } = render(SignupPage, { form: null });

		const passwordInput = screen.getByLabelText(/^password/i) as HTMLInputElement;
		await fireEvent.input(passwordInput, { target: { value: 'typedpassword' } });
		expect(passwordInput.value).toBe('typedpassword');

		await rerender({
			form: {
				message: 'Username is already taken',
				name: 'Typist One',
				username: 'taken_username',
				email: 'typist1@example.com'
			}
		});

		expect(passwordInput.value).toBe('');
	});

	it('syncs guest data to /app/api/sync on successful registration when there is guest data', async () => {
		global.fetch = vi.fn().mockResolvedValue({ ok: true });
		await localStore.saveCustomPassage({ text: 'guest registration custom passage' });
		await localStore.saveTestRun({
			wpm: 75,
			accuracy: 98,
			correctChars: 196,
			incorrectChars: 4,
			extraChars: 0,
			missedChars: 0,
			timeElapsed: 30,
			duration: 30,
			passageId: 1,
			mode: 'passage',
			timelineSnapshots: []
		});

		render(SignupPage, { form: null });

		const form = screen.getByRole('button', { name: /create account|sign up/i }).closest('form')!;
		await fireEvent.submit(form);

		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith(
				'/app/api/sync',
				expect.objectContaining({
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: expect.stringContaining('guest registration custom passage')
				})
			);
		});

		// Local guest data cleared after successful sync
		await waitFor(async () => {
			const guestData = await localStore.getGuestData();
			expect(guestData.customPassages.length).toBe(0);
			expect(guestData.testRuns.length).toBe(0);
		});
	});

	it('does not sync guest data on registration if there are no test runs or custom passages', async () => {
		global.fetch = vi.fn().mockResolvedValue({ ok: true });
		await localStore.clearGuestData();

		render(SignupPage, { form: null });

		const form = screen.getByRole('button', { name: /create account|sign up/i }).closest('form')!;
		await fireEvent.submit(form);

		expect(global.fetch).not.toHaveBeenCalled();
	});
});
