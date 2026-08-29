<script lang="ts">
	import type { PageData } from './$types';
	import TypingEngine from '$lib/components/TypingEngine.svelte';
	import { invalidateAll } from '$app/navigation';
	import { clearPassageQuery } from '$lib/passage-utils';
	import { viewportLayout } from '$lib/viewport';
	import { onMount } from 'svelte';

	let { data }: { data: PageData } = $props();

	onMount(() => {
		const cleanup = viewportLayout.initViewportController();
		return () => {
			cleanup();
		};
	});

	async function handleNextPassage() {
		clearPassageQuery();
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>Stype — Minimalist Typing Test</title>
</svelte:head>

<div
	class="mx-auto flex w-full max-w-5xl flex-1 min-h-0 flex-col items-center overflow-hidden transition-all duration-200 {$viewportLayout.isCompact ? 'px-3 py-2 h-[100dvh] max-h-[100dvh]' : 'px-6 py-6 h-[calc(100dvh-69px)] max-h-[calc(100dvh-69px)]'}"
	style={$viewportLayout.visualViewportHeight ? `height: ${$viewportLayout.isCompact ? `${$viewportLayout.visualViewportHeight}px` : `${$viewportLayout.visualViewportHeight - 69}px`}; max-height: ${$viewportLayout.isCompact ? `${$viewportLayout.visualViewportHeight}px` : `${$viewportLayout.visualViewportHeight - 69}px`};` : undefined}
	data-compact={$viewportLayout.isCompact ? 'true' : 'false'}
>
	{#if data.passage}
		<TypingEngine 
			passage={data.passage} 
			initialMode={data.settings?.mode}
			initialDuration={data.settings?.duration}
			initialZenMode={data.settings?.zenMode}
			initialScrollMode={data.settings?.scrollMode}
			onNextPassage={handleNextPassage}
		/>
	{:else}
		<div class="w-full max-w-2xl text-center space-y-4 pt-12">
			<h2 class="text-3xl font-bold tracking-tight text-foreground">Ready to type</h2>
			<p class="text-sm text-muted-foreground">
				Welcome back, <span class="font-semibold text-foreground">{data.user?.username}</span>. No passages available.
			</p>
		</div>
	{/if}
</div>

