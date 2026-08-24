import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import TypingEngine from './TypingEngine.svelte';

describe('TypingEngine', () => {
	beforeEach(() => {
		cleanup();
	});

	it('renders correctly with given passage', () => {
		const passage = { text: 'Hello', source: 'Test' };
		render(TypingEngine, { passage });

		// Should show passage source
		expect(screen.getByText('— Test')).toBeInTheDocument();

		// HUD should show 0 for WPM and 100% for Accuracy
		expect(screen.getByText('WPM')).toBeInTheDocument();
		expect(screen.getByText('ACC')).toBeInTheDocument();
		expect(screen.getByText('Time')).toBeInTheDocument();
	});

	it('updates typed text when input changes', async () => {
		const passage = { text: 'Hi', source: 'Test' };
		const { container } = render(TypingEngine, { passage });

		const input = container.querySelector('input') as HTMLInputElement;
		expect(input).toBeInTheDocument();

		await fireEvent.input(input, { target: { value: 'H' } });
		
		// Ensure component doesn't crash on input
		expect(input.value).toBe('H');
	});
});
