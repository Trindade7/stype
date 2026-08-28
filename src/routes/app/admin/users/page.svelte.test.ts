/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import AdminUsersPage from './+page.svelte';

describe('Admin Users Page Shell', () => {
	afterEach(() => {
		cleanup();
	});

	it('renders administration shell with proper layout constraints', () => {
		const { container } = render(AdminUsersPage, {
			data: {
				user: {
					id: 'admin-1',
					username: 'admin',
					email: 'admin@stype.local',
					name: 'Admin',
					role: 'admin',
					createdAt: new Date()
				}
			} as any
		});

		const layoutContainer = container.querySelector('.mx-auto.max-w-5xl.px-6.py-8.w-full');
		expect(layoutContainer).toBeInTheDocument();

		expect(screen.getByRole('heading', { level: 1, name: /administration|user management/i })).toBeInTheDocument();
	});
});
