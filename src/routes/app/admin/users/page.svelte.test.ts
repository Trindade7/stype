/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/svelte';
import AdminUsersPage from './+page.svelte';
import { goto } from '$app/navigation';

vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	invalidateAll: vi.fn()
}));

vi.mock('$app/forms', () => {
	return {
		enhance: (node: HTMLFormElement, submitFunction: any) => {
			node.addEventListener('submit', async (e) => {
				if (e.defaultPrevented) return;
				e.preventDefault();
				if (submitFunction) {
					const cb = submitFunction({
						formData: new FormData(node),
						cancel: () => {},
						submitter: null,
						formElement: node
					});
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

describe('Admin Users Page', () => {
	afterEach(async () => {
		cleanup();
		vi.clearAllMocks();
		await new Promise((resolve) => setTimeout(resolve, 50));
	});

	const mockUsers = [
		{
			id: 'admin-1',
			username: 'admin',
			email: 'admin@stype.local',
			name: 'Admin User',
			role: 'admin' as const,
			emailConfirmed: true,
			createdAt: new Date('2026-01-01T12:00:00Z')
		},
		{
			id: 'user-2',
			username: 'janedoe',
			email: 'jane@example.com',
			name: 'Jane Doe',
			role: 'user' as const,
			emailConfirmed: true,
			createdAt: new Date('2026-01-05T15:30:00Z')
		},
		{
			id: 'user-3',
			username: 'bobsmith',
			email: 'bob@example.com',
			name: 'Bob Smith',
			role: 'user' as const,
			emailConfirmed: false,
			createdAt: new Date('2026-01-10T09:15:00Z')
		}
	];

	it('renders administration shell with proper layout constraints', () => {
		const { container } = render(AdminUsersPage, {
			data: {
				user: mockUsers[0],
				users: mockUsers
			} as any,
			form: null
		});

		const layoutContainer = container.querySelector('.mx-auto.max-w-5xl.px-6.py-8.w-full');
		expect(layoutContainer).toBeInTheDocument();

		expect(screen.getByRole('heading', { level: 1, name: /administration|user management/i })).toBeInTheDocument();
	});

	it('renders responsive table displaying all registered users with required columns', () => {
		render(AdminUsersPage, {
			data: {
				user: mockUsers[0],
				users: mockUsers
			} as any,
			form: null
		});

		// Table headers
		expect(screen.getByRole('columnheader', { name: /^display name$/i })).toBeInTheDocument();
		expect(screen.getByRole('columnheader', { name: /^username$/i })).toBeInTheDocument();
		expect(screen.getByRole('columnheader', { name: /^email$/i })).toBeInTheDocument();
		expect(screen.getByRole('columnheader', { name: /^role$/i })).toBeInTheDocument();
		expect(screen.getByRole('columnheader', { name: /^confirmation$/i })).toBeInTheDocument();
		expect(screen.getByRole('columnheader', { name: /^registration date$/i })).toBeInTheDocument();

		// Check rows rendered
		expect(screen.getByText('Admin User')).toBeInTheDocument();
		expect(screen.getByText('admin')).toBeInTheDocument();
		expect(screen.getByText('admin@stype.local')).toBeInTheDocument();

		expect(screen.getByText('Jane Doe')).toBeInTheDocument();
		expect(screen.getByText('janedoe')).toBeInTheDocument();
		expect(screen.getByText('jane@example.com')).toBeInTheDocument();

		expect(screen.getByText('Bob Smith')).toBeInTheDocument();
		expect(screen.getByText('bobsmith')).toBeInTheDocument();
		expect(screen.getByText('bob@example.com')).toBeInTheDocument();
	});

	it('displays role badges and confirmation badges for users', () => {
		render(AdminUsersPage, {
			data: {
				user: mockUsers[0],
				users: mockUsers
			} as any,
			form: null
		});

		// Role badges
		const adminBadges = screen.getAllByText('Admin');
		expect(adminBadges.length).toBeGreaterThanOrEqual(1);

		const userBadges = screen.getAllByText('User');
		expect(userBadges.length).toBeGreaterThanOrEqual(2);

		// Confirmation badges
		const verifiedBadges = screen.getAllByText('Verified');
		expect(verifiedBadges.length).toBe(2);

		const pendingBadges = screen.getAllByText('Pending');
		expect(pendingBadges.length).toBe(1);
	});

	it('filters users in real time matching display name, username, or email', async () => {
		render(AdminUsersPage, {
			data: {
				user: mockUsers[0],
				users: mockUsers
			} as any,
			form: null
		});

		const searchInput = screen.getByPlaceholderText(/search/i);
		expect(searchInput).toBeInTheDocument();

		// Match by username
		await fireEvent.input(searchInput, { target: { value: 'janedoe' } });
		expect(screen.getByText('Jane Doe')).toBeInTheDocument();
		expect(screen.queryByText('Admin User')).not.toBeInTheDocument();
		expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();

		// Match by display name (case insensitive)
		await fireEvent.input(searchInput, { target: { value: 'bob' } });
		expect(screen.getByText('Bob Smith')).toBeInTheDocument();
		expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
		expect(screen.queryByText('Admin User')).not.toBeInTheDocument();

		// Match by email domain
		await fireEvent.input(searchInput, { target: { value: 'stype.local' } });
		expect(screen.getByText('Admin User')).toBeInTheDocument();
		expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
		expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();

		// No match displays empty state
		await fireEvent.input(searchInput, { target: { value: 'nonexistentuser' } });
		expect(screen.getByText(/no users found/i)).toBeInTheDocument();
	});

	it('opens Create User dialog with all required fields and role selection', async () => {
		render(AdminUsersPage, {
			data: {
				user: mockUsers[0],
				users: mockUsers
			} as any,
			form: null
		});

		const createButton = screen.getByRole('button', { name: /create user/i });
		await fireEvent.click(createButton);

		// Dialog title
		expect(screen.getByRole('heading', { level: 2, name: /create user/i })).toBeInTheDocument();

		// Dialog inputs
		expect(screen.getByLabelText(/^display name$/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/^username$/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();

		// Role is rendered via shadcn Select component defaulting to "User"
		const roleTrigger = screen.getByRole('combobox', { name: /^role$/i });
		expect(roleTrigger).toBeInTheDocument();
		expect(roleTrigger).toHaveAttribute('data-slot', 'select-trigger');
		expect(roleTrigger).toHaveTextContent('User');

		const form = roleTrigger.closest('form');
		const roleHiddenInput = form?.querySelector('input[name="role"]') as HTMLInputElement;
		expect(roleHiddenInput).toBeInTheDocument();
		expect(roleHiddenInput.value).toBe('user');
	});

	it('generates random secure password and populates field on button click', async () => {
		render(AdminUsersPage, {
			data: {
				user: mockUsers[0],
				users: mockUsers
			} as any,
			form: null
		});

		const createButton = screen.getByRole('button', { name: /create user/i });
		await fireEvent.click(createButton);

		const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
		expect(passwordInput.value).toBe('');

		const generateButton = screen.getByRole('button', { name: /generate random password|generate password/i });
		expect(generateButton).toBeInTheDocument();

		await fireEvent.click(generateButton);

		expect(passwordInput.value.length).toBeGreaterThanOrEqual(8);
	});

	it('displays inline field errors when form returns validation errors and preserves entered values', async () => {
		render(AdminUsersPage, {
			data: {
				user: mockUsers[0],
				users: mockUsers
			} as any,
			form: {
				action: 'createUser',
				success: false,
				message: 'Please resolve the errors in the form',
				errors: {
					username: 'Username is already taken',
					email: 'Email is already registered',
					password: 'Password must be at least 8 characters'
				},
				values: {
					name: 'Conflicting Typist',
					username: 'janedoe',
					email: 'jane@example.com',
					role: 'admin'
				}
			} as any
		});

		expect(screen.getByText('Username is already taken')).toBeInTheDocument();
		expect(screen.getByText('Email is already registered')).toBeInTheDocument();
		expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();

		const nameInput = screen.getByLabelText(/^display name$/i) as HTMLInputElement;
		const usernameInput = screen.getByLabelText(/^username$/i) as HTMLInputElement;
		const emailInput = screen.getByLabelText(/^email$/i) as HTMLInputElement;
		const roleTrigger = screen.getByRole('combobox', { name: /^role$/i });
		const roleHiddenInput = roleTrigger.closest('form')?.querySelector('input[name="role"]') as HTMLInputElement;

		expect(nameInput.value).toBe('Conflicting Typist');
		expect(usernameInput.value).toBe('janedoe');
		expect(emailInput.value).toBe('jane@example.com');
		expect(roleTrigger).toHaveTextContent('Admin');
		expect(roleHiddenInput.value).toBe('admin');
	});

	it('closes Create User dialog on Cancel click', async () => {
		render(AdminUsersPage, {
			data: {
				user: mockUsers[0],
				users: mockUsers
			} as any,
			form: null
		});

		const createButton = screen.getByRole('button', { name: /create user/i });
		await fireEvent.click(createButton);

		expect(screen.getByRole('heading', { level: 2, name: /create user/i })).toBeInTheDocument();

		const cancelButton = screen.getByRole('button', { name: /cancel/i });
		await fireEvent.click(cancelButton);

		expect(screen.queryByRole('heading', { level: 2, name: /create user/i })).not.toBeInTheDocument();
	});

	it('submits form via enhance to ?/createUser and closes dialog on success', async () => {
		render(AdminUsersPage, {
			data: {
				user: mockUsers[0],
				users: mockUsers
			} as any,
			form: null
		});

		const openButton = screen.getByRole('button', { name: /create user/i });
		await fireEvent.click(openButton);

		const dialogTitle = screen.getByRole('heading', { level: 2, name: /create user/i });
		expect(dialogTitle).toBeInTheDocument();

		const submitButton = screen.getAllByRole('button', { name: /create user/i }).find((btn) => btn.getAttribute('type') === 'submit');
		expect(submitButton).toBeDefined();

		const form = submitButton!.closest('form');
		expect(form).toBeInTheDocument();
		expect(form).toHaveAttribute('method', 'POST');
		expect(form?.getAttribute('action')).toContain('createUser');

		await fireEvent.submit(form!);

		expect(screen.queryByRole('heading', { level: 2, name: /create user/i })).not.toBeInTheDocument();
	});

	it('allows selecting role via keyboard interaction in Create User dialog', async () => {
		render(AdminUsersPage, {
			data: {
				user: mockUsers[0],
				users: mockUsers
			} as any,
			form: null
		});

		const createButton = screen.getByRole('button', { name: /create user/i });
		await fireEvent.click(createButton);

		const roleTrigger = screen.getByRole('combobox', { name: /^role$/i });
		expect(roleTrigger).toHaveTextContent('User');

		roleTrigger.focus();
		// Open the dropdown via keyboard
		await fireEvent.keyDown(roleTrigger, { key: 'ArrowDown' });
		const adminOption = await screen.findByRole('option', { name: /^admin$/i });
		expect(adminOption).toBeInTheDocument();

		// Move down and press Enter
		await fireEvent.keyDown(roleTrigger, { key: 'ArrowDown' });
		await fireEvent.keyDown(roleTrigger, { key: 'Enter' });

		expect(roleTrigger).toHaveTextContent('Admin');
		const roleHiddenInput = roleTrigger.closest('form')?.querySelector('input[name="role"]') as HTMLInputElement;
		expect(roleHiddenInput.value).toBe('admin');
	});

	it('submits createUser form with selected role from dropdown', async () => {
		render(AdminUsersPage, {
			data: {
				user: mockUsers[0],
				users: mockUsers
			} as any,
			form: null
		});

		const openButton = screen.getByRole('button', { name: /create user/i });
		await fireEvent.click(openButton);

		const roleTrigger = screen.getByRole('combobox', { name: /^role$/i });
		await fireEvent.pointerDown(roleTrigger, { button: 0, pointerType: 'mouse' });

		const adminOption = await screen.findByRole('option', { name: /^admin$/i });
		await fireEvent.pointerUp(adminOption, { button: 0, pointerType: 'mouse' });

		expect(roleTrigger).toHaveTextContent('Admin');

		const form = roleTrigger.closest('form')!;
		const formData = new FormData(form);
		expect(formData.get('role')).toBe('admin');
	});

	it('renders an action menu for each user row with an Edit Details option', async () => {
		render(AdminUsersPage, {
			data: {
				user: mockUsers[0],
				users: mockUsers
			} as any,
			form: null
		});

		expect(screen.getByRole('columnheader', { name: /^actions$/i })).toBeInTheDocument();

		const actionBtn = screen.getByRole('button', { name: /actions for janedoe/i });
		expect(actionBtn).toBeInTheDocument();

		await fireEvent.click(actionBtn);

		const editOption = screen.getByRole('menuitem', { name: /edit details/i });
		expect(editOption).toBeInTheDocument();
	});

	it('opens Edit User dialog with user details pre-populated when Edit Details is clicked', async () => {
		render(AdminUsersPage, {
			data: {
				user: mockUsers[0],
				users: mockUsers
			} as any,
			form: null
		});

		const actionBtn = screen.getByRole('button', { name: /actions for janedoe/i });
		await fireEvent.click(actionBtn);

		const editOption = screen.getByRole('menuitem', { name: /edit details/i });
		await fireEvent.click(editOption);

		expect(screen.getByRole('heading', { level: 2, name: /edit user/i })).toBeInTheDocument();

		const nameInput = screen.getByLabelText(/^display name$/i) as HTMLInputElement;
		const emailInput = screen.getByLabelText(/^email$/i) as HTMLInputElement;
		const roleTrigger = screen.getByRole('combobox', { name: /^role$/i });
		const roleHiddenInput = roleTrigger.closest('form')?.querySelector('input[name="role"]') as HTMLInputElement;
		const verifiedSwitch = screen.getByRole('switch', { name: /email verified/i });

		expect(nameInput.value).toBe('Jane Doe');
		expect(emailInput.value).toBe('jane@example.com');
		expect(roleTrigger).toBeInTheDocument();
		expect(roleTrigger).toHaveAttribute('data-slot', 'select-trigger');
		expect(roleTrigger).toHaveTextContent('User');
		expect(roleHiddenInput.value).toBe('user');
		expect(verifiedSwitch).toHaveAttribute('aria-checked', 'true');
	});

	it('allows toggling the Email Verified switch in Edit User dialog', async () => {
		render(AdminUsersPage, {
			data: {
				user: mockUsers[0],
				users: mockUsers
			} as any,
			form: null
		});

		// Open edit dialog for Bob Smith (emailConfirmed: false)
		const actionBtn = screen.getByRole('button', { name: /actions for bobsmith/i });
		await fireEvent.click(actionBtn);

		const editOption = screen.getByRole('menuitem', { name: /edit details/i });
		await fireEvent.click(editOption);

		const verifiedSwitch = screen.getByRole('switch', { name: /email verified/i });
		expect(verifiedSwitch).toHaveAttribute('aria-checked', 'false');

		await fireEvent.click(verifiedSwitch);
		expect(verifiedSwitch).toHaveAttribute('aria-checked', 'true');
	});

	it('submits updateUser form with updated fields and closes dialog on success', async () => {
		render(AdminUsersPage, {
			data: {
				user: mockUsers[0],
				users: mockUsers
			} as any,
			form: null
		});

		const actionBtn = screen.getByRole('button', { name: /actions for janedoe/i });
		await fireEvent.click(actionBtn);

		const editOption = screen.getByRole('menuitem', { name: /edit details/i });
		await fireEvent.click(editOption);

		const saveButton = screen.getByRole('button', { name: /save changes|update user/i });
		const form = saveButton.closest('form');
		expect(form).toBeInTheDocument();
		expect(form?.getAttribute('action')).toContain('updateUser');

		const idInput = form?.querySelector('input[name="id"]') as HTMLInputElement;
		expect(idInput).toBeInTheDocument();
		expect(idInput.value).toBe('user-2');

		await fireEvent.submit(form!);
		expect(screen.queryByRole('heading', { level: 2, name: /edit user/i })).not.toBeInTheDocument();
	});

	it('displays validation errors in Edit User dialog when updateUser returns error', () => {
		render(AdminUsersPage, {
			data: {
				user: mockUsers[0],
				users: mockUsers
			} as any,
			form: {
				action: 'updateUser',
				success: false,
				message: 'Please resolve the errors in the form',
				errors: {
					name: 'Display name must be between 1 and 50 characters',
					email: 'Email is already registered'
				},
				values: {
					id: 'user-2',
					name: '',
					email: 'admin@stype.local',
					role: 'user',
					emailConfirmed: 'true'
				}
			} as any
		});

		expect(screen.getByRole('heading', { level: 2, name: /edit user/i })).toBeInTheDocument();
		expect(screen.getByText('Display name must be between 1 and 50 characters')).toBeInTheDocument();
		expect(screen.getByText('Email is already registered')).toBeInTheDocument();
	});

	it('displays confirmation dialog warning when an administrator demotes their own account', async () => {
		render(AdminUsersPage, {
			data: {
				user: mockUsers[0], // current user is admin-1
				users: mockUsers
			} as any,
			form: null
		});

		// Open edit dialog for own account (admin-1)
		const actionBtn = screen.getByRole('button', { name: /actions for admin/i });
		await fireEvent.click(actionBtn);

		const editOption = screen.getByRole('menuitem', { name: /edit details/i });
		await fireEvent.click(editOption);

		const roleTrigger = screen.getByRole('combobox', { name: /^role$/i });
		expect(roleTrigger).toHaveTextContent('Admin');

		// Change role to 'user' via Select dropdown
		await fireEvent.pointerDown(roleTrigger, { button: 0, pointerType: 'mouse' });
		const userOption = await screen.findByRole('option', { name: /^user$/i });
		expect(userOption).toBeInTheDocument();
		await fireEvent.pointerUp(userOption, { button: 0, pointerType: 'mouse' });
		expect(roleTrigger).toHaveTextContent('User');

		const roleHiddenInput = roleTrigger.closest('form')?.querySelector('input[name="role"]') as HTMLInputElement;
		expect(roleHiddenInput.value).toBe('user');

		// Click save changes
		const saveButton = screen.getByRole('button', { name: /save changes|update user/i });
		await fireEvent.click(saveButton);

		// Confirmation dialog should be visible with warning
		expect(
			screen.getByText(/administrative privileges will be revoked immediately/i)
		).toBeInTheDocument();

		// Cancel should close confirmation dialog
		const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
		const confirmationCancelButton = cancelButtons[cancelButtons.length - 1];
		await fireEvent.click(confirmationCancelButton);

		expect(
			screen.queryByText(/administrative privileges will be revoked immediately/i)
		).not.toBeInTheDocument();
	});

	it('confirms self-demotion and submits update with confirmation flag', async () => {
		render(AdminUsersPage, {
			data: {
				user: mockUsers[0],
				users: mockUsers
			} as any,
			form: null
		});

		// Open edit dialog for own account
		const actionBtn = screen.getByRole('button', { name: /actions for admin/i });
		await fireEvent.click(actionBtn);

		const editOption = screen.getByRole('menuitem', { name: /edit details/i });
		await fireEvent.click(editOption);

		const roleTrigger = screen.getByRole('combobox', { name: /^role$/i });
		await fireEvent.pointerDown(roleTrigger, { button: 0, pointerType: 'mouse' });
		const userOption = await screen.findByRole('option', { name: /^user$/i });
		await fireEvent.pointerUp(userOption, { button: 0, pointerType: 'mouse' });

		const saveButton = screen.getByRole('button', { name: /save changes|update user/i });
		await fireEvent.click(saveButton);

		expect(
			screen.getByText(/administrative privileges will be revoked immediately/i)
		).toBeInTheDocument();

		const confirmButton = screen.getByRole('button', {
			name: /confirm demotion|confirm/i
		});
		await fireEvent.click(confirmButton);

		expect(
			screen.queryByText(/administrative privileges will be revoked immediately/i)
		).not.toBeInTheDocument();
	});

	it('does not trigger self-demotion warning when administrator re-selects Admin role', async () => {
		render(AdminUsersPage, {
			data: {
				user: mockUsers[0],
				users: mockUsers
			} as any,
			form: null
		});

		const actionBtn = screen.getByRole('button', { name: /actions for admin/i });
		await fireEvent.click(actionBtn);

		const editOption = screen.getByRole('menuitem', { name: /edit details/i });
		await fireEvent.click(editOption);

		const roleTrigger = screen.getByRole('combobox', { name: /^role$/i });

		// Change role to 'user'
		await fireEvent.pointerDown(roleTrigger, { button: 0, pointerType: 'mouse' });
		const userOption = await screen.findByRole('option', { name: /^user$/i });
		await fireEvent.pointerUp(userOption, { button: 0, pointerType: 'mouse' });
		expect(roleTrigger).toHaveTextContent('User');

		// Change role back to 'admin'
		await fireEvent.pointerDown(roleTrigger, { button: 0, pointerType: 'mouse' });
		const adminOption = await screen.findByRole('option', { name: /^admin$/i });
		await fireEvent.pointerUp(adminOption, { button: 0, pointerType: 'mouse' });
		expect(roleTrigger).toHaveTextContent('Admin');

		const saveButton = screen.getByRole('button', { name: /save changes|update user/i });
		await fireEvent.click(saveButton);

		expect(
			screen.queryByText(/administrative privileges will be revoked immediately/i)
		).not.toBeInTheDocument();
	});

	it('allows selecting role via keyboard interaction in Edit User dialog', async () => {
		render(AdminUsersPage, {
			data: {
				user: mockUsers[0],
				users: mockUsers
			} as any,
			form: null
		});

		const actionBtn = screen.getByRole('button', { name: /actions for janedoe/i });
		await fireEvent.click(actionBtn);

		const editOption = screen.getByRole('menuitem', { name: /edit details/i });
		await fireEvent.click(editOption);

		const roleTrigger = screen.getByRole('combobox', { name: /^role$/i });
		expect(roleTrigger).toHaveTextContent('User');

		roleTrigger.focus();
		await fireEvent.keyDown(roleTrigger, { key: 'ArrowDown' });
		const adminOption = await screen.findByRole('option', { name: /^admin$/i });
		expect(adminOption).toBeInTheDocument();

		await fireEvent.keyDown(roleTrigger, { key: 'ArrowDown' });
		await fireEvent.keyDown(roleTrigger, { key: 'Enter' });

		expect(roleTrigger).toHaveTextContent('Admin');
		const roleHiddenInput = roleTrigger.closest('form')?.querySelector('input[name="role"]') as HTMLInputElement;
		expect(roleHiddenInput.value).toBe('admin');
	});

	it('renders an action menu for each user row with a Reset Password option', async () => {
		render(AdminUsersPage, {
			data: {
				user: mockUsers[0],
				users: mockUsers,
				smtpConfigured: true
			} as any,
			form: null
		});

		const actionBtn = screen.getByRole('button', { name: /actions for janedoe/i });
		await fireEvent.click(actionBtn);

		const resetOption = screen.getByRole('menuitem', { name: /reset password/i });
		expect(resetOption).toBeInTheDocument();
	});

	it('opens Reset Password dialog when Reset Password is clicked', async () => {
		render(AdminUsersPage, {
			data: {
				user: mockUsers[0],
				users: mockUsers,
				smtpConfigured: true
			} as any,
			form: null
		});

		const actionBtn = screen.getByRole('button', { name: /actions for janedoe/i });
		await fireEvent.click(actionBtn);

		const resetOption = screen.getByRole('menuitem', { name: /reset password/i });
		await fireEvent.click(resetOption);

		expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument();
		expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /generate random password/i })
		).toBeInTheDocument();
		expect(
			screen.getByText(/immediately sign this user out of all active sessions/i)
		).toBeInTheDocument();
	});

	it('generates random secure password and populates field in Reset Password dialog', async () => {
		render(AdminUsersPage, {
			data: {
				user: mockUsers[0],
				users: mockUsers,
				smtpConfigured: true
			} as any,
			form: null
		});

		const actionBtn = screen.getByRole('button', { name: /actions for janedoe/i });
		await fireEvent.click(actionBtn);

		const resetOption = screen.getByRole('menuitem', { name: /reset password/i });
		await fireEvent.click(resetOption);

		const passwordInput = screen.getByLabelText(/new password/i) as HTMLInputElement;
		expect(passwordInput.value).toBe('');

		const generateBtn = screen.getByRole('button', { name: /generate random password/i });
		await fireEvent.click(generateBtn);

		expect(passwordInput.value.length).toBeGreaterThanOrEqual(8);
	});

	it('enables Send Reset Link action when SMTP is configured and user email is confirmed', async () => {
		render(AdminUsersPage, {
			data: {
				user: mockUsers[0],
				users: mockUsers,
				smtpConfigured: true
			} as any,
			form: null
		});

		// janedoe has confirmed email
		const actionBtn = screen.getByRole('button', { name: /actions for janedoe/i });
		await fireEvent.click(actionBtn);

		const resetOption = screen.getByRole('menuitem', { name: /reset password/i });
		await fireEvent.click(resetOption);

		const sendLinkButton = screen.getByRole('button', { name: /send reset link/i });
		expect(sendLinkButton).toBeInTheDocument();
		expect(sendLinkButton).toBeEnabled();
	});

	it('disables Send Reset Link action when SMTP is unconfigured', async () => {
		render(AdminUsersPage, {
			data: {
				user: mockUsers[0],
				users: mockUsers,
				smtpConfigured: false
			} as any,
			form: null
		});

		const actionBtn = screen.getByRole('button', { name: /actions for janedoe/i });
		await fireEvent.click(actionBtn);

		const resetOption = screen.getByRole('menuitem', { name: /reset password/i });
		await fireEvent.click(resetOption);

		const sendLinkButton = screen.getByRole('button', { name: /send reset link/i });
		expect(sendLinkButton).toBeInTheDocument();
		expect(sendLinkButton).toBeDisabled();
		expect(
			screen.getByText(/email delivery is not configured on this server/i)
		).toBeInTheDocument();
	});

	it('disables Send Reset Link action when user email is unverified', async () => {
		render(AdminUsersPage, {
			data: {
				user: mockUsers[0],
				users: mockUsers,
				smtpConfigured: true
			} as any,
			form: null
		});

		// bobsmith has emailConfirmed: false
		const actionBtn = screen.getByRole('button', { name: /actions for bobsmith/i });
		await fireEvent.click(actionBtn);

		const resetOption = screen.getByRole('menuitem', { name: /reset password/i });
		await fireEvent.click(resetOption);

		const sendLinkButton = screen.getByRole('button', { name: /send reset link/i });
		expect(sendLinkButton).toBeInTheDocument();
		expect(sendLinkButton).toBeDisabled();
		expect(screen.getByText(/user email is unverified/i)).toBeInTheDocument();
	});

	it('submits resetPassword form via enhance and closes dialog on success', async () => {
		render(AdminUsersPage, {
			data: {
				user: mockUsers[0],
				users: mockUsers,
				smtpConfigured: true
			} as any,
			form: null
		});

		const actionBtn = screen.getByRole('button', { name: /actions for janedoe/i });
		await fireEvent.click(actionBtn);

		const resetOption = screen.getByRole('menuitem', { name: /reset password/i });
		await fireEvent.click(resetOption);

		const passwordInput = screen.getByLabelText(/new password/i) as HTMLInputElement;
		await fireEvent.input(passwordInput, { target: { value: 'ValidPassword123' } });

		const submitBtn = screen.getByRole('button', { name: /^reset password$/i });
		await fireEvent.click(submitBtn);

		// Dialog should close on success
		expect(screen.queryByLabelText(/new password/i)).not.toBeInTheDocument();
	});

	it('submits sendResetLink form via enhance and closes dialog on success', async () => {
		render(AdminUsersPage, {
			data: {
				user: mockUsers[0],
				users: mockUsers,
				smtpConfigured: true
			} as any,
			form: null
		});

		const actionBtn = screen.getByRole('button', { name: /actions for janedoe/i });
		await fireEvent.click(actionBtn);

		const resetOption = screen.getByRole('menuitem', { name: /reset password/i });
		await fireEvent.click(resetOption);

		const sendLinkBtn = screen.getByRole('button', { name: /send reset link/i });
		await fireEvent.click(sendLinkBtn);

		// Dialog should close on success
		expect(screen.queryByLabelText(/new password/i)).not.toBeInTheDocument();
	});

	it('displays validation errors in Reset Password dialog when resetPassword returns error', () => {
		render(AdminUsersPage, {
			data: {
				user: mockUsers[0],
				users: mockUsers,
				smtpConfigured: true
			} as any,
			form: {
				action: 'resetPassword',
				success: false,
				message: 'Password must be at least 8 characters',
				errors: {
					password: 'Password must be at least 8 characters'
				},
				values: { id: 'user-2' }
			} as any
		});

		expect(
			screen.getAllByText(/password must be at least 8 characters/i).length
		).toBeGreaterThan(0);
	});

	it('displays error in Reset Password dialog when sendResetLink returns error', () => {
		render(AdminUsersPage, {
			data: {
				user: mockUsers[0],
				users: mockUsers,
				smtpConfigured: true
			} as any,
			form: {
				action: 'sendResetLink',
				success: false,
				message: 'SMTP is not configured on this server'
			} as any
		});

		expect(
			screen.getByText(/smtp is not configured on this server/i)
		).toBeInTheDocument();
	});

	it('includes a "Delete User" option in each user row action menu', async () => {
		render(AdminUsersPage, {
			data: {
				user: mockUsers[0],
				users: mockUsers,
				smtpConfigured: true
			} as any,
			form: null
		});

		const actionBtn = screen.getByRole('button', { name: /actions for janedoe/i });
		await fireEvent.click(actionBtn);

		const deleteOption = screen.getByRole('menuitem', { name: /delete user/i });
		expect(deleteOption).toBeInTheDocument();
	});

	it('opens Delete User confirmation modal dialog with permanent removal warning when deleting another user', async () => {
		render(AdminUsersPage, {
			data: {
				user: mockUsers[0],
				users: mockUsers,
				smtpConfigured: true
			} as any,
			form: null
		});

		const actionBtn = screen.getByRole('button', { name: /actions for janedoe/i });
		await fireEvent.click(actionBtn);

		const deleteOption = screen.getByRole('menuitem', { name: /delete user/i });
		await fireEvent.click(deleteOption);

		expect(screen.getByRole('heading', { level: 2, name: /delete user/i })).toBeInTheDocument();
		expect(
			screen.getByText(/are you sure you want to delete/i)
		).toBeInTheDocument();
		expect(
			screen.getAllByText(/Jane Doe/i).length
		).toBeGreaterThan(1);

		// Cancel button closes modal
		const cancelButton = screen.getByRole('button', { name: /cancel/i });
		await fireEvent.click(cancelButton);

		expect(screen.queryByRole('heading', { level: 2, name: /delete user/i })).not.toBeInTheDocument();
	});

	it('displays specific confirmation warning about immediate session termination when deleting own account', async () => {
		render(AdminUsersPage, {
			data: {
				user: mockUsers[0], // admin-1
				users: mockUsers,
				smtpConfigured: true
			} as any,
			form: null
		});

		const actionBtn = screen.getByRole('button', { name: /actions for admin/i });
		await fireEvent.click(actionBtn);

		const deleteOption = screen.getByRole('menuitem', { name: /delete user/i });
		await fireEvent.click(deleteOption);

		// Modal should display the specific confirmation warning
		expect(screen.getByRole('heading', { level: 2, name: /delete user|delete account/i })).toBeInTheDocument();
		expect(
			screen.getAllByText(/current session will terminate immediately/i).length
		).toBeGreaterThan(0);
	});

	it('redirects to /app/login when confirming self-deletion', async () => {
		const originalLocation = window.location;
		delete (window as any).location;
		window.location = { href: '' } as any;

		render(AdminUsersPage, {
			data: {
				user: mockUsers[0],
				users: mockUsers,
				smtpConfigured: true
			} as any,
			form: null
		});

		const actionBtn = screen.getByRole('button', { name: /actions for admin/i });
		await fireEvent.click(actionBtn);

		const deleteOption = screen.getByRole('menuitem', { name: /delete user/i });
		await fireEvent.click(deleteOption);

		const form = document.querySelector('form[action="?/deleteUser"]') as HTMLFormElement;
		expect(form).not.toBeNull();

		await fireEvent.submit(form);

		expect(window.location.href).toBe('/app/login');

		(window as any).location = originalLocation;
	});

	it('displays error in Delete User dialog when deleteUser action fails', () => {
		render(AdminUsersPage, {
			data: {
				user: mockUsers[0],
				users: mockUsers,
				smtpConfigured: true
			} as any,
			form: {
				action: 'deleteUser',
				success: false,
				message: 'Cannot delete the sole administrator. At least one administrator must remain.',
				values: { id: 'admin-1' }
			} as any
		});

		expect(
			screen.getByText(/cannot delete the sole administrator/i)
		).toBeInTheDocument();
	});

	describe('Pagination controls and navigation', () => {
		it('renders persistent pagination controls beneath table and user count summary on single-page view', () => {
			render(AdminUsersPage, {
				data: {
					user: mockUsers[0],
					users: mockUsers,
					pagination: {
						page: 1,
						perPage: 25,
						totalCount: 3,
						totalPages: 1
					}
				} as any,
				form: null
			});

			// Persistent pagination container
			const paginationNav = screen.getByRole('navigation', { name: /pagination/i });
			expect(paginationNav).toBeInTheDocument();

			// User count summary
			expect(screen.getByText('Showing 1 to 3 of 3 users')).toBeInTheDocument();

			// On single-page view, both Previous and Next are disabled
			const prevBtn = screen.getByRole('button', { name: /previous/i });
			const nextBtn = screen.getByRole('button', { name: /next/i });
			expect(prevBtn).toBeDisabled();
			expect(nextBtn).toBeDisabled();
		});

		it('renders pagination controls on multi-page view with formatted range text and boundary button states', () => {
			// Page 1 of 3 (total 60 users, 25 per page)
			const { unmount } = render(AdminUsersPage, {
				data: {
					user: mockUsers[0],
					users: mockUsers,
					pagination: {
						page: 1,
						perPage: 25,
						totalCount: 60,
						totalPages: 3
					}
				} as any,
				form: null
			});

			expect(screen.getByText('Showing 1 to 25 of 60 users')).toBeInTheDocument();

			const prevBtnPage1 = screen.getByRole('button', { name: /previous/i });
			const nextBtnPage1 = screen.getByRole('button', { name: /next/i });
			expect(prevBtnPage1).toBeDisabled();
			expect(nextBtnPage1).not.toBeDisabled();

			unmount();

			// Final page (Page 3 of 3)
			render(AdminUsersPage, {
				data: {
					user: mockUsers[0],
					users: mockUsers,
					pagination: {
						page: 3,
						perPage: 25,
						totalCount: 60,
						totalPages: 3
					}
				} as any,
				form: null
			});

			expect(screen.getByText('Showing 51 to 60 of 60 users')).toBeInTheDocument();

			const prevBtnPage3 = screen.getByRole('button', { name: /previous/i });
			const nextBtnPage3 = screen.getByRole('button', { name: /next/i });
			expect(prevBtnPage3).not.toBeDisabled();
			expect(nextBtnPage3).toBeDisabled();
		});

		it('renders persistent pagination controls in zero-user view with "No users found" and disabled buttons', () => {
			render(AdminUsersPage, {
				data: {
					user: mockUsers[0],
					users: [],
					pagination: {
						page: 1,
						perPage: 25,
						totalCount: 0,
						totalPages: 1
					}
				} as any,
				form: null
			});

			const paginationNav = screen.getByRole('navigation', { name: /pagination/i });
			expect(paginationNav).toBeInTheDocument();

			expect(screen.getByText('No users found')).toBeInTheDocument();

			const prevBtn = screen.getByRole('button', { name: /previous/i });
			const nextBtn = screen.getByRole('button', { name: /next/i });
			expect(prevBtn).toBeDisabled();
			expect(nextBtn).toBeDisabled();
		});

		it('navigates with ?page= parameter and noScroll: true when clicking page number or Next button', async () => {
			render(AdminUsersPage, {
				data: {
					user: mockUsers[0],
					users: mockUsers,
					pagination: {
						page: 1,
						perPage: 25,
						totalCount: 60,
						totalPages: 3
					}
				} as any,
				form: null
			});

			const nextBtn = screen.getByRole('button', { name: /next/i });
			await fireEvent.click(nextBtn);

			expect(goto).toHaveBeenCalledWith(
				expect.stringMatching(/[?&]page=2/),
				expect.objectContaining({ noScroll: true, keepFocus: true })
			);

			// Direct page link click (page 3)
			const page3Btn = screen.getByRole('button', { name: /page 3/i });
			await fireEvent.click(page3Btn);

			expect(goto).toHaveBeenCalledWith(
				expect.stringMatching(/[?&]page=3/),
				expect.objectContaining({ noScroll: true, keepFocus: true })
			);
		});

		it('navigates to ?page=1 upon successful user creation', async () => {
			render(AdminUsersPage, {
				data: {
					user: mockUsers[0],
					users: mockUsers,
					pagination: {
						page: 2,
						perPage: 25,
						totalCount: 50,
						totalPages: 2
					}
				} as any,
				form: null
			});

			const openButton = screen.getByRole('button', { name: /create user/i });
			await fireEvent.click(openButton);

			const submitButton = screen
				.getAllByRole('button', { name: /create user/i })
				.find((btn) => btn.getAttribute('type') === 'submit');
			const form = submitButton!.closest('form')!;

			await fireEvent.submit(form);

			expect(goto).toHaveBeenCalledWith(
				expect.stringMatching(/page=1/),
				expect.objectContaining({ noScroll: true })
			);
		});

		it('synchronizes URL with replaceState when server clamps out-of-bounds page parameter', () => {
			const originalLocation = window.location;
			delete (window as any).location;
			window.location = new URL('http://localhost:5173/app/admin/users?page=5') as any;

			render(AdminUsersPage, {
				data: {
					user: mockUsers[0],
					users: mockUsers,
					pagination: {
						page: 4, // Server clamped page from 5 to 4
						perPage: 25,
						totalCount: 90,
						totalPages: 4
					}
				} as any,
				form: null
			});

			expect(goto).toHaveBeenCalledWith(
				expect.stringMatching(/[?&]page=4/),
				expect.objectContaining({ replaceState: true, noScroll: true, keepFocus: true })
			);

			(window as any).location = originalLocation;
		});
	});
});
