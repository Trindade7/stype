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
			data: {
				user: { id: 'test-id', username: 'john_doe', createdAt: new Date() },
				passage: null as any,
				settings: {
					userId: 'test-id',
					mode: 'passage',
					duration: 30,
					passageLength: 'all',
					zenMode: false,
					theme: 'system',
					createdAt: new Date(),
					updatedAt: new Date()
				}
			}
		});

		expect(screen.getByText('Ready to type')).toBeInTheDocument();
		expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
		expect(screen.getByText('john_doe')).toBeInTheDocument();
	});

	it('automatically focuses typing input when passage is loaded on user dashboard', () => {
		render(Page, {
			data: {
				user: { id: 'test-id', username: 'john_doe', createdAt: new Date() },
				passage: { id: 10, text: 'Dashboard typing passage', source: 'Source', userId: null, createdAt: new Date() },
				settings: {
					userId: 'test-id',
					mode: 'passage',
					duration: 30,
					passageLength: 'all',
					zenMode: false,
					theme: 'system',
					createdAt: new Date(),
					updatedAt: new Date()
				}
			}
		});

		const input = document.querySelector('input[type="text"]') as HTMLInputElement;
		expect(input).toBeInTheDocument();
		expect(document.activeElement).toBe(input);
	});

	it('constrains authenticated app typing page within viewport with overflow-hidden and flex layout', () => {
		const { container } = render(Page, {
			data: {
				user: { id: 'test-id', username: 'john_doe', createdAt: new Date() },
				passage: { id: 10, text: 'Dashboard typing passage', source: 'Source', userId: null, createdAt: new Date() },
				settings: {
					userId: 'test-id',
					mode: 'passage',
					duration: 30,
					passageLength: 'all',
					zenMode: false,
					theme: 'system',
					createdAt: new Date(),
					updatedAt: new Date()
				}
			}
		});

		const pageWrapper = container.firstElementChild as HTMLElement;
		expect(pageWrapper).toHaveClass('overflow-hidden', 'flex-1', 'min-h-0', 'h-[calc(100dvh-69px)]');
	});
});
