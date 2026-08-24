/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import LoginPage from './+page.svelte';

describe('Login View Contract', () => {
	afterEach(() => {
		cleanup();
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
});
