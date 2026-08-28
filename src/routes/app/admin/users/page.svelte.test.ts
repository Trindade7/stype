/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/svelte';
import AdminUsersPage from './+page.svelte';

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
		expect(screen.getByLabelText(/^role$/i)).toBeInTheDocument();
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
		const roleSelect = screen.getByLabelText(/^role$/i) as HTMLSelectElement;

		expect(nameInput.value).toBe('Conflicting Typist');
		expect(usernameInput.value).toBe('janedoe');
		expect(emailInput.value).toBe('jane@example.com');
		expect(roleSelect.value).toBe('admin');
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
});
