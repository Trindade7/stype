/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/svelte';
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
	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
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
});
