/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import ForgotPasswordPage from './+page.svelte';

describe('Forgot Password Page View Contract', () => {
	afterEach(() => {
		cleanup();
	});

	it('renders username or email input and submit button', () => {
		render(ForgotPasswordPage, { form: null });

		const input = screen.getByLabelText(/username or email/i);
		expect(input).toBeInTheDocument();

		const submitButton = screen.getByRole('button', { name: /send reset link/i });
		expect(submitButton).toBeInTheDocument();
		expect(submitButton).toHaveAttribute('type', 'submit');
	});

	it('indicates that username or email is accepted in input placeholder', () => {
		render(ForgotPasswordPage, { form: null });

		const input = screen.getByPlaceholderText(/username or email/i);
		expect(input).toBeInTheDocument();
	});

	it('renders input with required attribute and appropriate autocomplete', () => {
		render(ForgotPasswordPage, { form: null });

		const input = screen.getByLabelText(/username or email/i);
		expect(input).toBeRequired();
		expect(input).toHaveAttribute('type', 'text');
		expect(input).toHaveAttribute('autocomplete', 'username');
	});

	it('renders a link to navigate back to /app/login', () => {
		render(ForgotPasswordPage, { form: null });

		const loginLink = screen.getByRole('link', { name: /back to login|log in/i });
		expect(loginLink).toBeInTheDocument();
		expect(loginLink).toHaveAttribute('href', '/app/login');
	});

	it('displays generic confirmation banner when submission succeeds', () => {
		const successMessage = 'If an account matches that username or email, a password reset link has been sent.';
		render(ForgotPasswordPage, {
			form: {
				success: true,
				message: successMessage
			}
		});

		expect(screen.getByText(successMessage)).toBeInTheDocument();
		expect(screen.queryByText(/invalid/i)).not.toBeInTheDocument();
	});

	it('displays error alert when submission fails', () => {
		const errorMessage = 'Username or email is required';
		render(ForgotPasswordPage, {
			form: {
				message: errorMessage,
				identifier: ''
			}
		});

		expect(screen.getByText(errorMessage)).toBeInTheDocument();
	});

	it('preserves entered identifier when returning with an error', () => {
		render(ForgotPasswordPage, {
			form: {
				message: 'Some error',
				identifier: 'typeduser'
			}
		});

		const input = screen.getByLabelText(/username or email/i) as HTMLInputElement;
		expect(input.value).toBe('typeduser');
	});
});
