/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/svelte';
import LoginPage from './+page.svelte';
import { localStore } from '$lib/localStore';
import { setAdapter, resetMigrationStatus } from '$lib/storage';

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

describe('Login View Contract', () => {
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

	it('renders username and password fields', () => {
		render(LoginPage, { form: null });
		
		expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
	});

	it('indicates that either username or email is accepted in input label and placeholder', () => {
		render(LoginPage, { form: null });

		const inputByLabel = screen.getByLabelText(/username or email/i);
		expect(inputByLabel).toBeInTheDocument();

		const inputByPlaceholder = screen.getByPlaceholderText(/username or email/i);
		expect(inputByPlaceholder).toBeInTheDocument();
		expect(inputByLabel).toBe(inputByPlaceholder);
	});

	it('shows error banner when form has message', () => {
		const errorMessage = 'Invalid credentials provided';
		render(LoginPage, { form: { message: errorMessage, username: '' } });
		
		expect(screen.getByText(errorMessage)).toBeInTheDocument();
	});

	it('preserves username when returning with an error', () => {
		const username = 'testuser';
		render(LoginPage, { form: { message: 'Error', username } });
		
		const input = screen.getByLabelText(/username/i) as HTMLInputElement;
		expect(input.value).toBe(username);
	});

	it('does not render error banner when there is no error message', () => {
		render(LoginPage, { form: null });
		expect(screen.queryByText(/invalid/i)).not.toBeInTheDocument();
	});

	it('renders inputs with required attributes and correct autocomplete settings', () => {
		render(LoginPage, { form: null });

		const usernameInput = screen.getByLabelText(/username/i);
		expect(usernameInput).toBeRequired();
		expect(usernameInput).toHaveAttribute('type', 'text');
		expect(usernameInput).toHaveAttribute('autocomplete', 'username');

		const passwordInput = screen.getByLabelText(/password/i);
		expect(passwordInput).toBeRequired();
		expect(passwordInput).toHaveAttribute('type', 'password');
		expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
	});

	it('renders a link to navigate to /app/signup', () => {
		render(LoginPage, { form: null });

		const signupLink = screen.getByRole('link', { name: /sign up/i });
		expect(signupLink).toBeInTheDocument();
		expect(signupLink).toHaveAttribute('href', '/app/signup');
	});

	it('renders a "Forgot password?" link aligned with the password label navigating to /app/forgot-password', () => {
		render(LoginPage, { form: null });

		const forgotPasswordLink = screen.getByRole('link', { name: /forgot password\?/i });
		expect(forgotPasswordLink).toBeInTheDocument();
		expect(forgotPasswordLink).toHaveAttribute('href', '/app/forgot-password');

		const passwordLabel = screen.getByText(/^password$/i);
		expect(passwordLabel).toBeInTheDocument();

		// Both the label and the link share the same container header for alignment
		const commonContainer = passwordLabel.parentElement;
		expect(commonContainer).toContainElement(forgotPasswordLink);
		expect(commonContainer?.className).toMatch(/flex.*items-center.*justify-between/);
	});

	it('renders submit button with submit type inside POST form', () => {
		render(LoginPage, { form: null });

		const submitButton = screen.getByRole('button', { name: /log in/i });
		expect(submitButton).toHaveAttribute('type', 'submit');

		const formElement = submitButton.closest('form');
		expect(formElement).toBeInTheDocument();
		expect(formElement).toHaveAttribute('method', 'POST');
	});

	it('renders default seeded account credentials hint', () => {
		render(LoginPage, { form: null });
		expect(screen.getByText(/default seeded account/i)).toBeInTheDocument();
		expect(screen.getByText('admin123')).toBeInTheDocument();
	});

	it('renders a visual divider with "or continue without an account" separating form from guest flow', () => {
		render(LoginPage, { form: null });

		const dividerText = screen.getByText(/or continue without an account/i);
		expect(dividerText).toBeInTheDocument();

		const form = screen.getByRole('button', { name: /log in/i }).closest('form');
		const guestButton = screen.getByRole('link', { name: /continue as guest/i });

		expect(form).toBeInTheDocument();
		expect(guestButton).toBeInTheDocument();

		expect(form!.compareDocumentPosition(dividerText) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(dividerText.compareDocumentPosition(guestButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it('renders Continue as Guest as a full-width secondary action with an icon', () => {
		render(LoginPage, { form: null });

		const guestButton = screen.getByRole('link', { name: /continue as guest/i });
		expect(guestButton).toBeInTheDocument();
		expect(guestButton).toHaveAttribute('href', '/');
		expect(guestButton).toHaveAttribute('data-slot', 'button');
		expect(guestButton.className).toContain('w-full');
		expect(guestButton.className).toContain('bg-secondary');

		const svgIcon = guestButton.querySelector('svg');
		expect(svgIcon).toBeInTheDocument();
	});

	it('renders an explanatory caption under the guest action explaining local storage', () => {
		render(LoginPage, { form: null });

		const guestButton = screen.getByRole('link', { name: /continue as guest/i });
		const caption = screen.getByText(/saved locally in the browser/i);
		expect(caption).toBeInTheDocument();

		expect(guestButton.compareDocumentPosition(caption) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it('renders clean chips for default seeded credentials and quick-fills fields on click', async () => {
		render(LoginPage, { form: null });

		const adminChip = screen.getByRole('button', { name: 'admin' });
		const passwordChip = screen.getByRole('button', { name: 'admin123' });

		expect(adminChip).toBeInTheDocument();
		expect(passwordChip).toBeInTheDocument();

		const usernameInput = screen.getByLabelText(/username/i) as HTMLInputElement;
		const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;

		expect(usernameInput.value).toBe('');
		expect(passwordInput.value).toBe('');

		await fireEvent.click(adminChip);
		expect(usernameInput.value).toBe('admin');
		expect(passwordInput.value).toBe('admin123');

		await fireEvent.input(usernameInput, { target: { value: '' } });
		await fireEvent.input(passwordInput, { target: { value: '' } });
		expect(usernameInput.value).toBe('');
		expect(passwordInput.value).toBe('');

		await fireEvent.click(passwordChip);
		expect(usernameInput.value).toBe('admin');
		expect(passwordInput.value).toBe('admin123');
	});

	it('submitting form after clicking quick-fill uses the populated credentials', async () => {
		global.fetch = vi.fn().mockResolvedValue({ ok: true });
		await localStore.saveCustomPassage({ text: 'mock passage' });

		render(LoginPage, { form: null });

		const adminChip = screen.getByRole('button', { name: 'admin' });
		await fireEvent.click(adminChip);

		const usernameInput = screen.getByLabelText(/username/i) as HTMLInputElement;
		const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
		expect(usernameInput.value).toBe('admin');
		expect(passwordInput.value).toBe('admin123');

		const form = screen.getByRole('button', { name: /log in/i }).closest('form')!;
		await fireEvent.submit(form);

		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith('/app/api/sync', expect.anything());
		});
	});

	it('syncs guest data to /app/api/sync on successful login when there is meaningful data', async () => {
		global.fetch = vi.fn().mockResolvedValue({ ok: true });
		
		// Setup some guest data
		await localStore.saveCustomPassage({ text: 'mock passage' });
		
		render(LoginPage, { form: null });
		
		const form = screen.getByRole('button', { name: /log in/i }).closest('form')!;
		await fireEvent.submit(form);
		
		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith('/app/api/sync', expect.objectContaining({
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: expect.stringContaining('mock passage')
			}));
		});
		
		// Data should be cleared after sync
		await waitFor(async () => {
			const data = await localStore.getGuestData();
			expect(data.customPassages.length).toBe(0);
		});
	});

	it('does not sync guest data if there are no test runs or custom passages', async () => {
		global.fetch = vi.fn().mockResolvedValue({ ok: true });
		
		// clear guest data
		await localStore.clearGuestData();
		
		render(LoginPage, { form: null });
		
		const form = screen.getByRole('button', { name: /log in/i }).closest('form')!;
		await fireEvent.submit(form);
		
		expect(global.fetch).not.toHaveBeenCalled();
	});
});
