<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import type { TestRun, TimelineSnapshot } from '$lib/server/db/schema';
	import ResultSummary from './ResultSummary.svelte';

	export interface CompletedTestResult {
		passageId: number;
		mode: 'passage' | 'timed';
		duration: number | null;
		wpm: number;
		accuracy: number;
		timeElapsed: number;
		correctChars: number;
		incorrectChars: number;
		extraChars: number;
		missedChars: number;
		timelineSnapshots: TimelineSnapshot[];
	}

	let { 
		passage,
		initialMode = 'passage',
		initialDuration = 30,
		initialZenMode = false,
		onSave,
		onNextPassage,
		onRestart
	} = $props<{ 
		passage: { id: number; text: string; source: string | null };
		initialMode?: 'passage' | 'timed';
		initialDuration?: number;
		initialZenMode?: boolean;
		onSave?: (result: CompletedTestResult) => Promise<TestRun | null | void> | TestRun | null | void;
		onNextPassage?: () => void | Promise<void>;
		onRestart?: () => void;
	}>();

	let inputEl: HTMLInputElement | undefined = $state();
	let isFocused = $state(true);

	let text = $derived(passage.text);
	let chars = $derived(text.split(''));

	let typedText = $state('');
	let startTime = $state<number | null>(null);
	let currentTime = $state<number | null>(null);
	let isFinished = $state(false);

	let mode = $state<'passage' | 'timed'>('passage');
	let timeLimit = $state<number>(30);
	let zenMode = $state<boolean>(false);

	$effect.pre(() => {
		mode = initialMode;
		timeLimit = initialDuration;
		zenMode = initialZenMode;
	});
	
	let timelineSnapshots = $state<TimelineSnapshot[]>([]);
	let lastCapturedSecond = $state(0);

	let timeElapsed = $derived(startTime && currentTime ? (currentTime - startTime) / 1000 : 0);
	
	let correctChars = $derived(
		typedText.split('').filter((char, i) => char === chars[i]).length
	);
	
	let wpm = $derived(
		timeElapsed > 0 ? Math.round((correctChars / 5) / (timeElapsed / 60)) : 0
	);
	
	let accuracy = $derived(
		typedText.length > 0 ? Math.round((correctChars / typedText.length) * 100) : 100
	);

	let savedRun = $state<TestRun | null>(null);
	let isSaving = $state(false);

	async function submitTestRun() {
		isSaving = true;
		const incChars = typedText.length - correctChars;
		const missed = chars.length - typedText.length;
		const finalTime = mode === 'timed' && timeElapsed >= timeLimit ? timeLimit : Math.round(timeElapsed);
		
		const snapshots = [...timelineSnapshots];
		const finalSecond = Math.max(1, finalTime);
		if (snapshots.length === 0 || snapshots[snapshots.length - 1].second !== finalSecond) {
			snapshots.push({
				second: finalSecond,
				wpm,
				accuracy
			});
		}

		const payload: CompletedTestResult = {
			passageId: passage.id,
			mode,
			duration: mode === 'timed' ? timeLimit : null,
			wpm,
			accuracy,
			timeElapsed: finalTime,
			correctChars,
			incorrectChars: incChars,
			extraChars: 0,
			missedChars: missed,
			timelineSnapshots: snapshots
		};

		try {
			if (onSave) {
				const res = await onSave(payload);
				if (res) {
					savedRun = res;
				}
			} else {
				const res = await fetch('/api/test-runs', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
				if (res.ok) {
					savedRun = await res.json();
				}
			}
		} catch (err) {
			console.error('Failed to save test run', err);
		} finally {
			isSaving = false;
		}
	}

	function captureSnapshots(elapsed: number) {
		const currentSecond = Math.floor(elapsed);
		while (lastCapturedSecond < currentSecond) {
			lastCapturedSecond++;
			const snapWpm = Math.round((correctChars / 5) / (lastCapturedSecond / 60));
			const snapAcc = typedText.length > 0 ? Math.round((correctChars / typedText.length) * 100) : 100;
			timelineSnapshots.push({
				second: lastCapturedSecond,
				wpm: snapWpm,
				accuracy: snapAcc
			});
		}
	}

	function applyTypedValue(val: string) {
		if (isFinished) return;

		if (val.length > chars.length) {
			val = val.slice(0, chars.length);
		}
		if (inputEl && inputEl.value !== val) {
			inputEl.value = val;
		}

		if (!startTime && val.length > 0) {
			startTime = Date.now();
			currentTime = Date.now();
			requestAnimationFrame(updateTimer);
		}

		typedText = val;

		if (startTime && currentTime) {
			captureSnapshots((currentTime - startTime) / 1000);
		}

		if (typedText.length === chars.length) {
			isFinished = true;
			submitTestRun();
		} else if (mode === 'timed' && timeElapsed >= timeLimit) {
			isFinished = true;
			submitTestRun();
		}
	}

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		applyTypedValue(target.value);
	}

	function updateTimer() {
		if (isFinished) return;
		if (startTime) {
			currentTime = Date.now();
			const elapsed = (currentTime - startTime) / 1000;
			captureSnapshots(elapsed);
			if (mode === 'timed' && elapsed >= timeLimit) {
				isFinished = true;
				submitTestRun();
				return;
			}
			requestAnimationFrame(updateTimer);
		}
	}

	function focusInput() {
		inputEl?.focus();
		isFocused = true;
	}
	
	function reset() {
		typedText = '';
		startTime = null;
		currentTime = null;
		isFinished = false;
		savedRun = null;
		isSaving = false;
		timelineSnapshots = [];
		lastCapturedSecond = 0;
		if (inputEl) {
			inputEl.value = '';
			inputEl.focus();
		}
		isFocused = true;
		if (onRestart) {
			onRestart();
		}
	}

	async function loadNewPassage() {
		reset();
		if (onNextPassage) {
			await onNextPassage();
		} else {
			await invalidateAll();
		}
	}

	function isEditableElement(el: Element | null): boolean {
		if (!el) return false;
		const tagName = el.tagName.toLowerCase();
		if (tagName === 'input') {
			const type = (el as HTMLInputElement).type?.toLowerCase() || 'text';
			return !['button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'image'].includes(type);
		}
		if (tagName === 'textarea') return true;
		if ((el as HTMLElement).isContentEditable) return true;
		return false;
	}

	function handleWindowFocus() {
		if (!isFinished) {
			const active = document.activeElement;
			if (!active || active === document.body || !isEditableElement(active)) {
				focusInput();
			}
		}
	}

	function handleGlobalKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			reset();
			return;
		}
		if (e.key === 'Tab') {
			e.preventDefault();
			loadNewPassage();
			return;
		}

		if (isFinished) return;

		const active = document.activeElement;
		if (active && active !== inputEl && isEditableElement(active)) {
			return;
		}

		if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
			if (!isFocused || document.activeElement !== inputEl) {
				e.preventDefault();
				focusInput();
				applyTypedValue(typedText + e.key);
			}
		} else if (e.key === 'Backspace' && !e.ctrlKey && !e.metaKey && !e.altKey) {
			if (!isFocused || document.activeElement !== inputEl) {
				e.preventDefault();
				focusInput();
				if (typedText.length > 0) {
					applyTypedValue(typedText.slice(0, -1));
				}
			}
		}
	}

	$effect(() => {
		if (inputEl && !isFinished) {
			focusInput();
		}
	});

	onMount(() => {
		focusInput();
		const raf = requestAnimationFrame(() => focusInput());
		const timer = setTimeout(() => focusInput(), 50);

		window.addEventListener('keydown', handleGlobalKeydown);
		window.addEventListener('focus', handleWindowFocus);

		return () => {
			cancelAnimationFrame(raf);
			clearTimeout(timer);
			window.removeEventListener('keydown', handleGlobalKeydown);
			window.removeEventListener('focus', handleWindowFocus);
		};
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('keydown', handleGlobalKeydown);
			window.removeEventListener('focus', handleWindowFocus);
		}
	});
</script>

<div class="relative w-full max-w-4xl mx-auto flex flex-col justify-center gap-4 sm:gap-6 my-auto max-h-full min-h-0">
	<!-- Toolbar -->
	{#if !isFinished && !startTime}
		<div class="shrink-0 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm font-semibold text-zinc-500 mb-[-0.5rem] transition-opacity">
			<div class="flex items-center gap-2 bg-zinc-900/50 rounded-lg p-1 border border-zinc-800/50">
				<button 
					class="px-3 py-1 rounded-md transition-colors {mode === 'passage' ? 'bg-zinc-800 text-zinc-100' : 'hover:text-zinc-300'}"
					onclick={() => { mode = 'passage'; focusInput(); }}
				>
					Passage
				</button>
				<button 
					class="px-3 py-1 rounded-md transition-colors {mode === 'timed' ? 'bg-zinc-800 text-zinc-100' : 'hover:text-zinc-300'}"
					onclick={() => { mode = 'timed'; focusInput(); }}
				>
					Timed
				</button>
			</div>
			
			<div class="flex items-center gap-2 bg-zinc-900/50 rounded-lg p-1 border border-zinc-800/50 transition-opacity {mode === 'passage' ? 'opacity-50 pointer-events-none' : ''}">
				{#each [15, 30, 60] as limit}
					<button 
						disabled={mode === 'passage'}
						class="px-3 py-1 rounded-md transition-colors {timeLimit === limit ? 'bg-zinc-800 text-zinc-100' : 'hover:text-zinc-300'} {mode === 'passage' ? 'opacity-50 pointer-events-none' : ''}"
						onclick={() => { 
							if (mode === 'passage') return;
							timeLimit = limit; 
							focusInput(); 
						}}
					>
						{limit}s
					</button>
				{/each}
			</div>

			<div class="flex items-center gap-2 bg-zinc-900/50 rounded-lg p-1 border border-zinc-800/50">
				<button 
					class="flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors {zenMode ? 'bg-zinc-800 text-zinc-100' : 'hover:text-zinc-300'}"
					onclick={() => { zenMode = !zenMode; focusInput(); }}
					title="Zen Mode: Hide live HUD metrics during active typing"
				>
					<i class="bi {zenMode ? 'bi-eye-slash-fill' : 'bi-eye'}"></i>
					<span>Zen</span>
				</button>
			</div>
		</div>
	{/if}

	<!-- HUD -->
	{#if !isFinished && (!zenMode || !startTime)}
		<div class="shrink-0 flex items-center justify-between text-zinc-400 font-mono text-sm px-2">
			<div class="flex gap-6">
				<div class="flex flex-col">
					<span class="uppercase text-xs font-semibold text-zinc-500">WPM</span>
					<span class="text-2xl font-bold text-zinc-100">{wpm}</span>
				</div>
				<div class="flex flex-col">
					<span class="uppercase text-xs font-semibold text-zinc-500">ACC</span>
					<span class="text-2xl font-bold text-zinc-100">{accuracy}%</span>
				</div>
			</div>
			<div class="flex flex-col items-end">
				<span class="uppercase text-xs font-semibold text-zinc-500">Time</span>
				<span class="text-2xl font-bold text-zinc-100">
					{#if mode === 'timed'}
						{Math.max(0, timeLimit - Math.floor(timeElapsed))}s
					{:else}
						{Math.floor(timeElapsed)}s
					{/if}
				</span>
			</div>
		</div>
	{/if}

	<!-- Typing Area -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div 
		class="relative rounded-xl bg-zinc-900/50 p-6 sm:p-8 shadow-inner border transition-colors duration-200 flex flex-col min-h-0 max-h-full overflow-hidden shrink {isFocused ? 'border-zinc-700' : 'border-zinc-800/40'}"
		onclick={focusInput}
	>
		{#if !isFinished}
			<!-- svelte-ignore a11y_autofocus -->
			<input
				bind:this={inputEl}
				autofocus
				class="absolute inset-0 h-full w-full opacity-0 cursor-default"
				style="z-index: 1;"
				type="text"
				autocomplete="off"
				autocorrect="off"
				autocapitalize="off"
				spellcheck="false"
				oninput={handleInput}
				onfocus={() => { isFocused = true; }}
				onblur={() => { isFocused = false; }}
				value={typedText}
			/>

			<div class="flex-1 min-h-0 overflow-y-auto pr-1">
				<div class="font-mono text-2xl leading-relaxed tracking-wide text-zinc-500 pointer-events-none select-none break-words whitespace-pre-wrap">
					{#each chars as char, i}
						{@const typedChar = typedText[i]}
						{@const isCorrect = typedChar === char}
						{@const isIncorrect = typedChar !== undefined && !isCorrect}
						{@const isCurrent = i === typedText.length}
						<span class="relative transition-colors duration-75 {isCorrect ? 'text-zinc-100' : isIncorrect ? 'text-red-400 bg-red-400/10 rounded-sm' : ''} {isCurrent ? (isFocused ? 'after:content-[\'\'] after:absolute after:left-0 after:-bottom-1 after:w-full after:h-0.5 after:bg-emerald-400 after:animate-pulse' : 'after:content-[\'\'] after:absolute after:left-0 after:-bottom-1 after:w-full after:h-0.5 after:bg-zinc-600') : ''}"
						>{char}</span>
					{/each}
				</div>
				
				{#if passage.source}
					<div class="mt-4 text-right text-sm text-zinc-500 italic">
						— {passage.source}
					</div>
				{/if}
			</div>
		{:else}
			<div class="flex-1 min-h-0 overflow-y-auto max-h-full">
				<ResultSummary
					wpm={savedRun?.wpm ?? wpm}
					accuracy={savedRun?.accuracy ?? accuracy}
					timeElapsed={savedRun?.timeElapsed ?? (mode === 'timed' && timeElapsed >= timeLimit ? timeLimit : Math.round(timeElapsed))}
					timelineSnapshots={savedRun?.timelineSnapshots && savedRun.timelineSnapshots.length > 0 ? savedRun.timelineSnapshots : timelineSnapshots}
					{isSaving}
					onRestart={loadNewPassage}
				/>
			</div>
		{/if}
	</div>

	<!-- Controls -->
	{#if !isFinished}
		<div class="shrink-0 flex justify-center gap-4 text-zinc-500 transition-opacity {startTime ? 'opacity-0 pointer-events-none' : 'opacity-100'}">
			<button 
				class="flex items-center gap-2 hover:text-zinc-300 transition-colors px-3 py-2 rounded-md hover:bg-zinc-800/50"
				onclick={reset}
				title="Restart Test (Esc)"
			>
				<i class="bi bi-arrow-counterclockwise"></i>
				<span class="text-sm font-semibold">Restart (Esc)</span>
			</button>
			<button 
				class="flex items-center gap-2 hover:text-zinc-300 transition-colors px-3 py-2 rounded-md hover:bg-zinc-800/50"
				onclick={loadNewPassage}
				title="Next Passage (Tab)"
			>
				<i class="bi bi-skip-forward-fill"></i>
				<span class="text-sm font-semibold">Next (Tab)</span>
			</button>
		</div>
	{/if}
</div>
