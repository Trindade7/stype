/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/svelte';
import UserPage from './+page.svelte';

vi.mock('$app/forms', () => {
	return {
		enhance: (node: HTMLFormElement, submitFunction: any) => {
			node.addEventListener('submit', async (e) => {
				e.preventDefault();
				if (submitFunction) {
					const cb = submitFunction();
					if (typeof cb === 'function') {
						await cb({ result: { type: 'success' }, update: async () => {} });
					}
				}
			});
			return {
				destroy() {}
			};
		}
	};
});

describe('User Page View Contract', () => {
	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	const mockUser = {
		id: 'u-1',
		username: 'janedoe',
		email: 'jane@example.com',
		name: 'Jane Doe',
		createdAt: new Date()
	};

	it('renders Details and Change Password cards', () => {
		render(UserPage, {
			data: { user: mockUser, settings: null as any },
			form: null
		});

		expect(screen.getByRole('heading', { name: /^details/i })).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: /change password/i })).toBeInTheDocument();
	});

	it('displays username in a read-only field', () => {
		render(UserPage, {
			data: { user: mockUser, settings: null as any },
			form: null
		});

		const usernameInput = screen.getByLabelText(/^username/i) as HTMLInputElement;
		expect(usernameInput).toBeInTheDocument();
		expect(usernameInput.value).toBe('janedoe');
		expect(usernameInput.readOnly || usernameInput.disabled).toBe(true);
	});

	it('pre-fills Details form with current display name and email address', () => {
		render(UserPage, {
			data: { user: mockUser, settings: null as any },
			form: null
		});

		const nameInput = screen.getByLabelText(/^display name|^name/i) as HTMLInputElement;
		const emailInput = screen.getByLabelText(/^email/i) as HTMLInputElement;

		expect(nameInput.value).toBe('Jane Doe');
		expect(emailInput.value).toBe('jane@example.com');
	});

	it('renders Details submit button inside POST form pointing to ?/updateDetails', () => {
		render(UserPage, {
			data: { user: mockUser, settings: null as any },
			form: null
		});

		const saveButton = screen.getByRole('button', { name: /save details|save changes/i });
		expect(saveButton).toHaveAttribute('type', 'submit');

		const form = saveButton.closest('form');
		expect(form).toBeInTheDocument();
		expect(form).toHaveAttribute('method', 'POST');
		expect(form?.getAttribute('action')).toContain('updateDetails');
	});

	it('displays error alert in Details card when updateDetails returns error', () => {
		const errorMessage = 'Email is already registered by another user';
		render(UserPage, {
			data: { user: mockUser, settings: null as any },
			form: {
				action: 'updateDetails',
				success: false,
				message: errorMessage,
				name: 'Jane Doe',
				email: 'taken@example.com'
			}
		});

		expect(screen.getByText(errorMessage)).toBeInTheDocument();
	});

	it('displays success alert in Details card when updateDetails succeeds', () => {
		const successMessage = 'User details updated successfully';
		render(UserPage, {
			data: { user: mockUser, settings: null as any },
			form: {
				action: 'updateDetails',
				success: true,
				message: successMessage,
				name: 'Jane Doe',
				email: 'jane@example.com'
			}
		});

		expect(screen.getByText(successMessage)).toBeInTheDocument();
	});

	it('renders inputs for Current Password, New Password, and Confirm Password in Change Password card', () => {
		render(UserPage, {
			data: { user: mockUser, settings: null as any },
			form: null
		});

		const currentPasswordInput = screen.getByLabelText(/current password/i);
		const newPasswordInput = screen.getByLabelText(/^new password/i);
		const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

		expect(currentPasswordInput).toBeInTheDocument();
		expect(currentPasswordInput).toHaveAttribute('type', 'password');
		expect(currentPasswordInput).toBeRequired();

		expect(newPasswordInput).toBeInTheDocument();
		expect(newPasswordInput).toHaveAttribute('type', 'password');
		expect(newPasswordInput).toBeRequired();

		expect(confirmPasswordInput).toBeInTheDocument();
		expect(confirmPasswordInput).toHaveAttribute('type', 'password');
		expect(confirmPasswordInput).toBeRequired();
	});

	it('renders Change Password submit button inside POST form pointing to ?/updatePassword', () => {
		render(UserPage, {
			data: { user: mockUser, settings: null as any },
			form: null
		});

		const updateButton = screen.getByRole('button', { name: /update password|change password/i });
		expect(updateButton).toHaveAttribute('type', 'submit');

		const form = updateButton.closest('form');
		expect(form).toBeInTheDocument();
		expect(form).toHaveAttribute('method', 'POST');
		expect(form?.getAttribute('action')).toContain('updatePassword');
	});

	it('displays error alert in Change Password card when updatePassword returns error', () => {
		const errorMessage = 'Current password is incorrect';
		render(UserPage, {
			data: { user: mockUser, settings: null as any },
			form: {
				action: 'updatePassword',
				success: false,
				message: errorMessage
			}
		});

		expect(screen.getByText(errorMessage)).toBeInTheDocument();
	});

	it('displays success alert and clears password fields when updatePassword succeeds', () => {
		const successMessage = 'Password updated successfully';
		render(UserPage, {
			data: { user: mockUser, settings: null as any },
			form: {
				action: 'updatePassword',
				success: true,
				message: successMessage
			}
		});

		expect(screen.getByText(successMessage)).toBeInTheDocument();

		const currentPasswordInput = screen.getByLabelText(/current password/i) as HTMLInputElement;
		const newPasswordInput = screen.getByLabelText(/^new password/i) as HTMLInputElement;
		const confirmPasswordInput = screen.getByLabelText(/confirm password/i) as HTMLInputElement;

		expect(currentPasswordInput.value).toBe('');
		expect(newPasswordInput.value).toBe('');
		expect(confirmPasswordInput.value).toBe('');
	});
});
