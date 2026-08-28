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
	});

	it('renders shell header and components when user is authenticated', () => {
		const childSnippet = createRawSnippet(() => ({
			render: () => '<div data-testid="child">Authenticated Content</div>'
		}));

		render(Layout, {
			data: { user: { id: 'user-1', username: 'testuser', email: 'test@stype.local', name: 'Test User', createdAt: new Date() }, settings: null },
			children: childSnippet
		});

		expect(screen.getByTestId('child')).toBeInTheDocument();
		// Header brand
		expect(screen.getByText('stype')).toBeInTheDocument();
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
			data: { user: { id: 'user-2', username: 'dropdown-user', email: 'drop@stype.local', name: 'Drop User', createdAt: new Date() }, settings: null },
			children: childSnippet
		});

		const userTrigger = screen.getByText('dropdown-user').closest('button');
		expect(userTrigger).not.toBeNull();
		
		await fireEvent.click(userTrigger!);

		const logoutButton = await screen.findByRole('button', { name: /log out/i });
		expect(logoutButton).toBeInTheDocument();
		expect(screen.getAllByRole('link', { name: /settings/i }).length).toBeGreaterThanOrEqual(1);
	});

	it('displays "Logged in as [username]" as an interactive link to /app/user and removes redundant User Details entry', async () => {
		const childSnippet = createRawSnippet(() => ({
			render: () => '<div>Content</div>'
		}));

		render(Layout, {
			data: { user: { id: 'user-5', username: 'details-user', email: 'details@stype.local', name: 'Details User', createdAt: new Date() }, settings: null },
			children: childSnippet
		});

		const userTrigger = screen.getByText('details-user').closest('button');
		await fireEvent.click(userTrigger!);

		expect(screen.queryByText('My Account')).not.toBeInTheDocument();
		expect(screen.queryByRole('link', { name: /^user details$/i })).not.toBeInTheDocument();

		const loggedInLink = await screen.findByRole('link', { name: /logged in as details-user/i });
		expect(loggedInLink).toBeInTheDocument();
		expect(loggedInLink).toHaveAttribute('href', '/app/user');
	});

	it('truncates long usernames cleanly in user dropdown link and header trigger', async () => {
		const childSnippet = createRawSnippet(() => ({
			render: () => '<div>Content</div>'
		}));

		const longUsername = 'supercalifragilisticexpialidocious_typist_with_an_exceptionally_long_name';
		render(Layout, {
			data: { user: { id: 'user-6', username: longUsername, email: 'long@stype.local', name: 'Long User', createdAt: new Date() }, settings: null },
			children: childSnippet
		});

		const userTrigger = screen.getByText(longUsername).closest('button');
		expect(userTrigger).toHaveClass('max-w-[200px]');
		await fireEvent.click(userTrigger!);

		const loggedInLink = await screen.findByRole('link', { name: new RegExp(`logged in as ${longUsername}`, 'i') });
		expect(loggedInLink).toHaveClass('truncate', 'min-w-0');
		const truncateSpan = loggedInLink.querySelector('.truncate');
		expect(truncateSpan).toBeInTheDocument();
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
			data: { user: { id: 'user-3', username: 'dropdown-user', email: 'drop@stype.local', name: 'Drop User', createdAt: new Date() }, settings: null },
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

	it('maintains fixed positioning and centered max-width layout alignment for navigation header', () => {
		const childSnippet = createRawSnippet(() => ({
			render: () => '<div data-testid="child">Content</div>'
		}));

		render(Layout, {
			data: { user: { id: 'user-4', username: 'layout-user', email: 'layout@stype.local', name: 'Layout User', createdAt: new Date() }, settings: null },
			children: childSnippet
		});

		const header = screen.getByRole('banner');
		expect(header).toHaveClass('fixed', 'inset-x-0', 'top-0');

		const headerContainer = header.firstElementChild;
		expect(headerContainer).toHaveClass('mx-auto', 'max-w-5xl', 'px-6');
	});
});
