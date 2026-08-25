import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import TypingEngine from './TypingEngine.svelte';

describe('TypingEngine', () => {
	beforeEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it('renders correctly with given passage', () => {
		const passage = { id: 1, text: 'Hello', source: 'Test' };
		render(TypingEngine, { passage });

		// Should show passage source
		expect(screen.getByText('— Test')).toBeInTheDocument();

		// HUD should show 0 for WPM and 100% for Accuracy
		expect(screen.getByText('WPM')).toBeInTheDocument();
		expect(screen.getByText('ACC')).toBeInTheDocument();
		expect(screen.getByText('Time')).toBeInTheDocument();
	});

	it('updates typed text when input changes', async () => {
		const passage = { id: 1, text: 'Hi', source: 'Test' };
		const { container } = render(TypingEngine, { passage });

		const input = container.querySelector('input') as HTMLInputElement;
		expect(input).toBeInTheDocument();

		await fireEvent.input(input, { target: { value: 'H' } });
		
		// Ensure component doesn't crash on input
		expect(input.value).toBe('H');
	});

	it('respects initialMode, initialDuration, and initialZenMode props', () => {
		const passage = { id: 1, text: 'Hello', source: 'Test' };
		render(TypingEngine, {
			passage,
			initialMode: 'timed',
			initialDuration: 60,
			initialZenMode: true
		});

		expect(screen.getByRole('button', { name: '60s' })).toBeInTheDocument();
		expect(screen.getByText('Zen')).toBeInTheDocument();
	});

	it('renders duration buttons as disabled when initialMode is passage', async () => {
		const passage = { id: 1, text: 'Hello', source: 'Test' };
		render(TypingEngine, {
			passage,
			initialMode: 'passage',
			initialDuration: 30
		});

		const btn15 = screen.getByRole('button', { name: '15s' });
		const btn30 = screen.getByRole('button', { name: '30s' });
		const btn60 = screen.getByRole('button', { name: '60s' });

		expect(btn15).toBeInTheDocument();
		expect(btn30).toBeInTheDocument();
		expect(btn60).toBeInTheDocument();

		expect(btn15).toBeDisabled();
		expect(btn30).toBeDisabled();
		expect(btn60).toBeDisabled();

		expect(btn15).toHaveClass('opacity-50', 'pointer-events-none');
		expect(btn30).toHaveClass('opacity-50', 'pointer-events-none');
		expect(btn60).toHaveClass('opacity-50', 'pointer-events-none');

		// Clicking a disabled duration button should not update duration or cause state change
		await fireEvent.click(btn60);
		expect(btn60).not.toHaveClass('bg-zinc-800 text-zinc-100');
	});

	it('enables duration buttons when switching from passage to timed mode', async () => {
		const passage = { id: 1, text: 'Hello', source: 'Test' };
		render(TypingEngine, {
			passage,
			initialMode: 'passage',
			initialDuration: 30
		});

		const timedButton = screen.getByRole('button', { name: 'Timed' });
		await fireEvent.click(timedButton);

		const btn60 = screen.getByRole('button', { name: '60s' });
		expect(btn60).not.toBeDisabled();
		expect(btn60).not.toHaveClass('opacity-50', 'pointer-events-none');

		await fireEvent.click(btn60);
		expect(btn60).toHaveClass('bg-zinc-800 text-zinc-100');
	});

	it('hides live HUD metrics during active typing when Zen Mode is enabled', async () => {
		const passage = { id: 1, text: 'Hello world', source: 'Test' };
		const { container } = render(TypingEngine, {
			passage,
			initialZenMode: true
		});

		const input = container.querySelector('input') as HTMLInputElement;
		expect(input).toBeInTheDocument();

		// Before typing, toolbar is present
		expect(screen.getByText('Zen')).toBeInTheDocument();

		// Type first character -> active typing begins
		await fireEvent.input(input, { target: { value: 'H' } });

		// HUD metrics should be hidden during active typing in zen mode
		expect(screen.queryByText('WPM')).not.toBeInTheDocument();
		expect(screen.queryByText('ACC')).not.toBeInTheDocument();
	});

	it('toggles Zen Mode on toolbar button click', async () => {
		const passage = { id: 1, text: 'Hello world', source: 'Test' };
		const { container } = render(TypingEngine, {
			passage,
			initialZenMode: false
		});

		const zenButton = screen.getByRole('button', { name: /zen/i });
		await fireEvent.click(zenButton);

		const input = container.querySelector('input') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: 'H' } });

		// HUD should now be hidden
		expect(screen.queryByText('WPM')).not.toBeInTheDocument();
	});

	it('submits timeline snapshots and displays the timeline chart on result summary', async () => {
		const snapshots = [
			{ second: 1, wpm: 60, accuracy: 100 },
			{ second: 2, wpm: 75, accuracy: 95 }
		];
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				id: 1,
				passageId: 1,
				wpm: 75,
				accuracy: 95,
				timeElapsed: 2,
				correctChars: 2,
				incorrectChars: 0,
				extraChars: 0,
				missedChars: 0,
				timelineSnapshots: snapshots
			})
		});
		globalThis.fetch = fetchMock;

		const passage = { id: 1, text: 'Hi', source: 'Test' };
		const { container } = render(TypingEngine, { passage });

		const input = container.querySelector('input') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: 'H' } });
		await fireEvent.input(input, { target: { value: 'Hi' } });

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(callBody).toHaveProperty('timelineSnapshots');
		expect(Array.isArray(callBody.timelineSnapshots)).toBe(true);
		expect(callBody.timelineSnapshots.length).toBeGreaterThanOrEqual(1);

		// Result Summary should display chart
		expect(await screen.findByText('Speed (WPM)')).toBeInTheDocument();
		expect(await screen.findByText('Accuracy (%)')).toBeInTheDocument();
		expect(container.querySelector('svg')).toBeInTheDocument();
	});

	it('invokes custom onSave callback when provided on completion', async () => {
		const onSaveMock = vi.fn().mockResolvedValue({
			id: 42,
			passageId: 1,
			wpm: 80,
			accuracy: 100,
			timeElapsed: 1,
			timelineSnapshots: []
		});

		const passage = { id: 1, text: 'Hi', source: 'Test' };
		const { container } = render(TypingEngine, {
			passage,
			onSave: onSaveMock
		});

		const input = container.querySelector('input') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: 'H' } });
		await fireEvent.input(input, { target: { value: 'Hi' } });

		expect(onSaveMock).toHaveBeenCalledTimes(1);
		expect(onSaveMock.mock.calls[0][0].passageId).toBe(1);
		expect(await screen.findByText('80')).toBeInTheDocument();
	});

	it('invokes custom onNextPassage callback when tab or next button is triggered', async () => {
		const onNextMock = vi.fn();
		const passage = { id: 1, text: 'Hi', source: 'Test' };
		render(TypingEngine, {
			passage,
			onNextPassage: onNextMock
		});

		await fireEvent.keyDown(window, { key: 'Tab' });
		expect(onNextMock).toHaveBeenCalledTimes(1);
	});

	it('clears snapshots on reset and invokes onRestart', async () => {
		const onRestartMock = vi.fn();
		const passage = { id: 1, text: 'Hi', source: 'Test' };
		const { container } = render(TypingEngine, {
			passage,
			onRestart: onRestartMock
		});

		const input = container.querySelector('input') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: 'H' } });
		await fireEvent.keyDown(window, { key: 'Escape' });

		expect(input.value).toBe('');
		expect(onRestartMock).toHaveBeenCalledTimes(1);
	});

	it('automatically focuses the typing input on mount and highlights container', () => {
		const passage = { id: 1, text: 'Hello', source: 'Test' };
		const { container } = render(TypingEngine, { passage });

		const input = container.querySelector('input') as HTMLInputElement;
		expect(input).toHaveAttribute('autofocus');
		expect(document.activeElement).toBe(input);

		const typingArea = input.closest('div[class*="rounded-xl"]');
		expect(typingArea).toHaveClass('border-zinc-700');
	});

	it('refocuses input when window receives focus event', async () => {
		const passage = { id: 1, text: 'Hello', source: 'Test' };
		const { container } = render(TypingEngine, { passage });

		const input = container.querySelector('input') as HTMLInputElement;
		input.blur();
		expect(document.activeElement).not.toBe(input);

		// Trigger window focus
		await fireEvent.focus(window);
		expect(document.activeElement).toBe(input);
	});

	it('dynamically updates container border styling on blur and focus transitions', async () => {
		const passage = { id: 1, text: 'Hello', source: 'Test' };
		const { container } = render(TypingEngine, { passage });

		const input = container.querySelector('input') as HTMLInputElement;
		const typingArea = input.closest('div[class*="rounded-xl"]')!;

		// Initially focused on mount (undimmed)
		expect(typingArea).toHaveClass('border-zinc-700');

		// Blur input (dimmed)
		await fireEvent.blur(input);
		expect(typingArea).not.toHaveClass('border-zinc-700');
		expect(typingArea).toHaveClass('border-zinc-800/40');

		// Refocus input (undimmed)
		await fireEvent.focus(input);
		expect(typingArea).toHaveClass('border-zinc-700');
	});

	it('toggles character cursor underline pulse animation based on focus state', async () => {
		const passage = { id: 1, text: 'Hello', source: 'Test' };
		const { container } = render(TypingEngine, { passage });

		const input = container.querySelector('input') as HTMLInputElement;
		const firstCharSpan = container.querySelector('span.relative') as HTMLElement;
		expect(firstCharSpan).toBeInTheDocument();
		expect(firstCharSpan.textContent).toBe('H');

		// While focused, current character has pulse animation
		expect(firstCharSpan.className).toContain('after:animate-pulse');

		// Blur input -> pulse animation removed, remains static
		await fireEvent.blur(input);
		expect(firstCharSpan.className).not.toContain('after:animate-pulse');

		// Refocus input -> pulse animation restored
		await fireEvent.focus(input);
		expect(firstCharSpan.className).toContain('after:animate-pulse');
	});

	it('refocuses typing engine and captures keystrokes when typed while blurred', async () => {
		const passage = { id: 1, text: 'Hello', source: 'Test' };
		const { container } = render(TypingEngine, { passage });

		const input = container.querySelector('input') as HTMLInputElement;
		const typingArea = input.closest('div[class*="rounded-xl"]')!;

		// Explicitly blur the input
		await fireEvent.blur(input);
		expect(typingArea).not.toHaveClass('border-zinc-700');

		// Press 'H' globally while blurred
		await fireEvent.keyDown(window, { key: 'H' });

		// Input should refocus and capture 'H'
		expect(document.activeElement).toBe(input);
		expect(input.value).toBe('H');
		expect(typingArea).toHaveClass('border-zinc-700');
	});

	it('refocuses typing engine and handles backspace when blurred', async () => {
		const passage = { id: 1, text: 'Hello', source: 'Test' };
		const { container } = render(TypingEngine, { passage });

		const input = container.querySelector('input') as HTMLInputElement;
		const typingArea = input.closest('div[class*="rounded-xl"]')!;

		await fireEvent.input(input, { target: { value: 'He' } });
		expect(input.value).toBe('He');

		// Blur input
		await fireEvent.blur(input);
		expect(typingArea).not.toHaveClass('border-zinc-700');

		// Press Backspace on window
		await fireEvent.keyDown(window, { key: 'Backspace' });

		// Input should refocus and value should be 'H'
		expect(document.activeElement).toBe(input);
		expect(input.value).toBe('H');
		expect(typingArea).toHaveClass('border-zinc-700');
	});

	it('does not steal keystrokes when focus is inside another editable element', async () => {
		const passage = { id: 1, text: 'Hello', source: 'Test' };
		const { container } = render(TypingEngine, { passage });

		const input = container.querySelector('input') as HTMLInputElement;

		// Create another input on document
		const otherInput = document.createElement('input');
		otherInput.type = 'text';
		document.body.appendChild(otherInput);
		otherInput.focus();
		expect(document.activeElement).toBe(otherInput);

		// Press key
		await fireEvent.keyDown(window, { key: 'H' });

		// TypingEngine input should not have received the key
		expect(input.value).toBe('');
		expect(document.activeElement).toBe(otherInput);

		document.body.removeChild(otherInput);
	});

	it('ignores modifier shortcuts and navigation keys when blurred', async () => {
		const passage = { id: 1, text: 'Hello', source: 'Test' };
		const { container } = render(TypingEngine, { passage });

		const input = container.querySelector('input') as HTMLInputElement;
		input.blur();

		// Trigger modifier combinations and navigation keys
		await fireEvent.keyDown(window, { key: 'c', ctrlKey: true });
		await fireEvent.keyDown(window, { key: 'v', metaKey: true });
		await fireEvent.keyDown(window, { key: 'k', altKey: true });
		await fireEvent.keyDown(window, { key: 'Shift' });
		await fireEvent.keyDown(window, { key: 'ArrowDown' });

		expect(input.value).toBe('');
		expect(document.activeElement).not.toBe(input);
	});
});
