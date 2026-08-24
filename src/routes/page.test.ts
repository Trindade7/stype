/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import Page from './+page.svelte';

describe('Main Page Content', () => {
	afterEach(() => {
		cleanup();
	});

	it('renders main page content with user greeting', () => {
		render(Page, {
			data: { user: { username: 'john_doe' } }
		});

		expect(screen.getByText('Ready to type')).toBeInTheDocument();
		expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
		expect(screen.getByText('john_doe')).toBeInTheDocument();
	});
});
