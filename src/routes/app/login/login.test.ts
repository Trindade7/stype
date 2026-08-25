/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/svelte';
import LoginPage from './+page.svelte';
import { localStore } from '$lib/localStore';

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
	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
		localStore.clearGuestData();
	});

	it('renders username and password fields', () => {
		render(LoginPage, { form: null });
		
		expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
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

	it('syncs guest data to /app/api/sync on successful login when there is meaningful data', async () => {
		global.fetch = vi.fn().mockResolvedValue({ ok: true });
		
		// Setup some guest data
		localStore.saveCustomPassage({ text: 'mock passage' });
		
		render(LoginPage, { form: null });
		
		const form = screen.getByRole('button', { name: /log in/i }).closest('form')!;
		await fireEvent.submit(form);
		
		expect(global.fetch).toHaveBeenCalledWith('/app/api/sync', expect.objectContaining({
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: expect.stringContaining('mock passage')
		}));
		
		// Data should be cleared after sync
		const data = localStore.getGuestData();
		expect(data.customPassages.length).toBe(0);
	});

	it('does not sync guest data if there are no test runs or custom passages', async () => {
		global.fetch = vi.fn().mockResolvedValue({ ok: true });
		
		// clear guest data
		localStore.clearGuestData();
		
		render(LoginPage, { form: null });
		
		const form = screen.getByRole('button', { name: /log in/i }).closest('form')!;
		await fireEvent.submit(form);
		
		expect(global.fetch).not.toHaveBeenCalled();
	});
});
