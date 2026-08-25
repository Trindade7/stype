/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import HistoryPage from './+page.svelte';

describe('History Page', () => {
	afterEach(() => {
		cleanup();
	});

	it('renders history page header and runs list', () => {
		const mockRuns = [
			{
				id: 1,
				mode: 'passage' as const,
				duration: null,
				wpm: 85,
				accuracy: 99,
				createdAt: new Date('2025-01-10T12:00:00Z'),
				timeElapsed: 40,
				passage: {
					source: 'Moby Dick',
					text: 'Call me Ishmael.'
				}
			}
		];

		render(HistoryPage, {
			data: {
				user: { id: 'user-1', username: 'testuser', createdAt: new Date() },
				runs: mockRuns
			} as any
		});

		expect(screen.getByRole('heading', { level: 1, name: 'Test History' })).toBeInTheDocument();
		expect(screen.getByText('85 WPM')).toBeInTheDocument();
		expect(screen.getByText('• 99% Acc')).toBeInTheDocument();
		expect(screen.getByText('Moby Dick')).toBeInTheDocument();
	});
});
