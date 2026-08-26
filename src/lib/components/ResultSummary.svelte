<script lang="ts">
	import type { TimelineSnapshot } from '$lib/server/db/schema';
	import TimelineChart from './TimelineChart.svelte';

	let {
		wpm = 0,
		accuracy = 100,
		timeElapsed = 0,
		timelineSnapshots = [],
		isSaving = false,
		restartButtonText = 'Type Again (Tab)',
		onRestart
	}: {
		wpm?: number;
		accuracy?: number;
		timeElapsed?: number;
		timelineSnapshots?: TimelineSnapshot[];
		isSaving?: boolean;
		restartButtonText?: string;
		onRestart?: () => void;
	} = $props();
</script>

<div class="flex flex-col items-center justify-center py-6 sm:py-8 space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
				<span class="text-4xl font-bold text-emerald-400">{wpm} <span class="text-lg text-emerald-500/50">WPM</span></span>
			</div>
			<div class="flex flex-col items-center p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
				<span class="uppercase text-xs font-semibold text-zinc-500 mb-1">Accuracy</span>
				<span class="text-4xl font-bold text-zinc-100">{accuracy}<span class="text-lg text-zinc-500">%</span></span>
			</div>
			<div class="flex flex-col items-center p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
				<span class="uppercase text-xs font-semibold text-zinc-500 mb-1">Time</span>
				<span class="text-4xl font-bold text-zinc-100">{timeElapsed}<span class="text-lg text-zinc-500">s</span></span>
			</div>
		</div>

		{#if timelineSnapshots && timelineSnapshots.length > 0}
			<div class="w-full max-w-2xl">
				<TimelineChart snapshots={timelineSnapshots} />
			</div>
		{/if}
	{/if}

	{#if onRestart}
		<button
			onclick={onRestart}
			class="mt-4 flex items-center gap-2 rounded-lg bg-zinc-100 px-6 py-3 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-100 focus:ring-offset-2 focus:ring-offset-zinc-950"
		>
			<i class="bi bi-arrow-counterclockwise"></i>
			{restartButtonText}
		</button>
	{/if}
</div>
