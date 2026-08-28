/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import VerifyEmailPage from './+page.svelte';

describe('Verify Email Page View Contract', () => {
	afterEach(() => {
		cleanup();
	});

	it('displays the recipient email address, instructions, resend button, and logout button', () => {
		render(VerifyEmailPage, {
			data: {
				email: 'pending_typist@example.com'
			} as any,
			form: null
		});

		// Header / Title
		expect(screen.getByText('stype')).toBeInTheDocument();
		expect(screen.getByText(/verify your email/i)).toBeInTheDocument();

		// Recipient email displayed
		expect(screen.getByText('pending_typist@example.com')).toBeInTheDocument();

		// Resend confirmation link button
		const resendButton = screen.getByRole('button', { name: /resend confirmation email/i });
		expect(resendButton).toBeInTheDocument();

		// Logout button
		const logoutButton = screen.getByRole('button', { name: /log out/i });
		expect(logoutButton).toBeInTheDocument();
	});

	it('renders success feedback when confirmation email was resent', () => {
		render(VerifyEmailPage, {
			data: {
				email: 'pending_typist@example.com'
			} as any,
			form: {
				success: true,
				message: 'A new confirmation link has been sent to pending_typist@example.com.'
			} as any
		});

		expect(
			screen.getByText(/a new confirmation link has been sent to pending_typist@example.com/i)
		).toBeInTheDocument();
	});

	it('renders error feedback when resending fails', () => {
		render(VerifyEmailPage, {
			data: {
				email: 'pending_typist@example.com'
			} as any,
			form: {
				success: false,
				message: 'Failed to send confirmation email. Please try again.'
			} as any
		});

		expect(
			screen.getByText(/failed to send confirmation email/i)
		).toBeInTheDocument();
	});
});
