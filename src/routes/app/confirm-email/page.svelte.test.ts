/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import ConfirmEmailPage from './+page.svelte';

describe('Confirm Email Page View Contract', () => {
	afterEach(() => {
		cleanup();
	});

	it('renders descriptive error state when token is invalid or expired with an option to request a new token', () => {
		render(ConfirmEmailPage, {
			data: {
				valid: false,
				error: 'This email confirmation link is invalid or has expired. Please request a new confirmation email.'
			} as any
		});

		// Title and card heading
		expect(screen.getByText('stype')).toBeInTheDocument();
		expect(screen.getByText('Confirmation failed')).toBeInTheDocument();
		expect(screen.getByText('Invalid or Expired Link')).toBeInTheDocument();

		// Error message
		expect(
			screen.getByText(/this email confirmation link is invalid or has expired/i)
		).toBeInTheDocument();

		// Option to request a new token / verification link
		const requestNewLink = screen.getByRole('link', { name: /request a new confirmation email|request new link|go to verification/i });
		expect(requestNewLink).toBeInTheDocument();
		expect(requestNewLink).toHaveAttribute('href', '/app/verify-email');

		// Back to login link
		const loginLink = screen.getByRole('link', { name: /log in|sign in/i });
		expect(loginLink).toBeInTheDocument();
		expect(loginLink).toHaveAttribute('href', '/app/login');
	});
});
