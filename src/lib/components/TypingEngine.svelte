<script lang="ts">
	import { onMount } from 'svelte';
	import type { TestRun } from '$lib/server/db/schema';

	let { passage } = $props<{ passage: { id: number; text: string; source: string | null } }>();

	let inputEl: HTMLInputElement | undefined = $state();

	let text = $derived(passage.text);
	let chars = $derived(text.split(''));

	let typedText = $state('');
	let startTime = $state<number | null>(null);
	let currentTime = $state<number | null>(null);
	let isFinished = $state(false);
	
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
		const payload = {
			passageId: passage.id,
			wpm,
			accuracy,
			timeElapsed: Math.round(timeElapsed),
			correctChars,
			incorrectChars: incChars,
			extraChars: 0,
			missedChars: missed
		};

		try {
			const res = await fetch('/api/test-runs', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (res.ok) {
				savedRun = await res.json();
			}
		} catch (err) {
			console.error('Failed to save test run', err);
		} finally {
			isSaving = false;
		}
	}

	function handleInput(e: Event) {
		if (isFinished) return;
		
		const target = e.target as HTMLInputElement;
		let val = target.value;
		
		if (val.length > chars.length) {
			val = val.slice(0, chars.length);
			target.value = val;
		}

		if (!startTime && val.length > 0) {
			startTime = Date.now();
			currentTime = Date.now();
			requestAnimationFrame(updateTimer);
		}
		
		typedText = val;

		if (typedText.length === chars.length) {
			isFinished = true;
			submitTestRun();
		}
	}

	function updateTimer() {
		if (isFinished) return;
		if (startTime) {
			currentTime = Date.now();
			requestAnimationFrame(updateTimer);
		}
	}

	function focusInput() {
		inputEl?.focus();
	}
	
	function reset() {
		typedText = '';
		startTime = null;
		currentTime = null;
		isFinished = false;
		savedRun = null;
		isSaving = false;
		if (inputEl) {
			inputEl.value = '';
			inputEl.focus();
		}
	}

	onMount(() => {
		focusInput();
	});
</script>

<div class="relative w-full max-w-4xl mx-auto flex flex-col gap-8">
	<!-- HUD -->
	{#if !isFinished}
		<div class="flex items-center justify-between text-zinc-400 font-mono text-sm px-2">
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
				<span class="text-2xl font-bold text-zinc-100">{Math.floor(timeElapsed)}s</span>
			</div>
		</div>
	{/if}

	<!-- Typing Area -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div 
		class="relative rounded-xl bg-zinc-900/50 p-8 shadow-inner border border-zinc-800/50"
		onclick={focusInput}
	>
		{#if !isFinished}
			<input
				bind:this={inputEl}
				class="absolute inset-0 h-full w-full opacity-0 cursor-default"
				style="z-index: 1;"
				type="text"
				autocomplete="off"
				autocorrect="off"
				autocapitalize="off"
				spellcheck="false"
				oninput={handleInput}
				value={typedText}
			/>

			<div class="font-mono text-2xl leading-relaxed tracking-wide text-zinc-500 pointer-events-none select-none break-words whitespace-pre-wrap">
				{#each chars as char, i}
					{@const typedChar = typedText[i]}
					{@const isCorrect = typedChar === char}
					{@const isIncorrect = typedChar !== undefined && !isCorrect}
					{@const isCurrent = i === typedText.length}
					<span class="relative transition-colors duration-75 {isCorrect ? 'text-zinc-100' : isIncorrect ? 'text-red-400 bg-red-400/10 rounded-sm' : ''} {isCurrent ? 'after:content-[\'\'] after:absolute after:left-0 after:-bottom-1 after:w-full after:h-0.5 after:bg-emerald-400 after:animate-pulse' : ''}"
					>{char}</span>
				{/each}
			</div>
			
			{#if passage.source}
				<div class="mt-4 text-right text-sm text-zinc-500 italic">
					— {passage.source}
				</div>
			{/if}
		{:else}
			<div class="flex flex-col items-center justify-center py-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
				<div class="flex items-center gap-3 text-emerald-400">
					<i class="bi bi-check-circle-fill text-3xl"></i>
					<h3 class="text-3xl font-bold text-zinc-100">Passage Complete</h3>
				</div>
				
				{#if isSaving}
					<div class="text-zinc-400 animate-pulse">Saving results...</div>
				{:else}
					<div class="grid grid-cols-3 gap-8 w-full max-w-lg">
						<div class="flex flex-col items-center p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
							<span class="uppercase text-xs font-semibold text-zinc-500 mb-1">Speed</span>
							<span class="text-4xl font-bold text-emerald-400">{savedRun?.wpm ?? wpm} <span class="text-lg text-emerald-500/50">WPM</span></span>
						</div>
						<div class="flex flex-col items-center p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
							<span class="uppercase text-xs font-semibold text-zinc-500 mb-1">Accuracy</span>
							<span class="text-4xl font-bold text-zinc-100">{savedRun?.accuracy ?? accuracy}<span class="text-lg text-zinc-500">%</span></span>
						</div>
						<div class="flex flex-col items-center p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
							<span class="uppercase text-xs font-semibold text-zinc-500 mb-1">Time</span>
							<span class="text-4xl font-bold text-zinc-100">{savedRun?.timeElapsed ?? Math.floor(timeElapsed)}<span class="text-lg text-zinc-500">s</span></span>
						</div>
					</div>
				{/if}

				<button
					onclick={reset}
					class="mt-4 flex items-center gap-2 rounded-lg bg-zinc-100 px-6 py-3 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-100 focus:ring-offset-2 focus:ring-offset-zinc-950"
				>
					<i class="bi bi-arrow-counterclockwise"></i>
					Type Again
				</button>
			</div>
		{/if}
	</div>
</div>