/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import Page from './+page.svelte';

describe('Settings Page', () => {
	afterEach(() => {
		cleanup();
	});

	it('renders settings form with current user values', () => {
		const mockData = {
			user: { id: 'user-1', username: 'testuser', createdAt: new Date() },
			settings: {
				userId: 'user-1',
				mode: 'timed' as const,
				duration: 60,
				passageLength: 'medium' as const,
				zenMode: true,
				theme: 'dark' as const,
				createdAt: new Date(),
				updatedAt: new Date()
			}
		};

		render(Page, { data: mockData as any, form: null });

		expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
		expect(screen.getByLabelText(/passage mode/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/timed mode/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/zen mode/i)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /save settings/i })).toBeInTheDocument();
	});

	it('displays success message when form submission succeeds', () => {
		const mockData = {
			user: { id: 'user-1', username: 'testuser', createdAt: new Date() },
			settings: {
				userId: 'user-1',
				mode: 'passage' as const,
				duration: 30,
				passageLength: 'all' as const,
				zenMode: false,
				theme: 'system' as const,
				createdAt: new Date(),
				updatedAt: new Date()
			}
		};

		render(Page, { data: mockData as any, form: { success: true } });

		expect(screen.getByText(/settings saved successfully/i)).toBeInTheDocument();
	});
});
