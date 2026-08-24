/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/svelte';
import Layout from './+layout.svelte';
import { createRawSnippet } from 'svelte';

describe('App Layout Shell', () => {
	afterEach(() => {
		cleanup();
	});

	it('renders just children if user is not authenticated', () => {
		const childSnippet = createRawSnippet(() => ({
			render: () => '<div data-testid="child">Unauthenticated Content</div>'
		}));

		render(Layout, {
			data: { user: null },
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
			data: { user: { username: 'testuser' } },
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
	});

	it('opens user profile dropdown and shows logout option', async () => {
		const childSnippet = createRawSnippet(() => ({
			render: () => '<div>Content</div>'
		}));

		render(Layout, {
			data: { user: { username: 'dropdown-user' } },
			children: childSnippet
		});

		const userTrigger = screen.getByText('dropdown-user').closest('button');
		expect(userTrigger).not.toBeNull();
		
		await fireEvent.click(userTrigger!);

		// Radix menu uses portals by default, but it should be findable
		const logoutButton = await screen.findByRole('button', { name: /log out/i });
		expect(logoutButton).toBeInTheDocument();
	});

	it('opens theme switcher dropdown', async () => {
		const childSnippet = createRawSnippet(() => ({
			render: () => '<div>Content</div>'
		}));

		render(Layout, {
			data: { user: { username: 'dropdown-user' } },
			children: childSnippet
		});

		const themeTrigger = screen.getByRole('button', { name: /toggle theme/i });
		await fireEvent.click(themeTrigger);

		// The menu should open and show Light, Dark, System
		const lightOption = await screen.findByText('Light');
		expect(lightOption).toBeInTheDocument();
		expect(screen.getByText('Dark')).toBeInTheDocument();
		expect(screen.getByText('System')).toBeInTheDocument();
	});
});
