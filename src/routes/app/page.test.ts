/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/svelte';
import Page from './+page.svelte';
import { invalidateAll } from '$app/navigation';
import { viewportLayout } from '$lib/viewport';

vi.mock('$app/navigation', () => ({
	invalidateAll: vi.fn()
}));

const mockUser = {
	id: 'test-id',
	username: 'john_doe',
	email: 'john@example.com',
	name: 'John Doe',
	role: 'user' as const,
	emailConfirmed: true,
	createdAt: new Date()
};

describe('Main Page Content', () => {
	afterEach(() => {
		viewportLayout.reset();
		cleanup();
	});

	it('renders main page content with user greeting', () => {
		render(Page, {
			data: {
				user: mockUser,
				passage: null as any,
				settings: {
					userId: 'test-id',
					mode: 'passage',
					duration: 30,
					passageLength: 'all',
					zenMode: false,
					theme: 'system',
					scrollMode: 'center',
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
				user: mockUser,
				passage: { id: 10, text: 'Dashboard typing passage', source: 'Source', userId: null, createdAt: new Date() },
				settings: {
					userId: 'test-id',
					mode: 'passage',
					duration: 30,
					passageLength: 'all',
					zenMode: false,
					theme: 'system',
					scrollMode: 'center',
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
				user: mockUser,
				passage: { id: 10, text: 'Dashboard typing passage', source: 'Source', userId: null, createdAt: new Date() },
				settings: {
					userId: 'test-id',
					mode: 'passage',
					duration: 30,
					passageLength: 'all',
					zenMode: false,
					theme: 'system',
					scrollMode: 'center',
					createdAt: new Date(),
					updatedAt: new Date()
				}
			}
		});

		const pageWrapper = container.firstElementChild as HTMLElement;
		expect(pageWrapper).toHaveClass('overflow-hidden', 'flex-1', 'min-h-0', 'h-[calc(100dvh-69px)]');
	});

	it('passes user scrollMode setting into TypingEngine', () => {
		const { container } = render(Page, {
			data: {
				user: mockUser,
				passage: { id: 10, text: 'Dashboard typing passage', source: 'Source', userId: null, createdAt: new Date() },
				settings: {
					userId: 'test-id',
					mode: 'passage',
					duration: 30,
					passageLength: 'all',
					zenMode: false,
					theme: 'system',
					scrollMode: 'step',
					createdAt: new Date(),
					updatedAt: new Date()
				}
			}
		});

		expect(container.querySelector('[data-scroll-mode="step"]')).toBeInTheDocument();
	});

	it('triggers invalidateAll to load fresh passage when Tab is pressed on Result Summary in authenticated app', async () => {
		render(Page, {
			data: {
				user: mockUser,
				passage: { id: 10, text: 'Hi', source: 'Source', userId: null, createdAt: new Date() },
				settings: {
					userId: 'test-id',
					mode: 'passage',
					duration: 30,
					passageLength: 'all',
					zenMode: false,
					theme: 'system',
					scrollMode: 'center',
					createdAt: new Date(),
					updatedAt: new Date()
				}
			}
		});

		const input = document.querySelector('input[type="text"]') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: 'H' } });
		await fireEvent.input(input, { target: { value: 'Hi' } });

		expect(await screen.findByText('Passage Complete')).toBeInTheDocument();

		await fireEvent.keyDown(window, { key: 'Tab' });
		expect(invalidateAll).toHaveBeenCalledTimes(1);
	});

	it('clears passageId query parameter from URL and calls invalidateAll when advancing with Next Passage', async () => {
		window.history.pushState({}, '', '/app?passageId=10');

		render(Page, {
			data: {
				user: mockUser,
				passage: { id: 10, text: 'Hi', source: 'Source', userId: null, createdAt: new Date() },
				settings: {
					userId: 'test-id',
					mode: 'passage',
					duration: 30,
					passageLength: 'all',
					zenMode: false,
					theme: 'system',
					scrollMode: 'center',
					createdAt: new Date(),
					updatedAt: new Date()
				}
			}
		});

		const input = document.querySelector('input[type="text"]') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: 'H' } });
		await fireEvent.input(input, { target: { value: 'Hi' } });

		expect(await screen.findByText('Passage Complete')).toBeInTheDocument();

		const nextButton = screen.getByRole('button', { name: /next passage/i });
		await fireEvent.click(nextButton);

		expect(window.location.search).toBe('');
		expect(invalidateAll).toHaveBeenCalled();
	});

	it('retains selected passage and keeps URL state when Retry is triggered', async () => {
		window.history.pushState({}, '', '/app?passageId=10');

		render(Page, {
			data: {
				user: mockUser,
				passage: { id: 10, text: 'Hi', source: 'Unique Source Name', userId: null, createdAt: new Date() },
				settings: {
					userId: 'test-id',
					mode: 'passage',
					duration: 30,
					passageLength: 'all',
					zenMode: false,
					theme: 'system',
					scrollMode: 'center',
					createdAt: new Date(),
					updatedAt: new Date()
				}
			}
		});

		const input = document.querySelector('input[type="text"]') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: 'H' } });
		await fireEvent.input(input, { target: { value: 'Hi' } });

		expect(await screen.findByText('Passage Complete')).toBeInTheDocument();

		await fireEvent.keyDown(window, { key: ' ' });

		expect(screen.queryByText('Passage Complete')).not.toBeInTheDocument();
		expect(screen.getByText('— Unique Source Name')).toBeInTheDocument();
	});

	it('transitions to compact layout with shrunk padding and 100dvh height when typing on narrow viewports', async () => {
		viewportLayout.setViewportDimensions(375, 667);

		const { container } = render(Page, {
			data: {
				user: mockUser,
				passage: { id: 10, text: 'Hi', source: 'Source', userId: null, createdAt: new Date() },
				settings: {
					userId: 'test-id',
					mode: 'passage',
					duration: 30,
					passageLength: 'all',
					zenMode: false,
					theme: 'system',
					scrollMode: 'center',
					createdAt: new Date(),
					updatedAt: new Date()
				}
			}
		});

		const pageWrapper = container.firstElementChild as HTMLElement;
		const input = document.querySelector('input[type="text"]') as HTMLInputElement;

		await waitFor(() => {
			expect(pageWrapper).toHaveClass('px-3', 'py-2', 'h-[100dvh]');
			expect(pageWrapper).not.toHaveClass('px-6', 'py-6');
		});

		// Blur input
		await fireEvent.blur(input);

		await waitFor(() => {
			expect(pageWrapper).toHaveClass('px-6', 'py-6', 'h-[calc(100dvh-69px)]');
			expect(pageWrapper).not.toHaveClass('px-3', 'py-2');
		});
	});
});
