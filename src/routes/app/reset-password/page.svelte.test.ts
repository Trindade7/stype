/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import ResetPasswordPage from './+page.svelte';

describe('Reset Password Page View Contract', () => {
	afterEach(() => {
		cleanup();
	});

	describe('when token is invalid or missing', () => {
		it('renders descriptive error state and a link to request a new link', () => {
			render(ResetPasswordPage, {
				data: {
					valid: false,
					token: '',
					error: 'This password reset link is invalid or has expired. Please request a new reset link.'
				} as any,
				form: null
			});

			// Descriptive error should be visible
			expect(
				screen.getByText(/invalid or has expired|no reset token provided/i)
			).toBeInTheDocument();

			// Link to request a new reset link
			const requestNewLink = screen.getByRole('link', { name: /request.*(link|new)/i });
			expect(requestNewLink).toBeInTheDocument();
			expect(requestNewLink).toHaveAttribute('href', '/app/forgot-password');

			// Reset form inputs should NOT be shown
			expect(screen.queryByLabelText(/^new password/i)).not.toBeInTheDocument();
			expect(screen.queryByLabelText(/confirm.*password/i)).not.toBeInTheDocument();
			expect(screen.queryByRole('button', { name: /reset password/i })).not.toBeInTheDocument();
		});

		it('renders link back to login even in error state', () => {
			render(ResetPasswordPage, {
				data: {
					valid: false,
					token: '',
					error: 'No reset token provided. Please request a new password reset link.'
				} as any,
				form: null
			});

			const loginLink = screen.getByRole('link', { name: /back to login|log in/i });
			expect(loginLink).toBeInTheDocument();
			expect(loginLink).toHaveAttribute('href', '/app/login');
		});
	});

	describe('when token is valid', () => {
		const validData = {
			valid: true,
			token: 'test-valid-token-12345',
			error: undefined
		} as any;

		it('renders password and confirm password inputs, hidden token input, and submit button', () => {
			render(ResetPasswordPage, {
				data: validData,
				form: null
			});

			const passwordInput = screen.getByLabelText(/^new password/i);
			expect(passwordInput).toBeInTheDocument();
			expect(passwordInput).toHaveAttribute('type', 'password');
			expect(passwordInput).toHaveAttribute('name', 'password');
			expect(passwordInput).toBeRequired();
			expect(passwordInput).toHaveAttribute('minlength', '8');
			expect(passwordInput).toHaveAttribute('autocomplete', 'new-password');

			const confirmInput = screen.getByLabelText(/confirm.*password/i);
			expect(confirmInput).toBeInTheDocument();
			expect(confirmInput).toHaveAttribute('type', 'password');
			expect(confirmInput).toHaveAttribute('name', 'confirmPassword');
			expect(confirmInput).toBeRequired();
			expect(confirmInput).toHaveAttribute('minlength', '8');
			expect(confirmInput).toHaveAttribute('autocomplete', 'new-password');

			const submitButton = screen.getByRole('button', { name: /reset password/i });
			expect(submitButton).toBeInTheDocument();
			expect(submitButton).toHaveAttribute('type', 'submit');

			const form = submitButton.closest('form');
			expect(form).toBeInTheDocument();
			expect(form).toHaveAttribute('method', 'POST');

			const tokenInput = form?.querySelector('input[name="token"]') as HTMLInputElement;
			expect(tokenInput).toBeInTheDocument();
			expect(tokenInput.type).toBe('hidden');
			expect(tokenInput.value).toBe('test-valid-token-12345');
		});

		it('renders link back to login page', () => {
			render(ResetPasswordPage, {
				data: validData,
				form: null
			});

			const loginLink = screen.getByRole('link', { name: /back to login|log in/i });
			expect(loginLink).toBeInTheDocument();
			expect(loginLink).toHaveAttribute('href', '/app/login');
		});

		it('displays error alert when form submission returns an error', () => {
			render(ResetPasswordPage, {
				data: validData,
				form: {
					message: 'Passwords do not match',
					invalidToken: false
				}
			});

			expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
		});

		it('switches to invalid token state if submission returns invalidToken', () => {
			render(ResetPasswordPage, {
				data: validData,
				form: {
					message: 'This password reset link is invalid or has expired. Please request a new reset link.',
					invalidToken: true
				}
			});

			// Descriptive error should be visible
			expect(
				screen.getByText(/invalid or has expired/i)
			).toBeInTheDocument();

			// Link to request new reset link should appear
			const requestNewLink = screen.getByRole('link', { name: /request.*(link|new)/i });
			expect(requestNewLink).toBeInTheDocument();
			expect(requestNewLink).toHaveAttribute('href', '/app/forgot-password');
		});
	});
});
