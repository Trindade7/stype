<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import type { TestRun, TimelineSnapshot } from '$lib/server/db/schema';
	import { calculateTargetScrollTop, applyScroll, type ScrollMode } from '$lib/scroll-utils';
	import { viewportLayout } from '$lib/viewport';
	import ResultSummary from './ResultSummary.svelte';

	export interface CompletedTestResult {
		passageId: number | string;
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
		initialScrollMode = 'center',
		scrollMode: propScrollMode,
		onSave,
		onNextPassage,
		onRestart
	} = $props<{ 
		passage: { id: number | string; text: string; source: string | null };
		initialMode?: 'passage' | 'timed';
		initialDuration?: number;
		initialZenMode?: boolean;
		initialScrollMode?: ScrollMode;
		scrollMode?: ScrollMode;
		onSave?: (result: CompletedTestResult) => Promise<TestRun | null | void> | TestRun | null | void;
		onNextPassage?: () => void | Promise<void>;
		onRestart?: () => void;
	}>();

	let inputEl: HTMLInputElement | undefined = $state();
	let scrollContainerEl: HTMLDivElement | undefined = $state();
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
	let scrollMode = $state<ScrollMode>('center');

	const INACTIVITY_TIMEOUT_MS = 10000;
	const INACTIVITY_NOTICE_DURATION_MS = 3000;
	let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
	let noticeTimer: ReturnType<typeof setTimeout> | null = null;
	let showInactivityNotice = $state(false);

	$effect.pre(() => {
		mode = initialMode;
		timeLimit = initialDuration;
		zenMode = initialZenMode;
		scrollMode = propScrollMode ?? initialScrollMode ?? 'center';
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

	function clearInactivityTimer() {
		if (inactivityTimer !== null) {
			clearTimeout(inactivityTimer);
			inactivityTimer = null;
		}
	}

	function clearNoticeTimer() {
		if (noticeTimer !== null) {
			clearTimeout(noticeTimer);
			noticeTimer = null;
		}
	}

	function dismissInactivityNotice() {
		clearNoticeTimer();
		showInactivityNotice = false;
	}

	function triggerInactivityReset() {
		reset();
		showInactivityNotice = true;
		clearNoticeTimer();
		noticeTimer = setTimeout(() => {
			showInactivityNotice = false;
			noticeTimer = null;
		}, INACTIVITY_NOTICE_DURATION_MS);
	}

	function resetInactivityTimer() {
		clearInactivityTimer();
		if (startTime !== null && !isFinished) {
			inactivityTimer = setTimeout(() => {
				triggerInactivityReset();
			}, INACTIVITY_TIMEOUT_MS);
		}
	}

	function applyTypedValue(val: string) {
		if (isFinished) return;

		if (showInactivityNotice) {
			dismissInactivityNotice();
		}

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
			viewportLayout.setTestFinished(true);
			clearInactivityTimer();
			submitTestRun();
		} else if (mode === 'timed' && timeElapsed >= timeLimit) {
			isFinished = true;
			viewportLayout.setTestFinished(true);
			clearInactivityTimer();
			submitTestRun();
		} else if (startTime && !isFinished) {
			resetInactivityTimer();
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
				viewportLayout.setTestFinished(true);
				clearInactivityTimer();
				submitTestRun();
				return;
			}
			requestAnimationFrame(updateTimer);
		}
	}

	function focusInput() {
		inputEl?.focus();
		isFocused = true;
		viewportLayout.setTypingFocus(true);
	}
	
	function resetScroll() {
		if (scrollContainerEl) {
			applyScroll(scrollContainerEl, 0, false);
		}
	}

	function reset() {
		clearInactivityTimer();
		dismissInactivityNotice();
		resetScroll();
		typedText = '';
		startTime = null;
		currentTime = null;
		isFinished = false;
		savedRun = null;
		isSaving = false;
		timelineSnapshots = [];
		lastCapturedSecond = 0;
		viewportLayout.setTestFinished(false);
		if (inputEl) {
			inputEl.value = '';
			inputEl.focus();
		}
		isFocused = true;
		viewportLayout.setTypingFocus(true);
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

		if (isFinished) return;

		if (e.key === 'Tab') {
			e.preventDefault();
			loadNewPassage();
			return;
		}

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

	function performAutoScroll() {
		if (!scrollContainerEl || isFinished || scrollMode === 'manual') return;

		const activeCharIndex = Math.min(typedText.length, chars.length - 1);
		const activeEl = scrollContainerEl.querySelector(`[data-char-index="${activeCharIndex}"]`) as HTMLElement | null;
		if (!activeEl) return;

		const containerRect = scrollContainerEl.getBoundingClientRect();
		const activeRect = activeEl.getBoundingClientRect();
		const containerHeight = scrollContainerEl.clientHeight || containerRect.height;
		if (containerHeight <= 0) return;

		const activeTop = activeRect.top - containerRect.top;
		const activeBottom = activeRect.bottom - containerRect.top;
		const lineHeight = activeRect.height || 30;
		const maxScrollTop = scrollContainerEl.scrollHeight > containerHeight
			? scrollContainerEl.scrollHeight - containerHeight
			: undefined;

		const targetScrollTop = calculateTargetScrollTop({
			scrollMode,
			containerHeight,
			currentScrollTop: scrollContainerEl.scrollTop,
			activeTop,
			activeBottom,
			lineHeight,
			maxScrollTop
		});

		if (Math.abs(targetScrollTop - scrollContainerEl.scrollTop) >= 1) {
			applyScroll(scrollContainerEl, targetScrollTop, true);
		}
	}

	$effect(() => {
		const _len = typedText.length;
		const _mode = scrollMode;
		performAutoScroll();
	});

	$effect(() => {
		const _id = passage.id;
		resetScroll();
		dismissInactivityNotice();
	});

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
			clearInactivityTimer();
			clearNoticeTimer();
			cancelAnimationFrame(raf);
			clearTimeout(timer);
			window.removeEventListener('keydown', handleGlobalKeydown);
			window.removeEventListener('focus', handleWindowFocus);
		};
	});

	onDestroy(() => {
		clearInactivityTimer();
		clearNoticeTimer();
		viewportLayout.setTypingFocus(false);
		viewportLayout.setTestFinished(false);
		if (typeof window !== 'undefined') {
			window.removeEventListener('keydown', handleGlobalKeydown);
			window.removeEventListener('focus', handleWindowFocus);
		}
	});
</script>

<div class="relative w-full max-w-4xl mx-auto flex flex-col {$viewportLayout.isCompact ? 'gap-2' : 'gap-4 sm:gap-6'} max-h-full min-h-0">
	<!-- Toolbar -->
	<div 
		data-testid="toolbar"
		class="shrink-0 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm font-semibold text-muted-foreground mb-[-0.5rem] transition-opacity duration-200 {startTime || isFinished ? 'opacity-0 pointer-events-none' : 'opacity-100'}"
	>
		<div class="flex items-center gap-2 bg-muted/50 rounded-lg p-1 border border-border">
			<button 
				class="px-3 py-1 rounded-md transition-colors {mode === 'passage' ? 'bg-secondary text-secondary-foreground shadow-xs' : 'hover:text-foreground'}"
				onclick={() => { mode = 'passage'; focusInput(); }}
			>
				Passage
			</button>
			<button 
				class="px-3 py-1 rounded-md transition-colors {mode === 'timed' ? 'bg-secondary text-secondary-foreground shadow-xs' : 'hover:text-foreground'}"
				onclick={() => { mode = 'timed'; focusInput(); }}
			>
				Timed
			</button>
		</div>
		
		<div class="flex items-center gap-2 bg-muted/50 rounded-lg p-1 border border-border transition-opacity {mode === 'passage' ? 'opacity-50 pointer-events-none' : ''}">
			{#each [15, 30, 60] as limit}
				<button 
					disabled={mode === 'passage'}
					class="px-3 py-1 rounded-md transition-colors {timeLimit === limit ? 'bg-secondary text-secondary-foreground shadow-xs' : 'hover:text-foreground'} {mode === 'passage' ? 'opacity-50 pointer-events-none' : ''}"
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

		<div class="flex items-center gap-2 bg-muted/50 rounded-lg p-1 border border-border">
			<button 
				class="flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors {zenMode ? 'bg-secondary text-secondary-foreground shadow-xs' : 'hover:text-foreground'}"
				onclick={() => { zenMode = !zenMode; focusInput(); }}
				title="Zen Mode: Hide live HUD metrics during active typing"
			>
				<i class="bi {zenMode ? 'bi-eye-slash-fill' : 'bi-eye'}"></i>
				<span>Zen</span>
			</button>
		</div>
	</div>

	<!-- HUD -->
	<div 
		data-testid="hud"
		class="shrink-0 flex items-center justify-between text-muted-foreground font-mono text-sm px-2 transition-opacity duration-200 {isFinished || (zenMode && startTime) ? 'opacity-0 pointer-events-none' : 'opacity-100'}"
	>
		<div class="flex gap-6">
			<div class="flex flex-col">
				<span class="uppercase text-xs font-semibold text-muted-foreground">WPM</span>
				<span class="text-2xl font-bold text-foreground">{wpm}</span>
			</div>
			<div class="flex flex-col">
				<span class="uppercase text-xs font-semibold text-muted-foreground">ACC</span>
				<span class="text-2xl font-bold text-foreground">{accuracy}%</span>
			</div>
		</div>
		<div class="flex flex-col items-end">
			<span class="uppercase text-xs font-semibold text-muted-foreground">Time</span>
			<span class="text-2xl font-bold text-foreground">
				{#if mode === 'timed'}
					{Math.max(0, timeLimit - Math.floor(timeElapsed))}s
				{:else}
					{Math.floor(timeElapsed)}s
				{/if}
			</span>
		</div>
	</div>

	<!-- Typing Area -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div 
		class="relative rounded-xl bg-card {$viewportLayout.isCompact ? 'p-3 sm:p-8' : 'p-6 sm:p-8'} shadow-inner border transition-colors duration-200 flex flex-col min-h-0 max-h-full overflow-hidden shrink {isFocused ? 'border-border' : 'border-border/40'}"
		onclick={focusInput}
	>
		{#if !isFinished}
			{#if showInactivityNotice}
				<div
					data-testid="inactivity-notice"
					role="status"
					aria-live="polite"
					class="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 pointer-events-none flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-primary text-primary-foreground border border-primary-foreground/30 rounded-full shadow-lg transition-opacity"
				>
					<i class="bi bi-arrow-counterclockwise text-primary-foreground/80"></i>
					<span>Reset due to inactivity</span>
				</div>
			{/if}

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
				onfocus={() => { isFocused = true; viewportLayout.setTypingFocus(true); }}
				onblur={() => { isFocused = false; viewportLayout.setTypingFocus(false); }}
				value={typedText}
			/>

			<div bind:this={scrollContainerEl} data-scroll-mode={scrollMode} class="flex-1 min-h-0 overflow-y-auto pr-1">
				<div class="font-mono text-2xl leading-relaxed tracking-wide text-typing-untyped pointer-events-none select-none break-words whitespace-pre-wrap">
					{#each chars as char, i}
						{@const typedChar = typedText[i]}
						{@const isCorrect = typedChar === char}
						{@const isIncorrect = typedChar !== undefined && !isCorrect}
						{@const isCurrent = i === typedText.length}
						<span
							data-char-index={i}
							data-current={isCurrent ? 'true' : undefined}
							class="relative transition-colors duration-75 {isCorrect ? 'text-typing-correct' : isIncorrect ? 'text-typing-error bg-typing-error/10 rounded-sm' : ''} {isCurrent ? (isFocused ? 'after:content-[\'\'] after:absolute after:left-0 after:-bottom-1 after:w-full after:h-0.5 after:bg-typing-caret after:animate-pulse' : 'after:content-[\'\'] after:absolute after:left-0 after:-bottom-1 after:w-full after:h-0.5 after:bg-muted-foreground') : ''}"
						>{char}</span>
					{/each}
				</div>
				
				{#if passage.source}
					<div class="mt-4 text-right text-sm text-muted-foreground italic">
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
					onNextPassage={loadNewPassage}
					onRetry={reset}
				/>
			</div>
		{/if}
	</div>

	<!-- Controls -->
	<div 
		data-testid="bottom-controls"
		class="shrink-0 flex justify-center gap-4 text-muted-foreground transition-opacity duration-200 {startTime || isFinished ? 'opacity-0 pointer-events-none' : 'opacity-100'}"
	>
		<button 
			class="flex items-center gap-2 hover:text-foreground transition-colors px-3 py-2 rounded-md hover:bg-secondary"
			onclick={reset}
			title="Restart Test (Esc)"
		>
			<i class="bi bi-arrow-counterclockwise"></i>
			<span class="text-sm font-semibold">Restart (Esc)</span>
		</button>
		<button 
			class="flex items-center gap-2 hover:text-foreground transition-colors px-3 py-2 rounded-md hover:bg-secondary"
			onclick={loadNewPassage}
			title="Next Passage (Tab)"
		>
			<i class="bi bi-skip-forward-fill"></i>
			<span class="text-sm font-semibold">Next (Tab)</span>
		</button>
	</div>
</div>
