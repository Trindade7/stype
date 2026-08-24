/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
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
				passages: mockPassages
			},
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
				passages: []
			},
			form: { error: 'Text is required' }
		});

		expect(screen.getByText('Text is required')).toBeInTheDocument();
	});
});
