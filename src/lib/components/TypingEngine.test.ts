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

	it('keeps top toolbar mounted with zero opacity and disabled pointer events during active typing, restoring on reset', async () => {
		const passage = { id: 1, text: 'Hello world', source: 'Test' };
		const { container } = render(TypingEngine, { passage });

		const toolbar = screen.getByTestId('toolbar');
		expect(toolbar).toBeInTheDocument();
		expect(toolbar).toHaveClass('opacity-100');
		expect(toolbar).not.toHaveClass('opacity-0', 'pointer-events-none');

		const input = container.querySelector('input') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: 'H' } });

		// Toolbar remains in DOM during active typing
		expect(screen.getByTestId('toolbar')).toBeInTheDocument();
		expect(toolbar).toHaveClass('opacity-0', 'pointer-events-none');
		expect(toolbar).not.toHaveClass('opacity-100');

		// Reset restores toolbar opacity
		await fireEvent.keyDown(window, { key: 'Escape' });
		expect(screen.getByTestId('toolbar')).toBeInTheDocument();
		expect(toolbar).toHaveClass('opacity-100');
		expect(toolbar).not.toHaveClass('opacity-0', 'pointer-events-none');
	});

	it('keeps bottom controls mounted with zero opacity and disabled pointer events during active typing and test finish, restoring on reset', async () => {
		const passage = { id: 1, text: 'Hi', source: 'Test' };
		const { container } = render(TypingEngine, { passage });

		const controls = screen.getByTestId('bottom-controls');
		expect(controls).toBeInTheDocument();
		expect(controls).toHaveClass('opacity-100');
		expect(controls).not.toHaveClass('opacity-0', 'pointer-events-none');

		const input = container.querySelector('input') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: 'H' } });

		// Controls remain in DOM during active typing
		expect(screen.getByTestId('bottom-controls')).toBeInTheDocument();
		expect(controls).toHaveClass('opacity-0', 'pointer-events-none');

		// Complete the test
		await fireEvent.input(input, { target: { value: 'Hi' } });
		expect(await screen.findByText('Passage Complete')).toBeInTheDocument();

		// Controls remain mounted in DOM when finished
		expect(screen.getByTestId('bottom-controls')).toBeInTheDocument();
		expect(controls).toHaveClass('opacity-0', 'pointer-events-none');

		// Reset restores controls opacity
		await fireEvent.keyDown(window, { key: 'Escape' });
		expect(screen.getByTestId('bottom-controls')).toBeInTheDocument();
		expect(controls).toHaveClass('opacity-100');
		expect(controls).not.toHaveClass('opacity-0', 'pointer-events-none');
	});

	it('in Zen Mode, keeps HUD mounted and fades to zero opacity when typing begins, restoring on reset', async () => {
		const passage = { id: 1, text: 'Hello world', source: 'Test' };
		const { container } = render(TypingEngine, {
			passage,
			initialZenMode: true
		});

		const hud = screen.getByTestId('hud');
		expect(hud).toBeInTheDocument();
		expect(hud).toHaveClass('opacity-100');

		const input = container.querySelector('input') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: 'H' } });

		// HUD stays mounted in DOM, but is zero opacity with pointer events disabled
		expect(screen.getByTestId('hud')).toBeInTheDocument();
		expect(hud).toHaveClass('opacity-0', 'pointer-events-none');

		// Reset restores HUD opacity
		await fireEvent.keyDown(window, { key: 'Escape' });
		expect(screen.getByTestId('hud')).toBeInTheDocument();
		expect(hud).toHaveClass('opacity-100');
	});

	it('with Zen Mode disabled, keeps HUD visible and responsive throughout active test run', async () => {
		const passage = { id: 1, text: 'Hello world', source: 'Test' };
		const { container } = render(TypingEngine, {
			passage,
			initialZenMode: false
		});

		const hud = screen.getByTestId('hud');
		expect(hud).toHaveClass('opacity-100');

		const input = container.querySelector('input') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: 'H' } });

		// With zen mode disabled, HUD remains visible during active typing
		expect(screen.getByTestId('hud')).toBeInTheDocument();
		expect(hud).toHaveClass('opacity-100');
		expect(hud).not.toHaveClass('opacity-0', 'pointer-events-none');
	});

	it('toggles Zen Mode on toolbar button click and fades HUD when typing', async () => {
		const passage = { id: 1, text: 'Hello world', source: 'Test' };
		const { container } = render(TypingEngine, {
			passage,
			initialZenMode: false
		});

		const zenButton = screen.getByRole('button', { name: /zen/i });
		await fireEvent.click(zenButton);

		const hud = screen.getByTestId('hud');
		const input = container.querySelector('input') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: 'H' } });

		// HUD should remain in DOM with zero opacity and disabled pointer events
		expect(screen.getByTestId('hud')).toBeInTheDocument();
		expect(hud).toHaveClass('opacity-0', 'pointer-events-none');
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

	it('retains default non-pointer cursor on the invisible character capture input', () => {
		const passage = { id: 1, text: 'Hello', source: 'Test' };
		const { container } = render(TypingEngine, { passage });

		const input = container.querySelector('input') as HTMLInputElement;
		expect(input).toBeInTheDocument();
		expect(input).toHaveClass('cursor-default');
		expect(input).not.toHaveClass('cursor-pointer');
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

	it('fits typing container to content without overflowing and enables internal text scrolling', () => {
		const passage = { id: 1, text: 'Hello viewport layout lock test', source: 'Test' };
		const { container } = render(TypingEngine, { passage });

		const rootEngine = container.firstElementChild as HTMLElement;
		expect(rootEngine).toHaveClass('min-h-0', 'max-h-full');

		const typingArea = container.querySelector('input')?.parentElement as HTMLElement;
		expect(typingArea).toHaveClass('min-h-0', 'max-h-full', 'overflow-hidden');
		expect(typingArea).not.toHaveClass('flex-1');

		const textScrollContainer = container.querySelector('div[class*="overflow-y-auto"]') as HTMLElement;
		expect(textScrollContainer).toBeInTheDocument();
		expect(textScrollContainer).toHaveClass('overflow-y-auto');
	});

	it('renders ResultSummary inside an internally scrollable container (overflow-y-auto max-h-full) when completed', async () => {
		const passage = { id: 1, text: 'Hi', source: 'Test' };
		const { container } = render(TypingEngine, { passage });

		const input = container.querySelector('input') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: 'H' } });
		await fireEvent.input(input, { target: { value: 'Hi' } });

		// Test is completed, ResultSummary is rendered
		expect(await screen.findByText('Passage Complete')).toBeInTheDocument();

		const resultSummaryWrapper = screen.getByText('Passage Complete').closest('div[class*="overflow-y-auto"]');
		expect(resultSummaryWrapper).toBeInTheDocument();
		expect(resultSummaryWrapper).toHaveClass('overflow-y-auto', 'max-h-full');
	});

	it('renders both Next Passage and Retry buttons on Result Summary upon test completion', async () => {
		const passage = { id: 1, text: 'Hi', source: 'Test' };
		const { container } = render(TypingEngine, { passage });

		const input = container.querySelector('input') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: 'H' } });
		await fireEvent.input(input, { target: { value: 'Hi' } });

		expect(await screen.findByText('Passage Complete')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /next passage/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
	});

	it('retries the exact same passage when pressing Space on Result Summary', async () => {
		const onNextPassageMock = vi.fn();
		const passage = { id: 42, text: 'Hi', source: 'Drill Source' };
		const { container } = render(TypingEngine, {
			passage,
			onNextPassage: onNextPassageMock
		});

		const input = container.querySelector('input') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: 'H' } });
		await fireEvent.input(input, { target: { value: 'Hi' } });

		expect(await screen.findByText('Passage Complete')).toBeInTheDocument();

		// Press Space on window using fireEvent to flush Svelte reactivity
		const preventDefaultSpy = vi.fn();
		await fireEvent.keyDown(window, { key: ' ', preventDefault: preventDefaultSpy });

		// Result summary closes and typing input resets on the SAME passage
		expect(screen.queryByText('Passage Complete')).not.toBeInTheDocument();
		expect(screen.getByText('— Drill Source')).toBeInTheDocument();
		const freshInput = container.querySelector('input') as HTMLInputElement;
		expect(freshInput.value).toBe('');
		// onNextPassage was NOT called (no passage rotation)
		expect(onNextPassageMock).not.toHaveBeenCalled();
	});

	it('advances to next passage when pressing Tab on Result Summary', async () => {
		const onNextPassageMock = vi.fn();
		const passage = { id: 42, text: 'Hi', source: 'First Passage' };
		const { container } = render(TypingEngine, {
			passage,
			onNextPassage: onNextPassageMock
		});

		const input = container.querySelector('input') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: 'H' } });
		await fireEvent.input(input, { target: { value: 'Hi' } });

		expect(await screen.findByText('Passage Complete')).toBeInTheDocument();

		// Press Tab on window
		await fireEvent.keyDown(window, { key: 'Tab' });

		// onNextPassage was called to load a fresh passage
		expect(onNextPassageMock).toHaveBeenCalledTimes(1);
	});

	it('retries the exact same passage when clicking Retry button on Result Summary', async () => {
		const onNextPassageMock = vi.fn();
		const passage = { id: 42, text: 'Hi', source: 'Drill Source' };
		const { container } = render(TypingEngine, {
			passage,
			onNextPassage: onNextPassageMock
		});

		const input = container.querySelector('input') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: 'H' } });
		await fireEvent.input(input, { target: { value: 'Hi' } });

		expect(await screen.findByText('Passage Complete')).toBeInTheDocument();

		const retryBtn = screen.getByRole('button', { name: /retry/i });
		await fireEvent.click(retryBtn);

		expect(screen.queryByText('Passage Complete')).not.toBeInTheDocument();
		const freshInput = container.querySelector('input') as HTMLInputElement;
		expect(freshInput.value).toBe('');
		expect(onNextPassageMock).not.toHaveBeenCalled();
	});

	it('advances to next passage when clicking Next Passage button on Result Summary', async () => {
		const onNextPassageMock = vi.fn();
		const passage = { id: 42, text: 'Hi', source: 'First Passage' };
		const { container } = render(TypingEngine, {
			passage,
			onNextPassage: onNextPassageMock
		});

		const input = container.querySelector('input') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: 'H' } });
		await fireEvent.input(input, { target: { value: 'Hi' } });

		expect(await screen.findByText('Passage Complete')).toBeInTheDocument();

		const nextBtn = screen.getByRole('button', { name: /next passage/i });
		await fireEvent.click(nextBtn);

		expect(onNextPassageMock).toHaveBeenCalledTimes(1);
	});

	describe('auto-scrolling behavior across scroll modes', () => {
		function setupContainerLayout(containerEl: HTMLElement, height = 200, top = 50) {
			Object.defineProperty(containerEl, 'clientHeight', { value: height, configurable: true });
			vi.spyOn(containerEl, 'getBoundingClientRect').mockReturnValue({
				top,
				bottom: top + height,
				height,
				left: 0,
				right: 400,
				width: 400,
				x: 0,
				y: top,
				toJSON: () => {}
			});
			if (!containerEl.scrollTo) {
				containerEl.scrollTo = vi.fn((options: any) => {
					if (typeof options === 'object' && options !== null && 'top' in options) {
						containerEl.scrollTop = options.top;
					}
				});
			} else {
				vi.spyOn(containerEl, 'scrollTo').mockImplementation((options: any) => {
					if (typeof options === 'object' && options !== null && 'top' in options) {
						containerEl.scrollTop = options.top;
					}
				});
			}
		}

		function mockActiveLine(scrollContainer: HTMLElement, lineTop: number, lineHeight = 30) {
			const spans = scrollContainer.querySelectorAll('span[data-char-index]');
			for (const span of spans) {
				vi.spyOn(span, 'getBoundingClientRect').mockReturnValue({
					top: lineTop,
					bottom: lineTop + lineHeight,
					height: lineHeight,
					left: 0,
					right: 20,
					width: 20,
					x: 0,
					y: lineTop,
					toJSON: () => {}
				});
			}
		}

		it('accepts initialScrollMode and scrollMode props defaulting to center', () => {
			const passage = { id: 1, text: 'Hello', source: 'Test' };
			const { container } = render(TypingEngine, {
				passage,
				initialScrollMode: 'step'
			});

			const scrollContainer = container.querySelector('div[class*="overflow-y-auto pr-1"]') as HTMLElement;
			expect(scrollContainer).toBeInTheDocument();
		});

		it('in center mode, advancing keystrokes scroll the passage container to keep active line centered', async () => {
			const passage = { id: 1, text: 'First line text\nSecond line text\nThird line text', source: 'Test' };
			const { container } = render(TypingEngine, {
				passage,
				initialScrollMode: 'center'
			});

			const scrollContainer = container.querySelector('div[class*="overflow-y-auto pr-1"]') as HTMLElement;
			setupContainerLayout(scrollContainer, 200, 50); // visible top is 50, center is at 50 + 100 = 150

			const input = container.querySelector('input') as HTMLInputElement;

			// Advance typing past line 1 into line 2 where active line center is at 180 + 15 = 195 (below container center 150)
			mockActiveLine(scrollContainer, 180, 30);
			await fireEvent.input(input, { target: { value: 'First line text\nS' } });

			expect(scrollContainer.scrollTop).toBeGreaterThan(0);
			expect(scrollContainer.scrollTo).toHaveBeenCalled();
		});

		it('in step mode, scrolls container down in stepped increments when approaching bottom boundary', async () => {
			const passage = { id: 1, text: 'First line text\nSecond line text\nThird line text', source: 'Test' };
			const { container } = render(TypingEngine, {
				passage,
				initialScrollMode: 'step'
			});

			const scrollContainer = container.querySelector('div[class*="overflow-y-auto pr-1"]') as HTMLElement;
			setupContainerLayout(scrollContainer, 200, 50); // visible: 50 to 250. bottom threshold: 250 - 30 = 220

			const input = container.querySelector('input') as HTMLInputElement;

			// Mock position approaching bottom boundary: top = 225, bottom = 255 (crosses 220 threshold)
			mockActiveLine(scrollContainer, 225, 30);
			await fireEvent.input(input, { target: { value: 'First line text\nS' } });

			expect(scrollContainer.scrollTop).toBeGreaterThanOrEqual(60);
		});

		it('in manual mode, automatic container scrolling is disabled', async () => {
			const passage = { id: 1, text: 'First line text\nSecond line text\nThird line text', source: 'Test' };
			const { container } = render(TypingEngine, {
				passage,
				initialScrollMode: 'manual'
			});

			const scrollContainer = container.querySelector('div[class*="overflow-y-auto pr-1"]') as HTMLElement;
			setupContainerLayout(scrollContainer, 200, 50);
			scrollContainer.scrollTop = 10;

			const input = container.querySelector('input') as HTMLInputElement;
			mockActiveLine(scrollContainer, 240, 30);
			await fireEvent.input(input, { target: { value: 'First line text\nS' } });

			// In manual mode, scrollTop remains unchanged at 10
			expect(scrollContainer.scrollTop).toBe(10);
		});

		it('backspacing across line boundaries keeps the active line visible', async () => {
			const passage = { id: 1, text: 'Line 1\nLine 2\nLine 3', source: 'Test' };
			const { container } = render(TypingEngine, {
				passage,
				initialScrollMode: 'center'
			});

			const scrollContainer = container.querySelector('div[class*="overflow-y-auto pr-1"]') as HTMLElement;
			setupContainerLayout(scrollContainer, 200, 50);
			scrollContainer.scrollTop = 80;

			const input = container.querySelector('input') as HTMLInputElement;

			// Advance to line 2
			mockActiveLine(scrollContainer, 180, 30);
			await fireEvent.input(input, { target: { value: 'Line 1\nL' } });

			// Now backspace to Line 1 where line is higher up
			mockActiveLine(scrollContainer, 60, 30); // center is 75, container center is 150 -> delta -75
			await fireEvent.input(input, { target: { value: 'Line 1' } });

			expect(scrollContainer.scrollTop).toBeLessThan(80);
		});

		it('resets scroll position to 0 on Escape (restart)', async () => {
			const passage = { id: 1, text: 'Hello world', source: 'Test' };
			const { container } = render(TypingEngine, { passage });

			const scrollContainer = container.querySelector('div[class*="overflow-y-auto pr-1"]') as HTMLElement;
			scrollContainer.scrollTop = 120;

			await fireEvent.keyDown(window, { key: 'Escape' });

			expect(scrollContainer.scrollTop).toBe(0);
		});

		it('resets scroll position to 0 on Tab (next passage)', async () => {
			const passage = { id: 1, text: 'Hello world', source: 'Test' };
			const { container } = render(TypingEngine, { passage });

			const scrollContainer = container.querySelector('div[class*="overflow-y-auto pr-1"]') as HTMLElement;
			scrollContainer.scrollTop = 150;

			await fireEvent.keyDown(window, { key: 'Tab' });

			expect(scrollContainer.scrollTop).toBe(0);
		});
	});
});
