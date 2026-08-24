/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/svelte';
import Layout from './+layout.svelte';
import { createRawSnippet } from 'svelte';

describe('App Layout Shell', () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it('renders just children if user is not authenticated', () => {
		const childSnippet = createRawSnippet(() => ({
			render: () => '<div data-testid="child">Unauthenticated Content</div>'
		}));

		render(Layout, {
			data: { user: null, settings: null },
			children: childSnippet
		});

		expect(screen.getByTestId('child')).toBeInTheDocument();
		expect(screen.queryByText('stype')).not.toBeInTheDocument();
		expect(screen.queryByText('Session active')).not.toBeInTheDocument();
	});

	it('renders shell header and components when user is authenticated', () => {
		const childSnippet = createRawSnippet(() => ({
			render: () => '<div data-testid="child">Authenticated Content</div>'
		}));

		render(Layout, {
			data: { user: { id: 'user-1', username: 'testuser', createdAt: new Date() }, settings: null },
			children: childSnippet
		});

		expect(screen.getByTestId('child')).toBeInTheDocument();
		// Header brand
		expect(screen.getByText('stype')).toBeInTheDocument();
		// Session badge
		expect(screen.getByText('Session active')).toBeInTheDocument();
		// User profile trigger
		expect(screen.getByText('testuser')).toBeInTheDocument();
		// Theme switcher button should be present
		expect(screen.getByRole('button', { name: /toggle theme/i })).toBeInTheDocument();
		// Settings navigation link
		expect(screen.getAllByRole('link', { name: /settings/i }).length).toBeGreaterThanOrEqual(1);
	});

	it('opens user profile dropdown and shows settings and logout options', async () => {
		const childSnippet = createRawSnippet(() => ({
			render: () => '<div>Content</div>'
		}));

		render(Layout, {
			data: { user: { id: 'user-2', username: 'dropdown-user', createdAt: new Date() }, settings: null },
			children: childSnippet
		});

		const userTrigger = screen.getByText('dropdown-user').closest('button');
		expect(userTrigger).not.toBeNull();
		
		await fireEvent.click(userTrigger!);

		const logoutButton = await screen.findByRole('button', { name: /log out/i });
		expect(logoutButton).toBeInTheDocument();
		expect(screen.getAllByRole('link', { name: /settings/i }).length).toBeGreaterThanOrEqual(1);
	});

	it('opens theme switcher dropdown and persists preference on selection', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({})
		});
		globalThis.fetch = fetchMock;

		const childSnippet = createRawSnippet(() => ({
			render: () => '<div>Content</div>'
		}));

		render(Layout, {
			data: { user: { id: 'user-3', username: 'dropdown-user', createdAt: new Date() }, settings: null },
			children: childSnippet
		});

		const themeTrigger = screen.getByRole('button', { name: /toggle theme/i });
		await fireEvent.click(themeTrigger);

		const lightOption = await screen.findByText('Light');
		expect(lightOption).toBeInTheDocument();
		expect(screen.getByText('Dark')).toBeInTheDocument();
		expect(screen.getByText('System')).toBeInTheDocument();

		await fireEvent.click(lightOption);
		expect(fetchMock).toHaveBeenCalledWith('/api/settings', expect.objectContaining({
			method: 'PATCH',
			body: JSON.stringify({ theme: 'light' })
		}));
	});
});
