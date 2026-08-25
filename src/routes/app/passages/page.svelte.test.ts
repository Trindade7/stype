/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/svelte';
import PassagesPage from './+page.svelte';

describe('Passages Management Page', () => {
	afterEach(() => {
		cleanup();
	});

	const mockPassages = [
		{
			id: 1,
			text: 'Short seeded text.',
			source: 'Seeded Book',
			userId: null,
			createdAt: new Date()
		},
		{
			id: 2,
			text: 'Custom passage written by user with multiple words to test length classification accurately.',
			source: 'User Note',
			userId: 'user-1',
			createdAt: new Date()
		}
	];

	it('renders passage dashboard with seeded and custom passages', () => {
		render(PassagesPage, {
			data: {
				user: { id: 'user-1', username: 'testuser', createdAt: new Date() },
				passages: mockPassages,
				settings: null
			} as any,
			form: null
		});

		expect(screen.getByText('Passages')).toBeInTheDocument();
		expect(screen.getByText('New Passage')).toBeInTheDocument();

		// Check badges
		expect(screen.getByText('Seeded')).toBeInTheDocument();
		expect(screen.getByText('Custom')).toBeInTheDocument();
		
		// Check source and text
		expect(screen.getByText('Seeded Book')).toBeInTheDocument();
		expect(screen.getByText('User Note')).toBeInTheDocument();
		expect(screen.getByText('Short seeded text.')).toBeInTheDocument();
	});

	it('displays error message when form error is provided', () => {
		render(PassagesPage, {
			data: {
				user: { id: 'user-1', username: 'testuser', createdAt: new Date() },
				passages: [],
				settings: null
			} as any,
			form: { error: 'Text is required' }
		});

		expect(screen.getByText('Text is required')).toBeInTheDocument();
	});

	it('paginates passages, showing only 10 per page initially, and navigates to the next page', async () => {
		const manyPassages = Array.from({ length: 12 }).map((_, i) => ({
			id: i + 1,
			text: `Passage content ${i + 1}`,
			source: `Source ${i + 1}`,
			userId: null,
			createdAt: new Date()
		}));

		render(PassagesPage, {
			data: {
				user: { id: 'user-1', username: 'testuser', createdAt: new Date() },
				passages: manyPassages,
				settings: null
			} as any,
			form: null
		});

		// Should show passage 1 to 10 initially
		expect(screen.getByText('Source 1')).toBeInTheDocument();
		expect(screen.getByText('Source 10')).toBeInTheDocument();
		
		// Should not show passage 11 yet
		expect(screen.queryByText('Source 11')).not.toBeInTheDocument();

		const prevButton = screen.getByRole('button', { name: /previous/i });
		const nextButton = screen.getByRole('button', { name: /next/i });

		// Previous button should be disabled on page 1
		expect(prevButton).toBeDisabled();
		expect(nextButton).not.toBeDisabled();

		// Click next
		await fireEvent.click(nextButton);

		// Now 1 should be hidden, 11 and 12 should be visible
		expect(screen.queryByText('Source 1')).not.toBeInTheDocument();
		expect(screen.getByText('Source 11')).toBeInTheDocument();
		expect(screen.getByText('Source 12')).toBeInTheDocument();

		// Next button should be disabled on page 2 (last page)
		expect(prevButton).not.toBeDisabled();
		expect(nextButton).toBeDisabled();
	});

	it('opens create passage dialog with Textarea and source inputs', async () => {
		render(PassagesPage, {
			data: {
				user: { id: 'user-1', username: 'testuser', createdAt: new Date() },
				passages: mockPassages,
				settings: null
			} as any,
			form: null
		});

		const newPassageButton = screen.getByRole('button', { name: /new passage/i });
		await fireEvent.click(newPassageButton);

		expect(screen.getByRole('heading', { level: 2, name: /create custom passage/i })).toBeInTheDocument();
		expect(screen.getByPlaceholderText(/type or paste passage text here/i)).toBeInTheDocument();
		expect(screen.getByPlaceholderText(/e\.g\. 1984, George Orwell/i)).toBeInTheDocument();
	});

	it('opens edit passage dialog for custom passage with Textarea populated', async () => {
		render(PassagesPage, {
			data: {
				user: { id: 'user-1', username: 'testuser', createdAt: new Date() },
				passages: mockPassages,
				settings: null
			} as any,
			form: null
		});

		// Find edit button for custom passage
		const editTrigger = screen.getByRole('button', { name: /edit passage/i });
		await fireEvent.click(editTrigger);

		expect(screen.getByRole('heading', { level: 2, name: /edit passage/i })).toBeInTheDocument();
		expect(screen.getByDisplayValue(mockPassages[1].text)).toBeInTheDocument();
		expect(screen.getByDisplayValue(mockPassages[1].source)).toBeInTheDocument();
	});
});
